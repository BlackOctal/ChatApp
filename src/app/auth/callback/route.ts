import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session?.user) {
      const user = data.session.user;
      const admin = await createAdminClient();

      const { data: existing } = await admin
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        const rawMeta = user.user_metadata ?? {};
        const email = user.email ?? "";
        const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");

        const { data: dup } = await admin
          .from("users")
          .select("id")
          .eq("username", base)
          .maybeSingle();

        const username = dup ? `${base}_${user.id.slice(0, 6)}` : base;

        await admin.from("users").insert({
          id: user.id,
          email,
          username,
          full_name: rawMeta.full_name ?? rawMeta.name ?? base,
          avatar_url: rawMeta.avatar_url ?? rawMeta.picture ?? null,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
