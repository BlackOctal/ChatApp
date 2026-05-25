"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

const TYPING_DEBOUNCE_MS = 2000;
const EMPTY_TYPING: string[] = [];

export function useTyping(conversationId: string) {
  const user = useAuthStore((s) => s.user);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId] ?? EMPTY_TYPING);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!user?.id || !conversationId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new.user_id !== user.id) {
            setTyping(conversationId, payload.new.user_id, true);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setTyping(conversationId, payload.old.user_id, false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, conversationId, setTyping]);

  const sendTyping = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await supabase
        .from("typing_indicators")
        .upsert(
          { conversation_id: conversationId, user_id: user.id },
          { onConflict: "conversation_id,user_id" }
        );
    }

    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = setTimeout(async () => {
      isTypingRef.current = false;
      await supabase
        .from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    }, TYPING_DEBOUNCE_MS);
  }, [user?.id, conversationId]);

  const stopTyping = useCallback(async () => {
    if (!user?.id || !isTypingRef.current) return;
    const supabase = createClient();
    isTypingRef.current = false;
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    await supabase
      .from("typing_indicators")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  }, [user?.id, conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current) stopTyping();
    };
  }, [stopTyping]);

  return { typingUsers, sendTyping, stopTyping };
}
