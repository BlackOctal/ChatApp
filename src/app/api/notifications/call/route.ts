import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to_user_id, call_id, call_type, from_name } = await req.json();

  const adminSupabase = await createAdminClient();

  const { data: recipient } = await adminSupabase
    .from("users")
    .select("fcm_token")
    .eq("id", to_user_id)
    .single();

  if (!recipient?.fcm_token) {
    return NextResponse.json({ sent: false, reason: "No FCM token" });
  }

  await adminSupabase.from("notifications").insert({
    user_id: to_user_id,
    type: "call",
    title: `Incoming ${call_type} call`,
    body: `${from_name} is calling you`,
    data: { call_id, call_type },
  });

  try {
    const { messaging } = await getFirebaseAdmin();
    await messaging.send({
      token: recipient.fcm_token,
      notification: {
        title: `Incoming ${call_type} call`,
        body: `${from_name} is calling you`,
      },
      data: { call_id, call_type, action: "incoming_call" },
      android: { priority: "high" },
      apns: {
        payload: {
          aps: { sound: "default", category: "INCOMING_CALL" },
        },
      },
    });
  } catch (err) {
    console.error("FCM send failed:", err);
  }

  return NextResponse.json({ sent: true });
}
