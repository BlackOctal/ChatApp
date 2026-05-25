"use client";

import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePresence } from "@/hooks/usePresence";
import { useRouter } from "next/navigation";

// Bridges the service worker with Firebase config and handles SW navigation messages
export function ServiceWorkerBridge() {
  const router = useRouter();

  usePushNotifications();
  usePresence();

  // Send Firebase config to SW once it's ready
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "FIREBASE_CONFIG", config });
    });

    // Listen for navigate messages from SW
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE") {
        router.push(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [router]);

  return null;
}
