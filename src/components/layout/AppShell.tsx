"use client";

import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { CallOverlay } from "@/components/calls/CallOverlay";
import { WebRTCListener } from "@/components/calls/WebRTCListener";
import { NotificationPermissionBanner } from "@/components/shared/NotificationPermissionBanner";
import { useCallStore } from "@/stores/callStore";

export function AppShell({ children }: { children: ReactNode }) {
  const callState = useCallStore((s) => s.state);

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <DesktopSidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <NotificationPermissionBanner />
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* Global call overlay */}
      {callState !== "idle" && <CallOverlay />}
      {/* Always-on signal listener — detects incoming calls regardless of UI state */}
      <WebRTCListener />
    </div>
  );
}
