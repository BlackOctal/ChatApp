import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { presence } = await req.json();
  if (!["online", "offline", "away"].includes(presence)) {
    return NextResponse.json({ error: "Invalid presence" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      presence,
      last_seen: presence === "offline" ? new Date().toISOString() : undefined,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
