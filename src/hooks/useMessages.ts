"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import type { MessageWithDetails } from "@/types";

const EMPTY_MESSAGES: MessageWithDetails[] = [];

export function useMessages(conversationId: string) {
  const user = useAuthStore((s) => s.user);
  const { appendMessage, updateMessage, setMessages } = useChatStore();
  const storeMessages = useChatStore((s) => s.messages[conversationId] ?? EMPTY_MESSAGES);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!user && !!conversationId,
    queryFn: async (): Promise<MessageWithDetails[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:users!sender_id(*),
          reply_to:messages!reply_to_id(
            id, content, type, sender_id,
            sender:users!sender_id(full_name)
          ),
          attachments(*),
          read_by:message_reads(*)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as MessageWithDetails[];
    },
  });

  // Sync to store
  useEffect(() => {
    if (query.data) setMessages(conversationId, query.data);
  }, [query.data, conversationId, setMessages]);

  // Realtime
  useEffect(() => {
    if (!user?.id || !conversationId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch full message with relations
          const { data } = await supabase
            .from("messages")
            .select(`
              *,
              sender:users!sender_id(*),
              reply_to:messages!reply_to_id(
                id, content, type, sender_id,
                sender:users!sender_id(full_name)
              ),
              attachments(*),
              read_by:message_reads(*)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) appendMessage(conversationId, data as MessageWithDetails);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          updateMessage(conversationId, payload.new.id, payload.new as Partial<MessageWithDetails>);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, conversationId, appendMessage, updateMessage, qc]);

  // Mark messages as read
  const markRead = useCallback(async () => {
    if (!user?.id || storeMessages.length === 0) return;
    const supabase = createClient();
    const unreadIds = storeMessages
      .filter((m) => m.sender_id !== user.id && !m.read_by?.some((r) => r.user_id === user.id))
      .map((m) => m.id);

    if (unreadIds.length === 0) return;

    await supabase.from("message_reads").upsert(
      unreadIds.map((id) => ({ message_id: id, user_id: user.id })),
      { onConflict: "message_id,user_id" }
    );

    // Update last_read_at on conversation_participants
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  }, [user?.id, conversationId, storeMessages]);

  return { ...query, messages: storeMessages, markRead };
}

export function useSendMessage(conversationId: string) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      content?: string;
      type?: string;
      reply_to_id?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          content: payload.content ?? null,
          type: payload.type ?? "text",
          reply_to_id: payload.reply_to_id ?? null,
          metadata: payload.metadata ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Fire push notification in background — don't await, never block send
      fetch("/api/notifications/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_name: user!.full_name ?? "Someone",
          message_preview: payload.content?.slice(0, 100) ?? "📎 Media",
        }),
      }).catch(() => {});

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
      forEveryone,
    }: {
      messageId: string;
      conversationId: string;
      forEveryone: boolean;
    }) => {
      const supabase = createClient();
      if (forEveryone) {
        await supabase
          .from("messages")
          .update({ deleted_for_everyone: true, content: null })
          .eq("id", messageId)
          .eq("sender_id", user!.id);
      } else {
        await supabase
          .from("messages")
          .update({ deleted_for_sender: true })
          .eq("id", messageId)
          .eq("sender_id", user!.id);
      }
    },
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}
