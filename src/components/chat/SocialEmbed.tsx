"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";

interface SocialEmbedProps {
  url: string;
  metadata: Record<string, unknown>;
}

const PLATFORM_META: Record<string, { name: string; bg: string; textColor: string }> = {
  tiktok:    { name: "TikTok",    bg: "#010101",  textColor: "#ffffff" },
  instagram: { name: "Instagram", bg: "#E1306C",  textColor: "#ffffff" },
  facebook:  { name: "Facebook",  bg: "#1877F2",  textColor: "#ffffff" },
  youtube:   { name: "YouTube",   bg: "#FF0000",  textColor: "#ffffff" },
};

export function SocialEmbed({ url, metadata }: SocialEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  const embedUrl  = metadata.embed_url  as string | null;
  const thumbnail = metadata.thumbnail  as string | null;
  const platform  = (metadata.platform  as string) ?? "generic";
  const canEmbed  = metadata.can_embed  as boolean;
  const pm        = PLATFORM_META[platform];

  // ── YouTube: show thumbnail → tap → embedded player ─────────────────────
  if (canEmbed && embedUrl && platform === "youtube") {
    if (!playing || embedFailed) {
      return (
        <div
          className="rounded-xl overflow-hidden border border-gray-200 cursor-pointer relative"
          onClick={() => setPlaying(true)}
        >
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt="YouTube video"
              width={300}
              height={169}
              className="w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
              <span className="text-white text-sm">YouTube Video</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-[#FF0000] flex items-center justify-center shadow-lg">
              <Play size={24} className="text-white ml-1" fill="currentColor" />
            </div>
          </div>
          <div className="absolute top-2 left-2">
            <span className="text-xs bg-black/70 text-white px-2 py-0.5 rounded font-medium">
              YouTube
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <iframe
          src={`${embedUrl}&autoplay=1`}
          className="w-full aspect-video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen; accelerometer; gyroscope"
          allowFullScreen
          loading="lazy"
          onError={() => setEmbedFailed(true)}
        />
      </div>
    );
  }

  // ── TikTok / Instagram / Facebook: open in native app ───────────────────
  // On iPhone, target="_blank" with the original URL routes to the native app.
  if (pm && platform !== "generic") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-gray-200 no-underline"
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: pm.bg }}
        >
          <Play size={20} fill={pm.textColor} style={{ color: pm.textColor }} />
          <span
            className="flex-1 text-sm font-semibold"
            style={{ color: pm.textColor }}
          >
            Watch on {pm.name}
          </span>
          <ExternalLink size={14} style={{ color: pm.textColor }} />
        </div>
        {/* URL hint */}
        <div className="px-3 py-1.5 bg-gray-50">
          <p className="text-xs text-gray-400 truncate">{url}</p>
        </div>
      </a>
    );
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden border border-gray-200 no-underline"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <ExternalLink size={16} className="text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500 truncate">{url}</p>
      </div>
    </a>
  );
}
