"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, Phone, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { href: "/chat", icon: MessageSquare, label: "Chats" },
  { href: "/groups", icon: Users, label: "Groups" },
  { href: "/calls", icon: Phone, label: "Calls" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="hidden md:flex flex-col w-16 bg-[#202C33] items-center py-4 gap-2">
      {/* App icon */}
      <div className="mb-4">
        <div className="h-9 w-9 rounded-full bg-[#25D366] flex items-center justify-center">
          <MessageSquare size={18} className="text-white" />
        </div>
      </div>

      {/* Nav items */}
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
              active
                ? "bg-[#25D366] text-white"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
          </Link>
        );
      })}

      {/* User avatar at bottom */}
      <div className="mt-auto">
        <Link href="/profile">
          <Avatar
            src={user?.avatar_url}
            name={user?.full_name ?? "User"}
            size="sm"
          />
        </Link>
      </div>
    </aside>
  );
}
