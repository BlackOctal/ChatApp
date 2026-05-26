"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISSED_KEY = "notif_banner_dismissed";

export function NotificationPermissionBanner() {
  const { permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // hide until we know state

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleEnable() {
    await requestPermission();
    dismiss();
  }

  // Only show when permission hasn't been decided and user hasn't dismissed
  if (permission !== "default" || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#25D366] text-white text-sm z-40">
      <Bell size={16} className="flex-shrink-0" />
      <p className="flex-1 leading-snug">
        Enable notifications to get messages and call alerts even when the app is closed.
      </p>
      <button
        onClick={handleEnable}
        className="flex-shrink-0 font-semibold underline underline-offset-2 whitespace-nowrap"
      >
        Allow
      </button>
      <button onClick={dismiss} className="flex-shrink-0 p-0.5" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
