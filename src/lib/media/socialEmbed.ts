export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "facebook" | "generic" | "image";

export interface EmbedInfo {
  platform: SocialPlatform;
  embed_url: string | null;
  thumbnail: string | null;
  can_embed: boolean;
}

export function detectSocialEmbed(url: string): EmbedInfo {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // YouTube — standard watch, youtu.be, Shorts, embeds
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      let videoId: string | null = null;
      if (host === "youtu.be") {
        videoId = u.pathname.slice(1).split("?")[0];
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/shorts/")[1]?.split("?")[0] ?? null;
      } else if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/embed/")[1]?.split("?")[0] ?? null;
      } else {
        videoId = u.searchParams.get("v");
      }
      if (videoId) {
        return {
          platform: "youtube",
          embed_url: `https://www.youtube.com/embed/${videoId}?rel=0`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          can_embed: true,
        };
      }
    }

    // TikTok — iframes are blocked by TikTok's X-Frame-Options; open native app
    if (host === "tiktok.com" || host === "vm.tiktok.com" || host === "vt.tiktok.com") {
      return {
        platform: "tiktok",
        embed_url: null,
        thumbnail: null,
        can_embed: false,
      };
    }

    // Instagram — iframes blocked; open native app
    if (host === "instagram.com" || host === "instagr.am") {
      return {
        platform: "instagram",
        embed_url: null,
        thumbnail: null,
        can_embed: false,
      };
    }

    // Facebook — iframes require SDK; open native app
    if (host === "facebook.com" || host === "fb.com" || host === "fb.watch") {
      return {
        platform: "facebook",
        embed_url: null,
        thumbnail: null,
        can_embed: false,
      };
    }

    return { platform: "generic", embed_url: null, thumbnail: null, can_embed: false };
  } catch {
    return { platform: "generic", embed_url: null, thumbnail: null, can_embed: false };
  }
}
