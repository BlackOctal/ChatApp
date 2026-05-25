import { NextRequest, NextResponse } from "next/server";
import { detectSocialEmbed } from "@/lib/media/socialEmbed";

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

  // Generic OG scrape
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

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
