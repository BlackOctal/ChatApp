"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useCreateGroup } from "@/hooks/useGroups";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toaster";

interface UserResult {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export function CreateGroupButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { mutateAsync: createGroup, isPending } = useCreateGroup();

  async function handleSearch(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data);
    setSearching(false);
  }

  function toggleUser(u: UserResult) {
    setSelectedUsers((prev) =>
      prev.find((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { toast({ title: "Group name required", variant: "destructive" }); return; }
    if (selectedUsers.length < 1) { toast({ title: "Add at least 1 member", variant: "destructive" }); return; }

    try {
      const result = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        member_ids: selectedUsers.map((u) => u.id),
      });
      toast({ title: "Group created!" });
      setOpen(false);
      router.push(`/chat/${result.conversation_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Failed to create group", description: msg, variant: "destructive" });
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="icon" size="icon">
          <Plus size={22} className="text-[#25D366]" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 max-w-md mx-auto max-h-[80dvh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <Dialog.Title className="font-semibold text-gray-900">New Group</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="icon" size="icon"><X size={18} /></Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Input
              label="Group name"
              placeholder="My Awesome Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Description (optional)"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Selected members */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                    <span className="text-xs text-gray-700">{u.full_name}</span>
                    <button onClick={() => toggleUser(u)}>
                      <X size={12} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search users to add…"
                value={searchQ}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searching && (
                <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-gray-400" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((u) => {
                  const selected = !!selectedUsers.find((x) => x.id === u.id);
                  return (
                    <button
                      key={u.id}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left hover:bg-gray-50 ${selected ? "bg-[#25D366]/10" : ""}`}
                      onClick={() => toggleUser(u)}
                    >
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                      {selected && <div className="ml-auto h-4 w-4 rounded-full bg-[#25D366]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t">
            <Button
              className="w-full"
              onClick={handleCreate}
              loading={isPending}
            >
              Create Group
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
