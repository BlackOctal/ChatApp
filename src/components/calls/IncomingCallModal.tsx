"use client";

import { Phone, PhoneOff } from "lucide-react";
import { useCallStore } from "@/stores/callStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { sharedWebRTC } from "@/lib/webrtc/sharedState";
import type { CallType } from "@/types";

export function IncomingCallModal() {
  const {
    callId,
    callType,
    remoteUserName,
    remoteUserAvatar,
    remoteUserId,
  } = useCallStore();
  const user = useAuthStore((s) => s.user);
  const { acceptCall, cleanup } = useWebRTC();

  async function handleAccept() {
    if (!callId || !user || !remoteUserId) return;
    const stored = sessionStorage.getItem(`call_offer_${callId}`);
    if (!stored) return;
    const { sdp } = JSON.parse(stored);
    sessionStorage.removeItem(`call_offer_${callId}`);
    await acceptCall(callId, sdp, remoteUserId, callType ?? ("voice" as CallType));
  }

  async function handleReject() {
    if (!callId || !user || !remoteUserId) return;
    const supabase = createClient();
    await supabase
      .from("calls")
      .update({ status: "rejected", ended_at: new Date().toISOString() })
      .eq("id", callId);

    // Use the globally subscribed channel — never create an unsubscribed one
    sharedWebRTC.sendSignal({
      type: "reject",
      call_id: callId,
      from_user_id: user.id,
      to_user_id: remoteUserId,
      call_type: callType ?? "voice",
    });

    cleanup();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-xs flex flex-col items-center gap-6">
        <Avatar
          src={remoteUserAvatar}
          name={remoteUserName ?? "?"}
          size="xl"
        />
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{remoteUserName}</p>
          <p className="text-sm text-gray-500 mt-1">
            Incoming {callType ?? "voice"} call
          </p>
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={handleReject}
            className="h-16 w-16 rounded-full bg-red-500 flex items-center justify-center"
          >
            <PhoneOff size={28} className="text-white" />
          </button>
          <button
            onClick={handleAccept}
            className="h-16 w-16 rounded-full bg-[#25D366] flex items-center justify-center"
          >
            <Phone size={28} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
