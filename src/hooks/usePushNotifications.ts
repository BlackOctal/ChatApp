"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase/config";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/ui/Toaster";

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;

    async function init() {
      if (!("Notification" in window)) return;

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Register and wait for service worker to become active
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const activeReg = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: activeReg,
        });

        if (token) {
          // Save FCM token to user profile
          const supabase = createClient();
          await supabase
            .from("users")
            .update({ fcm_token: token })
            .eq("id", user!.id);
        }

        // Foreground messages
        onMessage(messaging, (payload) => {
          toast({
            title: payload.notification?.title ?? "New message",
            description: payload.notification?.body,
          });
        });
      } catch (err) {
        // FCM requires HTTPS — expected to fail on localhost
        if (location.protocol === "https:") console.error("FCM init failed:", err);
      }
    }

    init();
  }, [user?.id]);
}
