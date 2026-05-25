"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, Phone, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chats" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav when viewing a specific chat or group (so MessageInput is fully visible)
  if (/^\/(chat|groups)\/[^/]/.test(pathname)) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around px-2 h-14">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors",
                "focus:outline-none",
                active ? "text-[#25D366]" : "text-gray-500"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className={cn("text-[10px] font-medium", active ? "text-[#25D366]" : "text-gray-500")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
