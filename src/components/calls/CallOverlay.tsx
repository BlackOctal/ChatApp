"use client";

import { useCallStore } from "@/stores/callStore";
import { IncomingCallModal } from "./IncomingCallModal";
import { ActiveCallScreen } from "./ActiveCallScreen";

export function CallOverlay() {
  const state = useCallStore((s) => s.state);

  if (state === "ringing") {
    return <IncomingCallModal />;
  }

  if (state === "calling" || state === "active") {
    return <ActiveCallScreen />;
  }

  return null;
}
