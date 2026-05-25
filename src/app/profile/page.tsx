"use client";

import { useState, useRef } from "react";
import { Camera, Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toaster";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSave(field: string) {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      updateUser({ [field]: value });
      toast({ title: "Updated!" });
      setEditing(null);
    }
  }

  async function handleAvatarChange(file: File) {
    if (!user) return;
    setUploading(true);
    const supabase = createClient();

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    updateUser({ avatar_url: avatarUrl });
    toast({ title: "Avatar updated!" });
    setUploading(false);
  }

  if (!user) return null;

  const fields = [
    { key: "full_name", label: "Full name", value: user.full_name },
    { key: "username", label: "Username", value: user.username },
    { key: "about", label: "About", value: user.about ?? "" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0">
      <div className="px-4 py-3 bg-white border-b border-gray-100 pt-safe">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3 py-8 bg-white border-b border-gray-100">
        <div className="relative">
          <Avatar src={user.avatar_url} name={user.full_name} size="xl" />
          <button
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#25D366] flex items-center justify-center border-2 border-white"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={14} className="text-white" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarChange(file);
            }}
          />
        </div>
        <p className="font-semibold text-gray-900">{user.full_name}</p>
        <p className="text-sm text-gray-500">@{user.username}</p>
      </div>

      {/* Fields */}
      <div className="bg-white mt-3 divide-y divide-gray-100">
        {fields.map(({ key, label, value: currentValue }) => (
          <div key={key} className="px-4 py-3">
            <p className="text-xs text-[#25D366] font-medium mb-0.5">{label}</p>
            {editing === key ? (
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 text-sm text-gray-900 outline-none border-b border-[#25D366] pb-0.5"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
                <Button variant="icon" size="icon" className="h-7 w-7" onClick={() => handleSave(key)}>
                  <Check size={14} className="text-[#25D366]" />
                </Button>
                <Button variant="icon" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
                  <X size={14} className="text-gray-400" />
                </Button>
              </div>
            ) : (
              <button
                className="text-sm text-gray-900 w-full text-left hover:text-[#25D366] transition-colors"
                onClick={() => { setEditing(key); setValue(currentValue); }}
              >
                {currentValue || <span className="text-gray-400">Tap to edit</span>}
              </button>
            )}
          </div>
        ))}

        <div className="px-4 py-3">
          <p className="text-xs text-[#25D366] font-medium mb-0.5">Email</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
