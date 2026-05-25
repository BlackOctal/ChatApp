"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";

// Updates user presence to online/offline based on tab visibility and window focus
export function usePresence() {
  const user = useAuthStore((s) => s.user);
  const isOnlineRef = useRef(false);

  async function setPresence(presence: "online" | "offline") {
    if (!user?.id) return;
    if (presence === "online" && isOnlineRef.current) return;
    if (presence === "offline" && !isOnlineRef.current) return;

    isOnlineRef.current = presence === "online";

    try {
      await fetch("/api/users/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presence }),
        // Use keepalive so it fires even when tab is closing
        keepalive: presence === "offline",
      });
    } catch {}
  }

  useEffect(() => {
    if (!user?.id) return;

    setPresence("online");

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        setPresence("online");
      } else {
        setPresence("offline");
      }
    };

    const handleFocus = () => setPresence("online");
    const handleBlur = () => setPresence("offline");
    const handleUnload = () => setPresence("offline");

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleUnload);

    // Heartbeat every 60s to keep "online" status fresh
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") setPresence("online");
    }, 60_000);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleUnload);
      setPresence("offline");
    };
  }, [user?.id]);
}
