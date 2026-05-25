import { create } from "zustand";
import type { ConversationWithDetails, MessageWithDetails, ReplyTo } from "@/types";

interface ChatState {
  // Active conversation
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  // Messages cache per conversation
  messages: Record<string, MessageWithDetails[]>;
  setMessages: (conversationId: string, messages: MessageWithDetails[]) => void;
  appendMessage: (conversationId: string, message: MessageWithDetails) => void;
  updateMessage: (conversationId: string, messageId: string, update: Partial<MessageWithDetails>) => void;

  // Typing indicators
  typingUsers: Record<string, string[]>; // conversationId -> user IDs
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;

  // Reply state
  replyTo: ReplyTo | null;
  setReplyTo: (reply: ReplyTo | null) => void;

  // Conversation list
  conversations: ConversationWithDetails[];
  setConversations: (convs: ConversationWithDetails[]) => void;
  updateConversation: (id: string, update: Partial<ConversationWithDetails>) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),

  messages: {},
  setMessages: (conversationId, messages) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: messages } })),
  appendMessage: (conversationId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [
          ...(s.messages[conversationId] ?? []),
          message,
        ],
      },
    })),
  updateMessage: (conversationId, messageId, update) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...update } : m
        ),
      },
    })),

  typingUsers: {},
  setTyping: (conversationId, userId, isTyping) =>
    set((s) => {
      const current = s.typingUsers[conversationId] ?? [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...s.typingUsers, [conversationId]: updated } };
    }),

  replyTo: null,
  setReplyTo: (reply) => set({ replyTo: reply }),

  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  updateConversation: (id, update) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...update } : c
      ),
    })),
}));
