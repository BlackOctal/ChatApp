"use client";

import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase/config";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/Toaster";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export async function registerAndSaveToken(userId: string) {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;

    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const activeReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: activeReg,
    });

    if (token) {
      const supabase = createClient();
      await supabase.from("users").update({ fcm_token: token }).eq("id", userId);
    }
  } catch (err) {
    if (location.protocol === "https:") console.error("FCM token registration failed:", err);
  }
}

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const [permission, setPermission] = useState<PermissionState>("unsupported");

  // Sync permission state from browser on mount
  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  // If permission is already granted when the user logs in, silently init FCM
  useEffect(() => {
    if (!user?.id || permission !== "granted") return;
    registerAndSaveToken(user.id);
  }, [user?.id, permission]);

  // Register foreground message listener exactly once per mount.
  // onMessage returns an unsubscribe fn — clean it up on unmount.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        if (payload.data?.action === "incoming_call") return;
        toast({
          title: payload.notification?.title ?? "New message",
          description: payload.notification?.body,
        });
      });
    });
    return () => { unsubscribe?.(); };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === "granted" && user?.id) {
      await registerAndSaveToken(user.id);
    }
  }, [user?.id]);

  return { permission, requestPermission };
}
