"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X, Search, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/authStore";

interface UserResult {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  presence: string;
}

export function NewChatButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(Array.isArray(json) ? json : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function openChat(otherUserId: string) {
    setOpening(otherUserId);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_user_id: otherUserId }),
      });
      const { conversation_id } = await res.json();
      setOpen(false);
      // Invalidate the conversations cache so the list shows the new chat on return
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      router.push(`/chat/${conversation_id}`);
    } finally {
      setOpening(null);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setResults([]); } }}>
      <Dialog.Trigger asChild>
        <Button variant="icon" size="icon" aria-label="New chat">
          <Plus size={22} className="text-[#25D366]" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-4 top-20 bg-white rounded-2xl z-50 max-w-md mx-auto shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Dialog.Title className="font-semibold text-gray-900 flex-1">New Chat</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="icon" size="icon"><X size={18} /></Button>
            </Dialog.Close>
          </div>

          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or username…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 text-sm outline-none placeholder-gray-400 text-gray-900"
            />
            {searching && <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />}
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !searching && (
              <p className="text-sm text-gray-400 text-center py-8">No users found</p>
            )}
            {results.length === 0 && query.length < 2 && (
              <p className="text-sm text-gray-400 text-center py-8">Type at least 2 characters to search</p>
            )}
            {results.map((user) => (
              <button
                key={user.id}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                onClick={() => openChat(user.id)}
                disabled={!!opening}
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="md"
                  online={user.presence === "online"}
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                </div>
                {opening === user.id && (
                  <Loader2 size={16} className="text-[#25D366] animate-spin flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
