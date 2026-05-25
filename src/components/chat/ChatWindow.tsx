"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Video, Search, MoreVertical } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { MessageSearch } from "./MessageSearch";
import { PinnedMessages } from "./PinnedMessages";
import { useMessages } from "@/hooks/useMessages";
import { useTyping } from "@/hooks/useTyping";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { formatLastSeen } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ConversationWithDetails } from "@/types";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const replyTo = useChatStore((s) => s.replyTo);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const { startCall } = useWebRTC();

  const { messages, markRead } = useMessages(conversationId);
  const { typingUsers, sendTyping, stopTyping } = useTyping(conversationId);
  const { data: conversations } = useConversations();

  // Direct fetch for this conversation's details — ensures the header shows
  // even before the full conversations list finishes loading.
  const { data: directConv } = useQuery<ConversationWithDetails | null>({
    queryKey: ["conversation", conversationId],
    staleTime: 0,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants(*, user:users(*)),
          group:groups(*)
        `)
        .eq("id", conversationId)
        .single();
      if (error) return null;
      return data as unknown as ConversationWithDetails;
    },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [searchOpen, setSearchOpen] = useState(false);

  // Prefer the shared conversations list (has unread counts etc); fall back to
  // the direct fetch so the header is never blank.
  const conversation =
    conversations?.find((c) => c.id === conversationId) ?? directConv ?? null;
  const otherParticipant =
    conversation?.type === "direct"
      ? conversation.participants?.find((p) => p.user_id !== user?.id)?.user
      : null;

  const isGroup = conversation?.type === "group";
  const isDirect = conversation?.type === "direct";

  const displayName = isGroup
    ? conversation.group?.name ?? "Group"
    : isDirect
    ? otherParticipant?.full_name ?? "Loading…"
    : "Loading…";

  const avatarSrc = isGroup
    ? conversation.group?.image_url
    : otherParticipant?.avatar_url;

  const statusText = isDirect
    ? otherParticipant?.presence === "online"
      ? "Online"
      : otherParticipant?.last_seen
      ? `Last seen ${formatLastSeen(otherParticipant.last_seen)}`
      : ""
    : isGroup
    ? `${conversation.participants?.length ?? 0} members`
    : "";

  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    markRead();
  }, [messages.length, markRead]);

  const handleCall = useCallback(
    (type: "voice" | "video") => {
      if (!otherParticipant) return;
      startCall({
        type,
        conversationId,
        remoteUserId: otherParticipant.id,
        remoteUserName: otherParticipant.full_name,
        remoteUserAvatar: otherParticipant.avatar_url ?? undefined,
      });
    },
    [otherParticipant, conversationId, startCall]
  );

  return (
    <div className="flex flex-col h-full bg-[#ECE5DD]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#128C7E] text-white pt-safe z-10">
        <Button
          variant="icon"
          size="icon"
          className="text-white -ml-1 md:hidden"
          onClick={() => router.back()}
        >
          <ArrowLeft size={22} />
        </Button>

        <Avatar
          src={avatarSrc}
          name={displayName ?? "?"}
          size="sm"
          online={otherParticipant?.presence === "online"}
        />

        <div className="flex-1 min-w-0 cursor-pointer">
          <p className="font-semibold text-sm leading-tight truncate">{displayName}</p>
          <p className="text-xs text-green-200 truncate">{statusText}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isDirect && otherParticipant && (
            <>
              <Button
                variant="icon"
                size="icon"
                className="text-white"
                onClick={() => handleCall("voice")}
              >
                <Phone size={20} />
              </Button>
              <Button
                variant="icon"
                size="icon"
                className="text-white"
                onClick={() => handleCall("video")}
              >
                <Video size={20} />
              </Button>
            </>
          )}
          <Button
            variant="icon"
            size="icon"
            className="text-white"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search size={20} />
          </Button>
          <Button variant="icon" size="icon" className="text-white">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>

      {/* Pinned messages */}
      <PinnedMessages
        messages={messages}
        onScrollTo={(id) => messageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />

      {/* Search bar */}
      {searchOpen && (
        <MessageSearch
          conversationId={conversationId}
          onClose={() => setSearchOpen(false)}
          onResultSelect={(id) => {
            messageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-3 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} ref={(el) => { messageRefs.current[msg.id] = el; }}>
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === user?.id}
            onReply={() =>
              setReplyTo({
                id: msg.id,
                content: msg.content,
                sender_name: msg.sender?.full_name ?? "Unknown",
                type: msg.type,
              })
            }
          />
          </div>
        ))}

        {typingUsers.length > 0 && (
          <TypingIndicator userIds={typingUsers} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onTyping={sendTyping}
        onStopTyping={stopTyping}
      />
    </div>
  );
}
