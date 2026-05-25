// ChatApp Service Worker
// Handles FCM background notifications and offline caching

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config injected at runtime via env — we read from a meta tag approach.
// The SW reads the config from a dedicated endpoint.
let messaging = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Initialize Firebase once the SW is ready
self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(event.data.config);
      }
      messaging = firebase.messaging();

      // Handle background messages
      messaging.onBackgroundMessage((payload) => {
        const { title, body } = payload.notification ?? {};
        const data = payload.data ?? {};

        self.registration.showNotification(title ?? "New message", {
          body: body ?? "",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-96.png",
          data,
          tag: data.conversation_id ?? "chat",
          renotify: true,
          actions:
            data.action === "incoming_call"
              ? [
                  { action: "accept", title: "Accept" },
                  { action: "decline", title: "Decline" },
                ]
              : [{ action: "open", title: "Open" }],
        });
      });
    } catch (e) {
      console.error("SW Firebase init failed:", e);
    }
  }
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};

  let url = "/chat";
  if (data.conversation_id) url = `/chat/${data.conversation_id}`;
  if (data.action === "incoming_call") url = `/calls`;

  if (event.action === "decline" && data.call_id) {
    // Fire and forget reject
    fetch("/api/calls/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: data.call_id }),
    });
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url });
            return;
          }
        }
        return clients.openWindow(url);
      })
  );
});

// Offline fallback — cache app shell
const CACHE_NAME = "chatapp-v1";
const APP_SHELL = ["/", "/chat", "/offline.html"];

self.addEventListener("fetch", (event) => {
  // Only cache GET requests for navigation
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  if (event.request.url.includes("supabase")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ??
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
        })
      );
    })
  );
});
