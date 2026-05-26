import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getFirebaseAdmin } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation_id, sender_name, message_preview } = await req.json();

  const adminSupabase = await createAdminClient();

  // Get all participants except the sender
  const { data: participants } = await adminSupabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversation_id)
    .neq("user_id", user.id);

  if (!participants?.length) {
    return NextResponse.json({ sent: false, reason: "No recipients" });
  }

  const recipientIds = participants.map((p) => p.user_id);

  // Fetch FCM tokens for all recipients
  const { data: recipients } = await adminSupabase
    .from("users")
    .select("id, fcm_token")
    .in("id", recipientIds)
    .not("fcm_token", "is", null);

  if (!recipients?.length) {
    return NextResponse.json({ sent: false, reason: "No FCM tokens" });
  }

  try {
    const { messaging } = await getFirebaseAdmin();
    await Promise.allSettled(
      recipients
        .filter((r) => r.fcm_token)
        .map((r) =>
          messaging.send({
            token: r.fcm_token!,
            notification: {
              title: sender_name,
              body: message_preview,
            },
            data: { conversation_id, action: "new_message" },
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default" } } },
          })
        )
    );
  } catch (err) {
    console.error("FCM broadcast failed:", err);
  }

  return NextResponse.json({ sent: true, count: recipients.length });
}
