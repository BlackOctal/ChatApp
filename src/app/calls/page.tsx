"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Avatar } from "@/components/ui/Avatar";
import {
  Phone,
  Video,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  X,
  Search,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { CallWithParticipants } from "@/types";

interface UserResult {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  presence: string;
}

export default function CallsPage() {
  const user = useAuthStore((s) => s.user);
  const { startCall } = useWebRTC();

  // New call dialog state
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [calling, setCalling] = useState(false);

  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<CallWithParticipants[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("calls")
        .select(`
          *,
          initiator:users!initiator_id(id, full_name, avatar_url),
          participants:call_participants(
            *,
            user:users(id, full_name, avatar_url)
          ),
          conversation:conversations(*)
        `)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as CallWithParticipants[];
    },
  });

  function closeDialog() {
    setOpen(false);
    setSearchQuery("");
    setResults([]);
    setSelectedUser(null);
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
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

  async function initiateCall(callUser: UserResult, type: "voice" | "video") {
    setCalling(true);
    try {
      // Find or create a direct conversation with the selected user
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_user_id: callUser.id }),
      });
      const { conversation_id } = await res.json();
      closeDialog();
      await startCall({
        type,
        conversationId: conversation_id,
        remoteUserId: callUser.id,
        remoteUserName: callUser.full_name,
        remoteUserAvatar: callUser.avatar_url ?? undefined,
      });
    } finally {
      setCalling(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <h1 className="text-xl font-bold text-gray-900">Calls</h1>

        {/* New Call button */}
        <Dialog.Root
          open={open}
          onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}
        >
          <Dialog.Trigger asChild>
            <button
              aria-label="New call"
              className="h-9 w-9 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm"
            >
              <Plus size={20} className="text-white" />
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-x-4 top-20 bg-white rounded-2xl z-50 max-w-md mx-auto shadow-xl overflow-hidden"
            >
              {selectedUser ? (
                /* ── Call type picker ── */
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1 -ml-1 rounded-lg hover:bg-gray-100"
                    >
                      <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                    <Dialog.Title className="font-semibold text-gray-900 flex-1">
                      New Call
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button className="p-1 rounded-lg hover:bg-gray-100">
                        <X size={18} className="text-gray-500" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="p-8 flex flex-col items-center gap-6">
                    <Avatar
                      src={selectedUser.avatar_url}
                      name={selectedUser.full_name}
                      size="xl"
                      online={selectedUser.presence === "online"}
                    />
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedUser.full_name}
                      </p>
                      <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                    </div>

                    <div className="flex gap-12">
                      <button
                        onClick={() => initiateCall(selectedUser, "voice")}
                        disabled={calling}
                        className="flex flex-col items-center gap-2 disabled:opacity-60"
                      >
                        <div className="h-16 w-16 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg">
                          {calling ? (
                            <Loader2 size={26} className="text-white animate-spin" />
                          ) : (
                            <Phone size={26} className="text-white" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-700">Voice</span>
                      </button>

                      <button
                        onClick={() => initiateCall(selectedUser, "video")}
                        disabled={calling}
                        className="flex flex-col items-center gap-2 disabled:opacity-60"
                      >
                        <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                          {calling ? (
                            <Loader2 size={26} className="text-white animate-spin" />
                          ) : (
                            <Video size={26} className="text-white" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-700">Video</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* ── User search ── */
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Dialog.Title className="font-semibold text-gray-900 flex-1">
                      New Call
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button className="p-1 rounded-lg hover:bg-gray-100">
                        <X size={18} className="text-gray-500" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <Search size={16} className="text-gray-400 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search by name or username…"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="flex-1 text-sm outline-none placeholder-gray-400 text-gray-900"
                    />
                    {searching && (
                      <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {results.length === 0 && searchQuery.length >= 2 && !searching && (
                      <p className="text-sm text-gray-400 text-center py-8">No users found</p>
                    )}
                    {results.length === 0 && searchQuery.length < 2 && (
                      <p className="text-sm text-gray-400 text-center py-8">
                        Type at least 2 characters to search
                      </p>
                    )}
                    {results.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <Avatar
                          src={u.avatar_url}
                          name={u.full_name}
                          size="md"
                          online={u.presence === "online"}
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {u.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone size={15} className="text-[#25D366]" />
                          <Video size={15} className="text-blue-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Call history list */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-16 md:pb-0">
        {isLoading && (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-11 w-11 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && calls?.map((call) => {
          const isOutgoing = call.initiator_id === user?.id;
          const otherParticipant =
            call.participants?.find((p) => p.user_id !== user?.id)?.user ??
            call.initiator;

          const StatusIcon =
            call.status === "missed"
              ? PhoneMissed
              : isOutgoing
              ? PhoneOutgoing
              : PhoneIncoming;

          const statusColor =
            call.status === "missed" ? "text-red-500" : "text-[#25D366]";

          return (
            <div
              key={call.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <Avatar
                src={otherParticipant?.avatar_url}
                name={otherParticipant?.full_name ?? "?"}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {otherParticipant?.full_name ?? "Unknown"}
                </p>
                <div className={cn("flex items-center gap-1 text-xs", statusColor)}>
                  <StatusIcon size={12} />
                  <span className="capitalize">{call.status}</span>
                  {call.duration_seconds != null && call.duration_seconds > 0 && (
                    <span className="text-gray-400">
                      · {Math.floor(call.duration_seconds / 60)}:
                      {String(call.duration_seconds % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                </span>
                <div className="text-gray-400">
                  {call.type === "video" ? <Video size={14} /> : <Phone size={14} />}
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && !calls?.length && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <Phone size={40} strokeWidth={1.25} />
            <p className="text-sm font-medium">No calls yet</p>
            <p className="text-xs text-center px-10 text-gray-400">
              Tap the + button to start a voice or video call
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
