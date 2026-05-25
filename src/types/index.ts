export * from "./database";

// ---- WebRTC ----
export interface WebRTCOffer {
  type: "offer" | "answer" | "candidate" | "hangup" | "reject";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  call_id: string;
  from_user_id: string;
  to_user_id: string;
  call_type: "voice" | "video";
}

// ---- UI State ----
export interface ReplyTo {
  id: string;
  content: string | null;
  sender_name: string;
  type: string;
}

export interface MediaUploadProgress {
  id: string;
  file_name: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

// ---- Link Preview ----
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  platform?: "youtube" | "tiktok" | "instagram" | "facebook" | "generic";
  embed_url?: string;
  can_embed: boolean;
}

// ---- Voice Recording ----
export interface VoiceRecording {
  blob: Blob;
  duration_seconds: number;
  waveform: number[];
}
