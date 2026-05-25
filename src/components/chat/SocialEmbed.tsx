"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SocialEmbedProps {
  url: string;
  metadata: Record<string, unknown>;
}

export function SocialEmbed({ url, metadata }: SocialEmbedProps) {
  const [embedFailed, setEmbedFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const embedUrl = metadata.embed_url as string | null;
  const thumbnail = metadata.thumbnail as string | null;
  const platform = metadata.platform as string;
  const canEmbed = metadata.can_embed as boolean;

  if (!canEmbed || embedFailed) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        {thumbnail && (
          <div className="relative">
            <Image
              src={thumbnail}
              alt="Video thumbnail"
              width={300}
              height={170}
              className="w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center">
                <Play size={20} className="text-white ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-gray-500 capitalize">{platform} video</span>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Open <ExternalLink size={12} />
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (!playing && thumbnail) {
    return (
      <div
        className="rounded-xl overflow-hidden border border-gray-200 cursor-pointer relative"
        onClick={() => setPlaying(true)}
      >
        <Image
          src={thumbnail}
          alt="Video thumbnail"
          width={300}
          height={170}
          className="w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-black/70 flex items-center justify-center">
            <Play size={24} className="text-white ml-1" fill="currentColor" />
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded capitalize">
            {platform}
          </span>
        </div>
      </div>
    );
  }

  if (!embedUrl) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <iframe
        src={embedUrl}
        className="w-full aspect-video"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen; accelerometer; gyroscope"
        allowFullScreen
        loading="lazy"
        onError={() => setEmbedFailed(true)}
      />
    </div>
  );
}
