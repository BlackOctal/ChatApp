import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { call_id } = await req.json();
  if (!call_id) return NextResponse.json({ error: "Missing call_id" }, { status: 400 });

  await supabase
    .from("calls")
    .update({ status: "rejected", ended_at: new Date().toISOString() })
    .eq("id", call_id);

  return NextResponse.json({ ok: true });
}
