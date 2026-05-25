"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";

interface UserRow {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  presence: string;
}

async function openOrCreateChat(otherUserId: string): Promise<string> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ other_user_id: otherUserId }),
  });
  const json = await res.json();
  return json.conversation_id as string;
}

export function PeopleSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [opening, setOpening] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["all-users", currentUserId],
    enabled: !!currentUserId,
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, username, avatar_url, presence")
        .neq("id", currentUserId!)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleOpen(userId: string) {
    setOpening(userId);
    try {
      const conversationId = await openOrCreateChat(userId);
      queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
      router.push(`/chat/${conversationId}`);
    } finally {
      setOpening(null);
    }
  }

  if (isLoading) return null;
  if (!users.length) return null;

  return (
    <div>
      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
        People
      </p>
      {users.map((u) => (
        <button
          key={u.id}
          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
          onClick={() => handleOpen(u.id)}
          disabled={opening === u.id}
        >
          <Avatar
            src={u.avatar_url}
            name={u.full_name}
            size="md"
            online={u.presence === "online"}
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
            <p className="text-xs text-gray-400 truncate">@{u.username}</p>
          </div>
          {opening === u.id && (
            <Loader2 size={16} className="text-[#25D366] animate-spin flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
