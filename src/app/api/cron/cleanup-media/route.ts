import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  // Find expired attachments that are still marked active
  const { data: expired, error } = await supabase
    .from("attachments")
    .select("id, storage_path, preview_path")
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString())
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired?.length) {
    return NextResponse.json({ deleted: 0 });
  }

  const paths: string[] = [];
  for (const att of expired) {
    paths.push(att.storage_path);
    if (att.preview_path) paths.push(att.preview_path);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage.from("media").remove(paths);
  if (storageError) {
    console.error("Storage cleanup error:", storageError);
  }

  // Mark as expired in DB
  const ids = expired.map((a) => a.id);
  const { error: updateError } = await supabase
    .from("attachments")
    .update({ status: "expired" })
    .in("id", ids);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length, storage_paths: paths.length });
}
