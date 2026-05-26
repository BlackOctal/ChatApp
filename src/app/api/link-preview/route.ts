import { NextRequest, NextResponse } from "next/server";
import { detectSocialEmbed } from "@/lib/media/socialEmbed";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg|bmp)(\?.*)?$/i;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Check for social embed first
  const embed = detectSocialEmbed(url);
  if (embed.can_embed) {
    return NextResponse.json({
      url,
      platform: embed.platform,
      embed_url: embed.embed_url,
      thumbnail: embed.thumbnail,
      can_embed: true,
    });
  }

  // Social platforms that don't embed (TikTok/Instagram/Facebook) — return their
  // platform info so the card still shows the branded "Watch on …" button.
  if (embed.platform !== "generic") {
    return NextResponse.json({
      url,
      platform: embed.platform,
      embed_url: null,
      thumbnail: null,
      can_embed: false,
    });
  }

  // Detect direct image URLs by extension
  if (IMAGE_EXT.test(url)) {
    return NextResponse.json({ url, is_image: true, image: url, can_embed: false, platform: "image" });
  }

  // Generic OG scrape
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Try a HEAD first to detect images by Content-Type without downloading body
    try {
      const head = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "ChatApp/1.0" },
      });
      const ct = head.headers.get("content-type") ?? "";
      if (ct.startsWith("image/")) {
        clearTimeout(timeout);
        return NextResponse.json({ url, is_image: true, image: url, can_embed: false, platform: "image" });
      }
    } catch {
      // HEAD failed or not supported — fall through to GET
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ChatApp/1.0 (+https://chatapp.example.com)" },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("Fetch failed");

    const html = await res.text();

    const getMeta = (property: string): string | null => {
      const match =
        html.match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]*)"`, "i")) ??
        html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${property}"`, "i"));
      return match?.[1] ?? null;
    };

    const title =
      getMeta("og:title") ??
      html.match(/<title>([^<]*)<\/title>/i)?.[1] ??
      null;

    const description =
      getMeta("og:description") ??
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ??
      null;

    const image = getMeta("og:image");

    return NextResponse.json({
      url,
      title,
      description,
      image,
      can_embed: false,
      platform: "generic",
    });
  } catch {
    return NextResponse.json({ url, can_embed: false, platform: "generic" });
  }
}
