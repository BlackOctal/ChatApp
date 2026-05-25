"use client";

import Link from "next/link";
import { useGroups } from "@/hooks/useGroups";
import { Avatar } from "@/components/ui/Avatar";
import { Users } from "lucide-react";

export function GroupList() {
  const { data: groups, isLoading } = useGroups();

  if (isLoading) {
    return (
      <div className="space-y-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-11 w-11 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!groups?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Users size={40} strokeWidth={1.25} />
        <p className="text-sm">No groups yet</p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => {
        const href = group.conversation_id
          ? `/chat/${group.conversation_id}`
          : `/groups/${group.id}`;

        return (
          <Link href={href} key={group.id}>
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
              <Avatar
                src={group.image_url}
                name={group.name}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{group.name}</p>
                <p className="text-xs text-gray-500">
                  {group.members?.length ?? 0} members
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
