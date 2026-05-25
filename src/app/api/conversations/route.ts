import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { other_user_id } = await req.json();
  if (!other_user_id) {
    return NextResponse.json({ error: "Missing other_user_id" }, { status: 400 });
  }

  // Use DB function to get or create direct conversation
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    other_user_id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ conversation_id: data });
}
