import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Called by Providers.tsx on every login to guarantee a profile row exists.
// Uses the admin client so RLS never blocks the insert.
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(existing);
  }

  const email = user.email ?? "";
  const meta = user.user_metadata ?? {};
  const base = (meta.name ?? email.split("@")[0] ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  const { data: dup } = await admin
    .from("users")
    .select("id")
    .eq("username", base)
    .neq("id", user.id)
    .maybeSingle();

  const username = dup ? `${base}_${user.id.slice(0, 6)}` : base;

  const { data: created, error: insertError } = await admin
    .from("users")
    .insert({
      id: user.id,
      email,
      username,
      full_name: meta.full_name ?? meta.name ?? base,
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(created);
}
