"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { registerAndSaveToken } from "@/hooks/usePushNotifications";

const DISMISSED_KEY = "notif_banner_dismissed";

export function NotificationPermissionBanner() {
  const user = useAuthStore((s) => s.user);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [dismissed, setDismissed] = useState(true); // hidden until effect runs

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  const handleEnable = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted" && user?.id) {
      await registerAndSaveToken(user.id);
    }
    dismiss();
  }, [user?.id]);

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
