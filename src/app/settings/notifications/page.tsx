"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { registerAndSaveToken } from "@/hooks/usePushNotifications";

type PermState = NotificationPermission | "unsupported";

interface Toggle {
  label: string;
  description: string;
  key: string;
}

const TOGGLES: Toggle[] = [
  { key: "messages",  label: "Messages",            description: "Notifications for new messages" },
  { key: "calls",     label: "Calls",               description: "Incoming voice and video calls" },
  { key: "groups",    label: "Group messages",       description: "Notifications for group chats" },
  { key: "sounds",    label: "Notification sounds",  description: "Play a sound for incoming notifications" },
  { key: "vibration", label: "Vibration",            description: "Vibrate on incoming notifications" },
  { key: "preview",   label: "Message preview",      description: "Show message content in notifications" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [permission, setPermission] = useState<PermState>("unsupported");
  const [settings, setSettings] = useState<Record<string, boolean>>({
    messages: true, calls: true, groups: true,
    sounds: true, vibration: true, preview: true,
  });

  useEffect(() => {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted" && user?.id) {
      await registerAndSaveToken(user.id);
    }
  }, [user?.id]);

  function toggle(key: string) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-gray-50 dark:bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-card border-b border-gray-100 dark:border-border pt-safe">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-secondary">
          <ArrowLeft size={20} className="text-gray-700 dark:text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-foreground">Notifications</h1>
      </div>

      {/* Browser permission block */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-white dark:bg-card border border-gray-100 dark:border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-border">
          <p className="text-xs font-semibold text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
            Browser permission
          </p>
        </div>

        {permission === "unsupported" && (
          <div className="flex items-center gap-3 px-4 py-4">
            <AlertCircle size={20} className="text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-foreground">Not supported</p>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                Push notifications are not available in this browser.
              </p>
            </div>
          </div>
        )}

        {permission === "granted" && (
          <div className="flex items-center gap-3 px-4 py-4">
            <Bell size={20} className="text-[#25D366] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-foreground">Notifications enabled</p>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                You will receive push notifications for messages and calls.
              </p>
            </div>
          </div>
        )}

        {permission === "denied" && (
          <div className="flex items-center gap-3 px-4 py-4">
            <BellOff size={20} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-foreground">Notifications blocked</p>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                Open your browser site settings and allow notifications for this site.
              </p>
            </div>
          </div>
        )}

        {permission === "default" && (
          <div className="flex items-center gap-3 px-4 py-4">
            <BellOff size={20} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-foreground">Notifications off</p>
              <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                Allow notifications to get alerts for messages and calls.
              </p>
            </div>
            <button
              onClick={requestPermission}
              className="flex-shrink-0 px-4 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-semibold"
            >
              Enable
            </button>
          </div>
        )}
      </div>

      {/* In-app preference toggles */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-white dark:bg-card border border-gray-100 dark:border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-border">
          <p className="text-xs font-semibold text-gray-400 dark:text-muted-foreground uppercase tracking-wide">
            Preferences
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-border">
          {TOGGLES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-gray-900 dark:text-foreground">{label}</p>
                <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">{description}</p>
              </div>
              <button
                role="switch"
                aria-checked={settings[key]}
                onClick={() => toggle(key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings[key] ? "bg-[#25D366]" : "bg-gray-300 dark:bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings[key] ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center px-4 py-4 mt-2">
        Push notifications require HTTPS and a supported browser.
      </p>
    </div>
  );
}
