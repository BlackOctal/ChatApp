"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import type { ConversationWithDetails } from "@/types";

export function useConversations() {
  const user = useAuthStore((s) => s.user);
  const setConversations = useChatStore((s) => s.setConversations);

  const query = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      const supabase = createClient();

      // Step 1: Fetch this user's conversation memberships explicitly.
      // This avoids relying solely on RLS and guarantees we only get
      // conversations the current user actually participates in.
      const { data: myParticipations, error: mpError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at, is_admin")
        .eq("user_id", user!.id);

      if (mpError) throw mpError;

      const conversationIds = (myParticipations ?? []).map((p) => p.conversation_id);
      if (conversationIds.length === 0) return [];

      // Step 2: Fetch full conversation details for only those IDs.
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants(
            *,
            user:users(*)
          ),
          group:groups(*),
          last_message:messages(
            id, content, type, sender_id, created_at, deleted_for_everyone
          )
        `)
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { referencedTable: "messages", ascending: false })
        .limit(1, { referencedTable: "messages" });

      if (error) throw error;

      return (data ?? []).map((conv) => {
        const myParticipation = myParticipations?.find(
          (p) => p.conversation_id === conv.id
        );

        const lastMsg = Array.isArray(conv.last_message)
          ? conv.last_message[0] ?? null
          : conv.last_message;

        const hasUnread =
          lastMsg &&
          lastMsg.sender_id !== user!.id &&
          !lastMsg.deleted_for_everyone &&
          (!myParticipation?.last_read_at ||
            new Date(lastMsg.created_at) > new Date(myParticipation.last_read_at));

        return {
          ...conv,
          unread_count: hasUnread ? 1 : 0,
          last_message: lastMsg,
          my_last_read_at: myParticipation?.last_read_at ?? null,
        } as ConversationWithDetails;
      });
    },
  });

  // Keep Zustand store in sync for components that read from it as fallback
  useEffect(() => {
    if (query.data) setConversations(query.data);
  }, [query.data, setConversations]);

  // Realtime subscription — refetch on relevant changes
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => query.refetch()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => query.refetch()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => query.refetch()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, query]);

  return query;
}
