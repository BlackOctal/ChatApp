// ============================================================
// Supabase Database Types
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "file"
  | "link"
  | "system";

export type ConversationType = "direct" | "group";

export type CallType = "voice" | "video";

export type CallStatus = "ringing" | "active" | "ended" | "missed" | "rejected";

export type MediaStatus = "active" | "expired";

export type UserPresence = "online" | "offline" | "away";

// ---- Users ----
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  about: string | null;
  presence: UserPresence;
  last_seen: string;
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Conversations ----
export interface Conversation {
  id: string;
  type: ConversationType;
  group_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  is_admin: boolean;
  muted_until: string | null;
}

// ---- Groups ----
export interface Group {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  added_by: string;
}

// ---- Messages ----
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: MessageType;
  reply_to_id: string | null;
  metadata: Json | null;
  deleted_for_everyone: boolean;
  deleted_for_sender: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface MessageDeletedFor {
  message_id: string;
  user_id: string;
}

// ---- Attachments ----
export interface Attachment {
  id: string;
  message_id: string;
  storage_path: string;
  preview_path: string | null;
  mime_type: string;
  file_name: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  status: MediaStatus;
  expires_at: string;
  created_at: string;
}

// ---- Calls ----
export interface Call {
  id: string;
  type: CallType;
  conversation_id: string;
  initiator_id: string;
  status: CallStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
  is_muted: boolean;
}

// ---- Notifications ----
export interface Notification {
  id: string;
  user_id: string;
  type: "message" | "call" | "mention" | "group_invite";
  title: string;
  body: string;
  data: Json | null;
  read: boolean;
  created_at: string;
}

// ---- Typing Indicators ----
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  started_at: string;
}

// ---- Composed view types ----
export interface ConversationWithDetails extends Conversation {
  participants: Array<ConversationParticipant & { user: User }>;
  group: Group | null;
  last_message: Message | null;
  unread_count: number;
}

export interface MessageWithDetails extends Message {
  sender: User;
  reply_to: MessageWithDetails | null;
  attachments: Attachment[];
  read_by: MessageRead[];
}

export interface GroupWithMembers extends Group {
  members: Array<GroupMember & { user: User }>;
}

export interface CallWithParticipants extends Call {
  participants: Array<CallParticipant & { user: User }>;
  initiator: User;
  conversation: Conversation;
}
