"use client";

import { useRef } from "react";
import { ImageIcon, Video, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  conversationId: string;
  replyToId?: string;
  onClose: () => void;
  onSent: () => void;
}

export function MediaUploader({ conversationId, onClose }: MediaUploaderProps) {
  const { uploads, uploadFile } = useMediaUpload(conversationId);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    onClose();
  }

  return (
    <div className="bg-white rounded-2xl mx-2 mb-2 p-4 shadow-lg border border-gray-100">
      <div className="flex items-center gap-4 mb-3">
        <button
          className="flex flex-col items-center gap-1.5"
          onClick={() => imageRef.current?.click()}
        >
          <div className="h-12 w-12 rounded-full bg-[#25D366]/10 flex items-center justify-center">
            <ImageIcon size={22} className="text-[#25D366]" />
          </div>
          <span className="text-xs text-gray-600">Photo</span>
          <input
            ref={imageRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",") + ",.heic,.heif"}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </button>

        <button
          className="flex flex-col items-center gap-1.5"
          onClick={() => videoRef.current?.click()}
        >
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Video size={22} className="text-blue-500" />
          </div>
          <span className="text-xs text-gray-600">Video</span>
          <input
            ref={videoRef}
            type="file"
            accept={ALLOWED_VIDEO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </button>
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2 mt-3 border-t pt-3">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              {u.status === "uploading" || u.status === "processing" ? (
                <Loader2 size={16} className="text-[#25D366] animate-spin flex-shrink-0" />
              ) : u.status === "done" ? (
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{u.file_name}</p>
                {(u.status === "uploading" || u.status === "processing") && (
                  <div className="mt-0.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full bg-[#25D366] transition-all duration-300")}
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
                {u.error && <p className="text-xs text-red-500">{u.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
