import { createClient } from "@/lib/supabase/server";
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

      // Ensure a public.users profile exists (OAuth users bypass the normal signup trigger)
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        const rawMeta = user.user_metadata ?? {};
        const email = user.email ?? "";
        const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");

        // Check username uniqueness
        const { data: dup } = await supabase
          .from("users")
          .select("id")
          .eq("username", baseUsername)
          .maybeSingle();

        const username = dup
          ? `${baseUsername}_${user.id.slice(0, 6)}`
          : baseUsername;

        await supabase.from("users").insert({
          id: user.id,
          email,
          username,
          full_name:
            rawMeta.full_name ?? rawMeta.name ?? username,
          avatar_url: rawMeta.avatar_url ?? rawMeta.picture ?? null,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
