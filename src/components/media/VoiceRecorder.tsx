"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useSendMessage } from "@/hooks/useMessages";
import { formatDuration, MEDIA_EXPIRY_DAYS } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/Toaster";

interface VoiceRecorderProps {
  conversationId: string;
  replyToId?: string;
  onCancel: () => void;
  onSent: () => void;
}

export function VoiceRecorder({
  conversationId,
  replyToId,
  onCancel,
  onSent,
}: VoiceRecorderProps) {
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: sendMessage } = useSendMessage(conversationId);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
    stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    };
  }, [startRecording, stopTimer]);

  const handleSend = useCallback(async () => {
    if (!audioBlob || !user) return;
    setUploading(true);

    try {
      const ext = audioBlob.type.includes("webm") ? "webm" : "mp4";
      const fileName = `${user.id}/${conversationId}/voice-${uuidv4()}.${ext}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, audioBlob, { cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const message = await sendMessage({
        type: "voice",
        reply_to_id: replyToId,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + MEDIA_EXPIRY_DAYS);

      await supabase.from("attachments").insert({
        message_id: message.id,
        storage_path: fileName,
        mime_type: audioBlob.type,
        file_name: `voice-${Date.now()}.${ext}`,
        file_size: audioBlob.size,
        duration_seconds: duration,
        status: "active",
        expires_at: expiresAt.toISOString(),
      });

      onSent();
    } catch (err) {
      toast({
        title: "Failed to send voice message",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [audioBlob, user, conversationId, replyToId, duration, sendMessage, onSent]);

  return (
    <div className="bg-white mx-2 mb-2 rounded-2xl px-4 py-3 flex items-center gap-3 shadow border border-gray-100 pb-safe">
      {/* Cancel */}
      <Button variant="icon" size="icon" onClick={onCancel} className="text-gray-500">
        <Trash2 size={20} />
      </Button>

      {/* Waveform / timer */}
      <div className="flex-1 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <div className="flex-1 flex items-center gap-0.5">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-300 rounded-full"
              style={{
                height: `${Math.random() * 20 + 4}px`,
                opacity: isRecording ? 1 : 0.5,
              }}
            />
          ))}
        </div>
        <span className="text-sm font-mono text-gray-700 flex-shrink-0">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Stop / Send */}
      {isRecording ? (
        <Button
          variant="icon"
          size="icon"
          onClick={stopRecording}
          className="h-10 w-10 rounded-full bg-red-500 text-white"
        >
          <Square size={16} fill="currentColor" />
        </Button>
      ) : (
        <Button
          variant="icon"
          size="icon"
          onClick={handleSend}
          loading={uploading}
          className="h-10 w-10 rounded-full bg-[#25D366] text-white"
        >
          <Send size={16} />
        </Button>
      )}
    </div>
  );
}
