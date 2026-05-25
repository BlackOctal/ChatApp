"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useSendMessage } from "@/hooks/useMessages";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_SIZE,
  MEDIA_EXPIRY_DAYS,
} from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import type { MediaUploadProgress } from "@/types";

export function useMediaUpload(conversationId: string) {
  const user = useAuthStore((s) => s.user);
  const [uploads, setUploads] = useState<MediaUploadProgress[]>([]);
  const { mutateAsync: sendMessage } = useSendMessage(conversationId);

  const updateUpload = useCallback((id: string, update: Partial<MediaUploadProgress>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...update } : u)));
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type) ||
        file.name.toLowerCase().match(/\.(heic|heif)$/) != null;
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        throw new Error("Unsupported file type");
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        throw new Error("Video exceeds 50MB limit");
      }

      const uploadId = uuidv4();
      setUploads((prev) => [
        ...prev,
        { id: uploadId, file_name: file.name, progress: 0, status: "uploading" },
      ]);

      try {
        // For large videos, compress via API first
        let fileToUpload = file;
        let storagePath: string;

        if (isVideo && file.size > 30 * 1024 * 1024) {
          updateUpload(uploadId, { status: "processing", progress: 10 });
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/media/compress-video", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? "Compression failed");
          }

          const blob = await res.blob();
          fileToUpload = new File([blob], file.name, { type: "video/mp4" });
          updateUpload(uploadId, { progress: 50 });
        }

        const ext = fileToUpload.name.split(".").pop()?.toLowerCase() ?? "bin";
        const fileName = `${user!.id}/${conversationId}/${uuidv4()}.${ext}`;
        storagePath = fileName;

        updateUpload(uploadId, { status: "uploading", progress: 60 });

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, fileToUpload, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        updateUpload(uploadId, { progress: 85 });

        // Generate preview for images via API
        let previewPath: string | null = null;
        if (isImage) {
          const previewRes = await fetch("/api/media/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storage_path: storagePath }),
          });
          if (previewRes.ok) {
            const { preview_path } = await previewRes.json();
            previewPath = preview_path;
          }
        }

        // Create message
        const message = await sendMessage({
          type: isImage ? "image" : "video",
          reply_to_id: undefined,
        });

        // Create attachment record
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + MEDIA_EXPIRY_DAYS);

        const { error: attachError } = await supabase.from("attachments").insert({
          message_id: message.id,
          storage_path: storagePath,
          preview_path: previewPath,
          mime_type: fileToUpload.type,
          file_name: file.name,
          file_size: fileToUpload.size,
          status: "active",
          expires_at: expiresAt.toISOString(),
        });

        if (attachError) throw attachError;

        updateUpload(uploadId, { status: "done", progress: 100 });

        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateUpload(uploadId, { status: "error", error: msg });
      }
    },
    [user, conversationId, sendMessage, updateUpload]
  );

  return { uploads, uploadFile };
}
