"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCallStore } from "@/stores/callStore";
import { useAuthStore } from "@/stores/authStore";
import { sharedWebRTC } from "@/lib/webrtc/sharedState";
import { toast } from "@/components/ui/Toaster";
import type { WebRTCOffer } from "@/types";

// Must be mounted unconditionally in AppShell so incoming call signals are
// received even when no chat window is open and callState === "idle".
export function WebRTCListener() {
  const userId = useAuthStore((s) => s.user?.id);
  const callStore = useCallStore();

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("webrtc-signals")
      .on("broadcast", { event: "signal" }, async ({ payload }: { payload: WebRTCOffer }) => {
        if (payload.to_user_id !== userId) return;

        if (payload.type === "offer") {
          const { data: caller } = await supabase
            .from("users")
            .select("full_name, avatar_url")
            .eq("id", payload.from_user_id)
            .maybeSingle();

          callStore.setState("ringing");
          callStore.setCall({
            callId: payload.call_id,
            callType: payload.call_type,
            remoteUserId: payload.from_user_id,
            remoteUserName: caller?.full_name ?? "Unknown",
            remoteUserAvatar: caller?.avatar_url ?? undefined,
            conversationId: "",
          });
          sessionStorage.setItem(
            `call_offer_${payload.call_id}`,
            JSON.stringify({ sdp: payload.sdp, from: payload.from_user_id })
          );
        }

        if (payload.type === "answer") {
          const pc = sharedWebRTC.getPc();
          if (pc?.signalingState === "have-local-offer" && payload.sdp) {
            await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
          }
        }

        if (payload.type === "candidate" && payload.candidate) {
          const pc = sharedWebRTC.getPc();
          if (pc?.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {}
          }
        }

        if (payload.type === "hangup") {
          sharedWebRTC.getPc()?.close();
          sharedWebRTC.setPc(null);
          callStore.localStream?.getTracks().forEach((t) => t.stop());
          callStore.remoteStream?.getTracks().forEach((t) => t.stop());
          callStore.reset();
        }

        if (payload.type === "reject") {
          toast({ title: "Call rejected" });
          sharedWebRTC.getPc()?.close();
          sharedWebRTC.setPc(null);
          callStore.localStream?.getTracks().forEach((t) => t.stop());
          callStore.remoteStream?.getTracks().forEach((t) => t.stop());
          callStore.reset();
        }
      })
      .subscribe();

    sharedWebRTC.setSendFn((payload) =>
      channel.send({ type: "broadcast", event: "signal", payload })
    );

    return () => {
      supabase.removeChannel(channel);
      sharedWebRTC.setSendFn(null);
    };
  }, [userId, callStore]);

  return null;
}
