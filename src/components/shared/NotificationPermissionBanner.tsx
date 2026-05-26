"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, Share } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { registerAndSaveToken } from "@/hooks/usePushNotifications";

const DISMISSED_KEY = "notif_banner_dismissed";

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function NotificationPermissionBanner() {
  const user = useAuthStore((s) => s.user);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [dismissed, setDismissed] = useState(true);
  const [iosNotPwa, setIosNotPwa] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");

    // iOS in Safari browser (not PWA) cannot get push notifications — guide user to install
    if (isIOS() && !isStandalone()) {
      setIosNotPwa(true);
    }
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

  if (dismissed) return null;

  // iOS Safari browser — push won't work until installed as PWA
  if (iosNotPwa) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-[#128C7E] text-white text-sm z-40">
        <Share size={16} className="flex-shrink-0 mt-0.5" />
        <p className="flex-1 leading-snug">
          To get message &amp; call notifications, tap{" "}
          <strong>Share</strong> then <strong>Add to Home Screen</strong> and open ChatApp from there.
        </p>
        <button onClick={dismiss} className="flex-shrink-0 p-0.5 mt-0.5" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    );
  }

  if (permission !== "default") return null;

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
