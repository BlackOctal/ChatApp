"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Check, CheckCheck, Trash2, Reply, Pin, PinOff, Forward } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatMessageTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { VoiceMessagePlayer } from "@/components/media/VoiceMessagePlayer";
import { MediaExpired } from "@/components/media/MediaExpired";
import { SocialEmbed } from "@/components/chat/SocialEmbed";
import { LinkPreviewCard } from "@/components/chat/LinkPreviewCard";
import { useDeleteMessage } from "@/hooks/useMessages";
import { useAuthStore } from "@/stores/authStore";
import type { MessageWithDetails } from "@/types";

interface MessageBubbleProps {
  message: MessageWithDetails;
  isOwn: boolean;
  onReply?: () => void;
  showAvatar?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  onReply,
  showAvatar = true,
}: MessageBubbleProps) {
  const user = useAuthStore((s) => s.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mutate: deleteMessage } = useDeleteMessage();
  const qc = useQueryClient();

  // Long-press for mobile (context menu fires on desktop)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swiping = useRef(false);
  const SWIPE_THRESHOLD = 60;

  const openMenu = useCallback(() => setMenuOpen(true), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swiping.current = false;
    longPressTimer.current = setTimeout(openMenu, 500);
  }, [openMenu]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = Math.abs(e.touches[0].clientY - swipeStartY.current);

    if (dy > 20) {
      // Mostly vertical scroll — cancel long press, don't swipe
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      return;
    }

    // Only allow swipe in the correct direction per message side
    if (isOwn && dx < 0) {
      swiping.current = true;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      setSwipeX(Math.max(dx, -SWIPE_THRESHOLD));
    } else if (!isOwn && dx > 0) {
      swiping.current = true;
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      setSwipeX(Math.min(dx, SWIPE_THRESHOLD));
    }
  }, [isOwn]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      onReply?.();
    }
    setSwipeX(0);
    swiping.current = false;
  }, [swipeX, onReply]);

  async function handlePin(pin: boolean) {
    await fetch("/api/messages/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: message.id, pin }),
    });
    qc.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
    setMenuOpen(false);
  }

  function handleForward() {
    const text = message.content ?? "";
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setMenuOpen(false);
  }

  const isDeleted = message.deleted_for_everyone;
  const isDeletedForMe =
    message.sender_id === user?.id && message.deleted_for_sender;

  // delivered = message arrived (we have an id); read = someone else opened it
  const deliveredToOthers = !!message.id;
  const readByOthers = message.read_by?.some(
    (r) => r.user_id !== message.sender_id
  );

  if (isDeleted || isDeletedForMe) {
    return (
      <div className={cn("flex mb-1", isOwn ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm italic text-gray-400",
            isOwn ? "bg-[#DCF8C6] rounded-tr-sm" : "bg-white rounded-tl-sm"
          )}
        >
          {isDeleted ? "This message was deleted" : "You deleted this message"}
        </div>
      </div>
    );
  }

  const swipePercent = Math.abs(swipeX) / SWIPE_THRESHOLD;

  return (
    <div
      className={cn(
        "flex items-end gap-1.5 mb-1 group",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && (
        <Avatar
          src={message.sender?.avatar_url}
          name={message.sender?.full_name ?? "?"}
          size="xs"
          className="mb-1 flex-shrink-0"
        />
      )}
      {!isOwn && !showAvatar && <div className="w-7 flex-shrink-0" />}

      {/* Swipe-to-reply hint icon (shown when swiping) */}
      {!isOwn && swipeX > 0 && (
        <div className="flex-shrink-0 mb-1" style={{ opacity: swipePercent }}>
          <Reply size={18} className="text-[#25D366]" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] relative",
          isOwn ? "items-end" : "items-start"
        )}
        style={{
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX === 0 ? "transform 0.2s ease" : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reply reference */}
        {message.reply_to_id && message.reply_to && (
          <div
            className={cn(
              "rounded-xl px-3 py-1.5 mb-1 border-l-4 border-[#25D366] bg-black/5 text-xs",
              isOwn ? "bg-[#c5f0b0]" : "bg-gray-100"
            )}
          >
            <p className="font-semibold text-[#25D366] truncate">
              {(message.reply_to as { sender?: { full_name?: string } }).sender?.full_name ?? "Unknown"}
            </p>
            <p className="text-gray-600 truncate">{message.reply_to.content ?? "Media"}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl overflow-hidden shadow-sm",
            isOwn ? "bg-[#DCF8C6] rounded-tr-sm" : "bg-white rounded-tl-sm"
          )}
          onContextMenu={(e) => { e.preventDefault(); openMenu(); }}
        >
          {/* Content by type */}
          {message.type === "text" && (
            <div className="px-3 py-2">
              <p className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
              <MessageMeta
                time={message.created_at}
                isOwn={isOwn}
                delivered={deliveredToOthers}
                readByOthers={readByOthers}
                isPinned={message.is_pinned}
              />
            </div>
          )}

          {message.type === "link" && (
            <div className="px-3 py-2">
              {message.metadata ? (
                <SocialEmbed metadata={message.metadata as Record<string, unknown>} url={message.content ?? ""} />
              ) : (
                <LinkPreviewCard url={message.content ?? ""} />
              )}
              {message.content && (
                <p className="text-sm text-blue-600 underline break-all mt-1">{message.content}</p>
              )}
              <MessageMeta
                time={message.created_at}
                isOwn={isOwn}
                delivered={deliveredToOthers}
                readByOthers={readByOthers}
                isPinned={message.is_pinned}
              />
            </div>
          )}

          {(message.type === "image") && (
            <div>
              {message.attachments?.[0]?.status === "expired" ? (
                <MediaExpired />
              ) : message.attachments?.[0]?.preview_path ? (
                <div className="relative">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${message.attachments[0].preview_path}`}
                    alt="Image"
                    width={300}
                    height={200}
                    className="rounded-xl object-cover max-h-64 w-full"
                  />
                </div>
              ) : null}
              {message.content && (
                <p className="px-3 py-1 text-sm text-gray-900">{message.content}</p>
              )}
              <div className="px-3 pb-2">
                <MessageMeta
                  time={message.created_at}
                  isOwn={isOwn}
                  delivered={deliveredToOthers}
                  readByOthers={readByOthers}
                  isPinned={message.is_pinned}
                />
              </div>
            </div>
          )}

          {message.type === "video" && (
            <div>
              {message.attachments?.[0]?.status === "expired" ? (
                <MediaExpired />
              ) : (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="rounded-xl max-h-64 max-w-full"
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${message.attachments?.[0]?.storage_path}`}
                />
              )}
              <div className="px-3 pb-2">
                <MessageMeta
                  time={message.created_at}
                  isOwn={isOwn}
                  delivered={deliveredToOthers}
                  readByOthers={readByOthers}
                  isPinned={message.is_pinned}
                />
              </div>
            </div>
          )}

          {message.type === "voice" && (
            <div className="px-3 py-2 min-w-[200px]">
              {message.attachments?.[0]?.status === "expired" ? (
                <MediaExpired />
              ) : (
                <VoiceMessagePlayer
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${message.attachments?.[0]?.storage_path}`}
                  duration={message.attachments?.[0]?.duration_seconds ?? 0}
                  senderAvatar={message.sender?.avatar_url}
                  senderName={message.sender?.full_name ?? "?"}
                />
              )}
              <MessageMeta
                time={message.created_at}
                isOwn={isOwn}
                delivered={deliveredToOthers}
                readByOthers={readByOthers}
                isPinned={message.is_pinned}
              />
            </div>
          )}
        </div>

        {/* Context menu */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className={cn(
                "absolute bottom-full mb-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[160px]",
                isOwn ? "right-0" : "left-0"
              )}
            >
              <button
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full"
                onClick={() => { onReply?.(); setMenuOpen(false); }}
              >
                <Reply size={16} /> Reply
              </button>
              <button
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full"
                onClick={handleForward}
              >
                <Forward size={16} /> Forward
              </button>
              <button
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full"
                onClick={() => handlePin(!message.is_pinned)}
              >
                {message.is_pinned ? <><PinOff size={16} /> Unpin</> : <><Pin size={16} /> Pin</>}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full"
                onClick={() => {
                  deleteMessage({
                    messageId: message.id,
                    conversationId: message.conversation_id,
                    forEveryone: false,
                  });
                  setMenuOpen(false);
                }}
              >
                <Trash2 size={16} /> Delete for me
              </button>
              {isOwn && (
                <button
                  className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-gray-50 w-full"
                  onClick={() => {
                    deleteMessage({
                      messageId: message.id,
                      conversationId: message.conversation_id,
                      forEveryone: true,
                    });
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 size={16} /> Delete for everyone
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Swipe-to-reply hint icon for own messages */}
      {isOwn && swipeX < 0 && (
        <div className="flex-shrink-0 mb-1" style={{ opacity: swipePercent }}>
          <Reply size={18} className="text-[#25D366]" />
        </div>
      )}
    </div>
  );
}

function MessageMeta({
  time,
  isOwn,
  delivered,
  readByOthers,
  isPinned,
}: {
  time: string;
  isOwn: boolean;
  delivered?: boolean;
  readByOthers?: boolean;
  isPinned?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1 mt-0.5">
      {isPinned && <Pin size={10} className="text-gray-400" />}
      <span className="message-meta">{formatMessageTime(time)}</span>
      {isOwn && (
        readByOthers ? (
          <CheckCheck size={14} className="tick-read" />
        ) : delivered ? (
          <CheckCheck size={14} className="tick-sent" />
        ) : (
          <Check size={14} className="tick-sent" />
        )
      )}
    </div>
  );
}
