"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { GroupWithMembers } from "@/types";

export function useGroups() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<GroupWithMembers[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          members:group_members(
            *,
            user:users(id, full_name, avatar_url, username, presence)
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as GroupWithMembers[];
    },
  });
}

export function useCreateGroup() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      image_url?: string;
      member_ids: string[];
    }) => {
      const supabase = createClient();

      // Create conversation first
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({ type: "group", created_by: user!.id })
        .select()
        .single();

      if (convError) throw convError;

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: params.name,
          description: params.description ?? null,
          image_url: params.image_url ?? null,
          created_by: user!.id,
          conversation_id: conv.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Update conversation with group_id
      await supabase
        .from("conversations")
        .update({ group_id: group.id })
        .eq("id", conv.id);

      // Add all members (creator + selected)
      const allMemberIds = [...new Set([user!.id, ...params.member_ids])];
      await supabase.from("group_members").insert(
        allMemberIds.map((uid) => ({
          group_id: group.id,
          user_id: uid,
          is_admin: uid === user!.id,
          added_by: user!.id,
        }))
      );

      // Add to conversation_participants
      await supabase.from("conversation_participants").insert(
        allMemberIds.map((uid) => ({
          conversation_id: conv.id,
          user_id: uid,
          is_admin: uid === user!.id,
        }))
      );

      return { group, conversation_id: conv.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (update: {
      name?: string;
      description?: string;
      image_url?: string;
    }) => {
      const { error } = await supabase
        .from("groups")
        .update(update)
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useAddGroupMember(groupId: string) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: group } = await supabase
        .from("groups")
        .select("conversation_id")
        .eq("id", groupId)
        .single();

      await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        is_admin: false,
        added_by: user!.id,
      });

      if (group?.conversation_id) {
        await supabase.from("conversation_participants").insert({
          conversation_id: group.conversation_id,
          user_id: userId,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useRemoveGroupMember(groupId: string) {
  const qc = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: group } = await supabase
        .from("groups")
        .select("conversation_id")
        .eq("id", groupId)
        .single();

      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (group?.conversation_id) {
        await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", group.conversation_id)
          .eq("user_id", userId);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
