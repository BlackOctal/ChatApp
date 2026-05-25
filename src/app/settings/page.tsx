"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Moon,
  Shield,
  LogOut,
  ChevronRight,
  Smartphone,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { toast } from "@/components/ui/Toaster";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    // Set offline before leaving
    await fetch("/api/users/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presence: "offline" }),
    });

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const sections = [
    {
      title: "Preferences",
      items: [
        { icon: Bell,       label: "Notifications", href: "/settings/notifications", color: "bg-red-100",    iconColor: "text-red-500" },
        { icon: Moon,       label: "Appearance",    href: "/settings/appearance",    color: "bg-purple-100", iconColor: "text-purple-500" },
        { icon: Smartphone, label: "Storage & data",href: "/settings/storage",       color: "bg-blue-100",   iconColor: "text-blue-500" },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        { icon: Shield, label: "Privacy", href: "/settings/privacy", color: "bg-[#e6fef0]", iconColor: "text-[#25D366]" },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0 bg-gray-50">
      <div className="px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Profile card */}
      <Link href="/profile" className="block mt-3">
        <div className="bg-white flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100">
          <Avatar
            src={user?.avatar_url}
            name={user?.full_name ?? "?"}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.about ?? user?.email}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
        </div>
      </Link>

      <div className="space-y-4 mt-3">
        {sections.map((section) => (
          <div key={section.title} className="bg-white">
            <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {section.title}
            </p>
            <div className="divide-y divide-gray-100">
              {section.items.map(({ icon: Icon, label, href, color, iconColor }) => (
                <Link key={label} href={href}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center ${color}`}>
                      <Icon size={18} className={iconColor} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="bg-white">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-4 py-4 w-full hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut size={18} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">
              {loggingOut ? "Signing out…" : "Sign Out"}
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">ChatApp v1.0.0</p>
      </div>
    </div>
  );
}
