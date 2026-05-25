import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_VIDEO_STORED } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 });
    }

    // Dynamic import — only on server (excluded from client bundle)
    const ffmpeg = (await import("fluent-ffmpeg")).default;
    const { Readable, Writable } = await import("stream");
    const { pipeline } = await import("stream/promises");
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs");
    const { randomUUID } = await import("crypto");

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${randomUUID()}-input`);
    const outputPath = path.join(tmpDir, `${randomUUID()}-output.mp4`);

    // Write input file
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, inputBuffer);

    // Compress video
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-c:v libx264",
          "-crf 28",
          "-preset fast",
          "-c:a aac",
          "-b:a 96k",
          "-movflags +faststart",
          "-vf scale=-2:720",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const outputBuffer = fs.readFileSync(outputPath);

    // Cleanup tmp files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    if (outputBuffer.length > MAX_VIDEO_STORED) {
      return NextResponse.json(
        { error: "Cannot compress video below 30MB. Please use a shorter video." },
        { status: 422 }
      );
    }

    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": outputBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Video compression error:", err);
    return NextResponse.json({ error: "Compression failed" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
