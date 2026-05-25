export type SocialPlatform = "youtube" | "tiktok" | "instagram" | "facebook" | "generic";

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

    // YouTube
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      let videoId: string | null = null;
      if (host === "youtu.be") {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? null;
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

    // TikTok
    if (host === "tiktok.com" || host === "vm.tiktok.com") {
      const videoId = u.pathname.split("/").filter(Boolean).pop();
      return {
        platform: "tiktok",
        embed_url: videoId ? `https://www.tiktok.com/embed/${videoId}` : null,
        thumbnail: null,
        can_embed: !!videoId,
      };
    }

    // Instagram
    if (host === "instagram.com" || host === "instagr.am") {
      const match = u.pathname.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
      if (match) {
        return {
          platform: "instagram",
          embed_url: `https://www.instagram.com/${match[1]}/${match[2]}/embed/`,
          thumbnail: null,
          can_embed: true,
        };
      }
    }

    // Facebook
    if (host === "facebook.com" || host === "fb.com" || host === "fb.watch") {
      return {
        platform: "facebook",
        embed_url: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&width=500`,
        thumbnail: null,
        can_embed: true,
      };
    }

    return { platform: "generic", embed_url: null, thumbnail: null, can_embed: false };
  } catch {
    return { platform: "generic", embed_url: null, thumbnail: null, can_embed: false };
  }
}
