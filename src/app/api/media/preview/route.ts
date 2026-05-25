import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storage_path } = await req.json();
  if (!storage_path) return NextResponse.json({ error: "Missing storage_path" }, { status: 400 });

  try {
    const adminSupabase = await createAdminClient();

    const { data: fileData, error: dlError } = await adminSupabase.storage
      .from("media")
      .download(storage_path);

    if (dlError || !fileData) {
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }

    const sharp = (await import("sharp")).default;
    const rawBuffer = Buffer.from(await fileData.arrayBuffer());

    // Convert HEIC/HEIF before passing to sharp
    let inputBuffer: Buffer = rawBuffer;
    const ext = storage_path.split(".").pop()?.toLowerCase();
    if (ext === "heic" || ext === "heif") {
      // heic-convert has no types; use dynamic import with explicit any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heicConvert = (await import("heic-convert" as any)).default ?? (await import("heic-convert" as any));
      const converted: ArrayBuffer = await heicConvert({
        buffer: rawBuffer,
        format: "JPEG",
        quality: 0.9,
      });
      inputBuffer = Buffer.from(converted);
    }

    const previewBuffer = await sharp(inputBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const previewPath = storage_path.replace(/\.[^.]+$/, "_preview.webp");

    const { error: uploadError } = await adminSupabase.storage
      .from("media")
      .upload(previewPath, previewBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    return NextResponse.json({ preview_path: previewPath });
  } catch (err) {
    console.error("Preview generation failed:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
