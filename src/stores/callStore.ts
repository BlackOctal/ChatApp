import { create } from "zustand";
import type { CallType } from "@/types";

type CallState = "idle" | "ringing" | "calling" | "active" | "ended";

interface CallStoreState {
  state: CallState;
  callId: string | null;
  callType: CallType | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserAvatar: string | null;
  conversationId: string | null;
  isMuted: boolean;
  isSpeaker: boolean;
  isCameraOn: boolean;
  isFrontCamera: boolean;
  isFullscreen: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  setState: (state: CallState) => void;
  setCall: (params: {
    callId: string;
    callType: CallType;
    remoteUserId: string;
    remoteUserName: string;
    remoteUserAvatar?: string;
    conversationId: string;
  }) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleCamera: () => void;
  toggleFrontCamera: () => void;
  toggleFullscreen: () => void;
  reset: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  state: "idle",
  callId: null,
  callType: null,
  remoteUserId: null,
  remoteUserName: null,
  remoteUserAvatar: null,
  conversationId: null,
  isMuted: false,
  isSpeaker: true,
  isCameraOn: true,
  isFrontCamera: true,
  isFullscreen: false,
  localStream: null,
  remoteStream: null,

  setState: (state) => set({ state }),
  setCall: (params) =>
    set({
      callId: params.callId,
      callType: params.callType,
      remoteUserId: params.remoteUserId,
      remoteUserName: params.remoteUserName,
      remoteUserAvatar: params.remoteUserAvatar ?? null,
      conversationId: params.conversationId,
    }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleSpeaker: () => set((s) => ({ isSpeaker: !s.isSpeaker })),
  toggleCamera: () => set((s) => ({ isCameraOn: !s.isCameraOn })),
  toggleFrontCamera: () => set((s) => ({ isFrontCamera: !s.isFrontCamera })),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  reset: () =>
    set({
      state: "idle",
      callId: null,
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      remoteUserAvatar: null,
      conversationId: null,
      isMuted: false,
      isSpeaker: true,
      isCameraOn: true,
      isFrontCamera: true,
      isFullscreen: false,
      localStream: null,
      remoteStream: null,
    }),
}));
