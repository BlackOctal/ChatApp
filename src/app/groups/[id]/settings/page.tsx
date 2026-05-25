"use client";

import { use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, UserPlus, UserMinus, Shield, Loader2 } from "lucide-react";
import { useGroups, useUpdateGroup, useAddGroupMember, useRemoveGroupMember } from "@/hooks/useGroups";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toaster";

interface UserSearchResult {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export default function GroupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: groups } = useGroups();
  const group = groups?.find((g) => g.conversation_id === id || g.id === id);

  const { mutateAsync: updateGroup, isPending: updating } = useUpdateGroup(group?.id ?? "");
  const { mutateAsync: addMember } = useAddGroupMember(group?.id ?? "");
  const { mutateAsync: removeMember } = useRemoveGroupMember(group?.id ?? "");

  const [name, setName] = useState(group?.name ?? "");
  const [desc, setDesc] = useState(group?.description ?? "");
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  if (!group) return null;

  const isAdmin = group.members?.some(
    (m) => m.user_id === user?.id && m.is_admin
  );

  async function handleSave() {
    await updateGroup({ name, description: desc });
    toast({ title: "Group updated" });
  }

  async function handleImageChange(file: File) {
    setUploadingImg(true);
    const supabase = createClient();
    const path = `${group!.id}/cover.${file.name.split(".").pop()}`;
    await supabase.storage.from("group-images").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("group-images").getPublicUrl(path);
    await updateGroup({ image_url: `${data.publicUrl}?t=${Date.now()}` });
    toast({ title: "Group photo updated" });
    setUploadingImg(false);
  }

  async function searchUsers(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    setSearchResults(await res.json());
  }

  async function handleAdd(uid: string) {
    await addMember(uid);
    toast({ title: "Member added" });
    setSearchQ("");
    setSearchResults([]);
  }

  async function handleRemove(uid: string) {
    await removeMember(uid);
    toast({ title: "Member removed" });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <Button variant="icon" size="icon" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-gray-900">Group Info</h1>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-[#25D366]"
            loading={updating}
            onClick={handleSave}
          >
            Save
          </Button>
        )}
      </div>

      {/* Group photo */}
      <div className="flex flex-col items-center py-6 bg-white border-b border-gray-100">
        <div className="relative">
          <Avatar src={group.image_url} name={group.name} size="xl" />
          {isAdmin && (
            <button
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#25D366] flex items-center justify-center border-2 border-white"
              onClick={() => imgRef.current?.click()}
              disabled={uploadingImg}
            >
              {uploadingImg
                ? <span className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={14} className="text-white" />}
            </button>
          )}
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageChange(f); }}
          />
        </div>
      </div>

      {/* Edit fields */}
      {isAdmin ? (
        <div className="bg-white mt-3 p-4 space-y-4 border-y border-gray-100">
          <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      ) : (
        <div className="bg-white mt-3 p-4 border-y border-gray-100">
          <p className="text-sm font-semibold text-gray-900">{group.name}</p>
          {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
        </div>
      )}

      {/* Members */}
      <div className="bg-white mt-3 border-y border-gray-100">
        <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {group.members?.length ?? 0} members
        </p>

        {isAdmin && (
          <div className="px-4 pb-3">
            <Input
              placeholder="Add member by name or username…"
              value={searchQ}
              onChange={(e) => searchUsers(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                {searchResults
                  .filter((r) => !group.members?.some((m) => m.user_id === r.id))
                  .map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                      <Button variant="icon" size="icon" onClick={() => handleAdd(u.id)}>
                        <UserPlus size={16} className="text-[#25D366]" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {group.members?.map((member) => {
            const isMe = member.user_id === user?.id;
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar
                  src={member.user?.avatar_url}
                  name={member.user?.full_name ?? "?"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.user?.full_name ?? "Unknown"} {isMe && "(You)"}
                  </p>
                  {member.is_admin && (
                    <p className="text-xs text-[#25D366] flex items-center gap-1">
                      <Shield size={10} /> Admin
                    </p>
                  )}
                </div>
                {isAdmin && !isMe && (
                  <Button
                    variant="icon"
                    size="icon"
                    onClick={() => handleRemove(member.user_id)}
                    className="text-red-400"
                  >
                    <UserMinus size={16} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
