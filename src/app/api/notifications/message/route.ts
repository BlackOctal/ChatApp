import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to_user_id, message_preview, sender_name, conversation_id } = await req.json();

  const adminSupabase = await createAdminClient();

  const { data: recipient } = await adminSupabase
    .from("users")
    .select("fcm_token")
    .eq("id", to_user_id)
    .single();

  if (!recipient?.fcm_token) {
    return NextResponse.json({ sent: false });
  }

  try {
    const { messaging } = await getFirebaseAdmin();
    await messaging.send({
      token: recipient.fcm_token,
      notification: {
        title: sender_name,
        body: message_preview,
      },
      data: { conversation_id, action: "new_message" },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
  } catch (err) {
    console.error("FCM send failed:", err);
  }

  return NextResponse.json({ sent: true });
}
