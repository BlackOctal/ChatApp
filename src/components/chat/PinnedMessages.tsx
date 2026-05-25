"use client";

import { useState } from "react";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import { truncate } from "@/lib/utils";
import type { MessageWithDetails } from "@/types";

interface PinnedMessagesProps {
  messages: MessageWithDetails[];
  onScrollTo: (id: string) => void;
}

export function PinnedMessages({ messages, onScrollTo }: PinnedMessagesProps) {
  const [expanded, setExpanded] = useState(false);
  const pinned = messages.filter((m) => m.is_pinned && !m.deleted_for_everyone);

  if (pinned.length === 0) return null;

  const latest = pinned[pinned.length - 1];

  return (
    <div className="bg-white border-b border-gray-200 overflow-hidden">
      {/* Collapsed: show only latest pinned */}
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50"
        onClick={() => {
          if (pinned.length === 1) {
            onScrollTo(latest.id);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <Pin size={14} className="text-[#25D366] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#25D366]">
            {pinned.length === 1 ? "Pinned message" : `${pinned.length} pinned messages`}
          </p>
          <p className="text-xs text-gray-600 truncate">
            {truncate(latest.content ?? "Media", 60)}
          </p>
        </div>
        {pinned.length > 1 && (
          expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="bg-gray-50 border-t border-gray-200 divide-y divide-gray-200">
          {pinned.map((msg) => (
            <button
              key={msg.id}
              className="flex items-start gap-2 w-full px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => { onScrollTo(msg.id); setExpanded(false); }}
            >
              <Pin size={12} className="text-[#25D366] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700 line-clamp-2">
                {msg.content ?? "Media"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
