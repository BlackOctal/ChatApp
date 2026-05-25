import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("users")
    .select("id, username, full_name, avatar_url, presence")
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .neq("id", user.id)
    .limit(20);

  if (error) {
    console.error("[users/search] Supabase error:", error.message, error.details);
    // Return empty array so client doesn't crash; DB might not be set up yet
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}
