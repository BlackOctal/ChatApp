"use client";

import { useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCallStore } from "@/stores/callStore";
import { useAuthStore } from "@/stores/authStore";
import { getIceServers, RTC_CONFIG } from "@/lib/webrtc/config";
import { sharedWebRTC } from "@/lib/webrtc/sharedState";
import { toast } from "@/components/ui/Toaster";
import type { CallType, WebRTCOffer } from "@/types";

export function useWebRTC() {
  const user = useAuthStore((s) => s.user);
  const callStore = useCallStore();
  // Keep a local ref for cleanup — sharedWebRTC.getPc() is the canonical ref
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    sharedWebRTC.setPc(null);
    callStore.localStream?.getTracks().forEach((t) => t.stop());
    callStore.remoteStream?.getTracks().forEach((t) => t.stop());
    callStore.reset();
  }, [callStore]);

  const createPeerConnection = useCallback(
    (onIceCandidate: (candidate: RTCIceCandidateInit) => void) => {
      const pc = new RTCPeerConnection({
        ...RTC_CONFIG,
        iceServers: getIceServers(),
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) onIceCandidate(e.candidate.toJSON());
      };

      pc.ontrack = (e) => {
        const [remoteStream] = e.streams;
        callStore.setRemoteStream(remoteStream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          callStore.setState("active");
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          cleanup();
        }
      };

      pcRef.current = pc;
      sharedWebRTC.setPc(pc); // share globally so WebRTCListener can handle answer/candidate
      return pc;
    },
    [callStore, cleanup]
  );

  const sendSignal = useCallback((payload: WebRTCOffer) => {
    // Use the global subscribed channel set by WebRTCListener
    sharedWebRTC.sendSignal(payload);
  }, []);

  const startCall = useCallback(
    async (params: {
      type: CallType;
      conversationId: string;
      remoteUserId: string;
      remoteUserName: string;
      remoteUserAvatar?: string;
    }) => {
      if (!user) return;
      const supabase = createClient();

      const { data: call, error } = await supabase
        .from("calls")
        .insert({
          type: params.type,
          conversation_id: params.conversationId,
          initiator_id: user.id,
          status: "ringing",
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Failed to start call", variant: "destructive" });
        return;
      }

      callStore.setCall({
        callId: call.id,
        callType: params.type,
        remoteUserId: params.remoteUserId,
        remoteUserName: params.remoteUserName,
        remoteUserAvatar: params.remoteUserAvatar,
        conversationId: params.conversationId,
      });
      callStore.setState("calling");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: params.type === "video" ? { facingMode: "user" } : false,
      });
      callStore.setLocalStream(stream);

      const pc = createPeerConnection((candidate) => {
        sendSignal({
          type: "candidate",
          candidate,
          call_id: call.id,
          from_user_id: user.id,
          to_user_id: params.remoteUserId,
          call_type: params.type,
        });
      });

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        sdp: offer.sdp,
        call_id: call.id,
        from_user_id: user.id,
        to_user_id: params.remoteUserId,
        call_type: params.type,
      });

      await fetch("/api/notifications/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: params.remoteUserId,
          call_id: call.id,
          call_type: params.type,
          from_name: user.full_name,
        }),
      });
    },
    [user, callStore, createPeerConnection, sendSignal]
  );

  const acceptCall = useCallback(
    async (callId: string, offerSdp: string, fromUserId: string, callType: CallType) => {
      if (!user) return;
      const supabase = createClient();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video" ? { facingMode: "user" } : false,
      });
      callStore.setLocalStream(stream);

      const pc = createPeerConnection((candidate) => {
        sendSignal({
          type: "candidate",
          candidate,
          call_id: callId,
          from_user_id: user.id,
          to_user_id: fromUserId,
          call_type: callType,
        });
      });

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: "answer",
        sdp: answer.sdp,
        call_id: callId,
        from_user_id: user.id,
        to_user_id: fromUserId,
        call_type: callType,
      });

      await supabase
        .from("calls")
        .update({ status: "active" })
        .eq("id", callId);

      callStore.setState("active");
    },
    [user, callStore, createPeerConnection, sendSignal]
  );

  const hangup = useCallback(async () => {
    const { callId, remoteUserId } = useCallStore.getState();
    if (!callId || !user) return;

    const supabase = createClient();
    await supabase
      .from("calls")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", callId);

    if (remoteUserId) {
      sendSignal({
        type: "hangup",
        call_id: callId,
        from_user_id: user.id,
        to_user_id: remoteUserId,
        call_type: useCallStore.getState().callType ?? "voice",
      });
    }

    cleanup();
  }, [user, sendSignal, cleanup]);

  // Apply mute state to local audio tracks
  useEffect(() => {
    if (!callStore.localStream) return;
    callStore.localStream.getAudioTracks().forEach((t) => {
      t.enabled = !callStore.isMuted;
    });
  }, [callStore.isMuted, callStore.localStream]);

  // Apply camera on/off to local video tracks
  useEffect(() => {
    if (!callStore.localStream) return;
    callStore.localStream.getVideoTracks().forEach((t) => {
      t.enabled = callStore.isCameraOn;
    });
  }, [callStore.isCameraOn, callStore.localStream]);

  return { startCall, acceptCall, hangup, cleanup };
}
