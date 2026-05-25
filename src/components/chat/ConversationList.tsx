"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { formatConversationTime, truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import type { ConversationWithDetails } from "@/types";

function ConversationItem({
  conv,
  active,
}: {
  conv: ConversationWithDetails;
  active: boolean;
}) {
  const user = useAuthStore((s) => s.user);

  const otherParticipant = useMemo(() => {
    if (conv.type === "direct") {
      return conv.participants?.find((p) => p.user_id !== user?.id)?.user ?? null;
    }
    return null;
  }, [conv, user?.id]);

  const displayName =
    conv.type === "group" ? conv.group?.name : otherParticipant?.full_name ?? "Unknown";

  const avatarSrc =
    conv.type === "group" ? conv.group?.image_url : otherParticipant?.avatar_url;

  const avatarName = displayName ?? "?";

  const lastMsg = conv.last_message;
  let previewText = "No messages yet";
  if (lastMsg) {
    if (lastMsg.deleted_for_everyone) {
      previewText = "This message was deleted";
    } else if (lastMsg.type !== "text") {
      const typeMap: Record<string, string> = {
        image: "📷 Photo",
        video: "🎥 Video",
        voice: "🎤 Voice message",
        audio: "🎵 Audio",
        file: "📎 File",
        link: lastMsg.content ?? "Link",
      };
      previewText = typeMap[lastMsg.type] ?? lastMsg.content ?? "";
    } else {
      previewText = truncate(lastMsg.content ?? "", 50);
    }
  }

  const isOnline =
    conv.type === "direct" && otherParticipant?.presence === "online";

  return (
    <Link href={`/chat/${conv.id}`}>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors",
          active && "bg-gray-100"
        )}
      >
        <Avatar
          src={avatarSrc}
          name={avatarName}
          size="md"
          online={conv.type === "direct" ? isOnline : undefined}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>
            {lastMsg?.created_at && (
              <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                {formatConversationTime(lastMsg.created_at)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-sm text-gray-500 truncate">{previewText}</p>
            {(conv.unread_count ?? 0) > 0 && (
              <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-[#25D366] text-white text-xs flex items-center justify-center font-medium">
                {conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ConversationList() {
  const { data, isLoading, isFetching } = useConversations();
  const storeConversations = useChatStore((s) => s.conversations);
  const authLoading = useAuthStore((s) => s.loading);
  const pathname = usePathname();

  // Show skeleton only on the initial load, not background refetches
  const showSkeleton = authLoading || isLoading;
  // Prefer live query data; fall back to store during background refetches so
  // the list never flashes empty while fresh data is on the way
  const displayData = (data && data.length > 0) ? data : (storeConversations.length > 0 && isFetching ? storeConversations : (data ?? storeConversations));

  if (showSkeleton && !displayData.length) {
    return (
      <div className="space-y-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-11 w-11 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!displayData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <MessageSquare size={40} strokeWidth={1.25} />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div>
      {displayData.map((conv) => (
        <ConversationItem
          key={conv.id}
          conv={conv}
          active={pathname === `/chat/${conv.id}`}
        />
      ))}
    </div>
  );
}
