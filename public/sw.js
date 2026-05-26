// ChatApp Service Worker
// Handles FCM background notifications and offline caching

// Wrap importScripts so a CDN failure (offline, CSP, Safari quirk) never
// crashes the entire service worker and breaks navigation requests.
let firebaseLoaded = false;
try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");
  firebaseLoaded = true;
} catch (e) {
  console.warn("[SW] Firebase SDK failed to load — push notifications disabled:", e);
}

let messaging = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Initialize Firebase once the SW is ready
self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG" && firebaseLoaded) {
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

// Offline fallback — only intercept same-origin navigations.
// Excludes /auth/ to prevent redirect loops (middleware redirects
// unauthenticated users to /auth/login; intercepting that creates a cycle).
const CACHE_NAME = "chatapp-v2";

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode !== "navigate") return;

  const url = event.request.url;
  if (url.includes("/api/")) return;
  if (url.includes("/auth/")) return;   // prevent auth redirect loops
  if (url.includes("supabase")) return;

  // Race network against a 10-second timeout so Safari never hangs forever
  event.respondWith(
    Promise.race([
      fetch(event.request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("sw-timeout")), 10000)
      ),
    ]).catch(() =>
      caches.match("/offline.html").then(
        (r) =>
          r ??
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
      )
    )
  );
});
