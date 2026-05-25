"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Mic, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSendMessage } from "@/hooks/useMessages";
import { VoiceRecorder } from "@/components/media/VoiceRecorder";
import { MediaUploader } from "@/components/media/MediaUploader";
import { cn } from "@/lib/utils";
import type { ReplyTo } from "@/types";

interface MessageInputProps {
  conversationId: string;
  replyTo: ReplyTo | null;
  onClearReply: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export function MessageInput({
  conversationId,
  replyTo,
  onClearReply,
  onTyping,
  onStopTyping,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: sendMessage, isPending } = useSendMessage(conversationId);

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content) return;

    const urlPattern = /https?:\/\/[^\s]+/gi;
    const hasLink = urlPattern.test(content);

    sendMessage({
      content,
      type: hasLink && content.match(/^https?:\/\/[^\s]+$/) ? "link" : "text",
      reply_to_id: replyTo?.id,
    });

    setText("");
    onClearReply();
    onStopTyping();
    textareaRef.current?.focus();
  }, [text, replyTo, sendMessage, onClearReply, onStopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping();

    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  };

  if (showVoice) {
    return (
      <VoiceRecorder
        conversationId={conversationId}
        replyToId={replyTo?.id}
        onCancel={() => setShowVoice(false)}
        onSent={() => { setShowVoice(false); onClearReply(); }}
      />
    );
  }

  return (
    <div className="bg-[#F0F0F0] px-2 pb-safe">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl mb-2 mt-2 border-l-4 border-[#25D366]">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#25D366] truncate">{replyTo.sender_name}</p>
            <p className="text-xs text-gray-500 truncate">{replyTo.content ?? "Media"}</p>
          </div>
          <Button variant="icon" size="icon" className="h-6 w-6 flex-shrink-0" onClick={onClearReply}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Media uploader */}
      {showAttach && (
        <MediaUploader
          conversationId={conversationId}
          replyToId={replyTo?.id}
          onClose={() => setShowAttach(false)}
          onSent={() => { setShowAttach(false); onClearReply(); }}
        />
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 py-2">
        <Button
          variant="icon"
          size="icon"
          className="flex-shrink-0 h-10 w-10 rounded-full bg-white"
          onClick={() => setShowAttach(!showAttach)}
        >
          {showAttach ? <X size={20} className="text-[#25D366]" /> : <Paperclip size={20} className="text-gray-500" />}
        </Button>

        <div className="flex-1 bg-white rounded-3xl flex items-end px-3 py-1 min-h-[42px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className={cn(
              "flex-1 bg-transparent resize-none outline-none text-sm text-gray-900",
              "placeholder-gray-400 leading-relaxed py-1.5 max-h-[120px]"
            )}
          />
          {text.length === 0 && (
            <Button
              variant="icon"
              size="icon"
              className="flex-shrink-0 h-7 w-7 ml-1 mb-0.5"
              onClick={() => setShowAttach(!showAttach)}
            >
              <ImageIcon size={18} className="text-gray-500" />
            </Button>
          )}
        </div>

        {text.trim() ? (
          <Button
            variant="icon"
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-full bg-[#25D366]"
            onClick={handleSend}
            loading={isPending}
          >
            <Send size={18} className="text-white" />
          </Button>
        ) : (
          <Button
            variant="icon"
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-full bg-[#25D366]"
            onClick={() => setShowVoice(true)}
          >
            <Mic size={18} className="text-white" />
          </Button>
        )}
      </div>
    </div>
  );
}
