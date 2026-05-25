"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, MessageSquare, Phone, Users } from "lucide-react";
import { toast } from "@/components/ui/Toaster";

interface Toggle {
  label: string;
  description: string;
  key: string;
}

const TOGGLES: Toggle[] = [
  { key: "messages",  label: "Messages",       description: "Notifications for new messages" },
  { key: "calls",     label: "Calls",          description: "Incoming voice and video calls" },
  { key: "groups",    label: "Group messages", description: "Notifications for group chats" },
  { key: "sounds",    label: "Notification sounds", description: "Play a sound for incoming notifications" },
  { key: "vibration", label: "Vibration",      description: "Vibrate on incoming notifications" },
  { key: "preview",   label: "Message preview",description: "Show message content in notifications" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    messages: true,
    calls: true,
    groups: true,
    sounds: true,
    vibration: true,
    preview: true,
  });

  function toggle(key: string) {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast({ title: "Saved", description: "Notification settings updated" });
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
      </div>

      <div className="space-y-4 mt-3">
        <div className="bg-white divide-y divide-gray-100">
          {TOGGLES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <button
                role="switch"
                aria-checked={settings[key]}
                onClick={() => toggle(key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings[key] ? "bg-[#25D366]" : "bg-gray-300"
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

        <p className="text-xs text-gray-400 text-center px-4 pb-4">
          Some settings may require device-level notification permission.
        </p>
      </div>
    </div>
  );
}
