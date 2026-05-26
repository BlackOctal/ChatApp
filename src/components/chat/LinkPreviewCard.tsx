"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { SocialEmbed } from "@/components/chat/SocialEmbed";
import type { LinkPreview } from "@/types";

export function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden animate-pulse">
        <div className="h-24 bg-gray-200" />
        <div className="p-2 space-y-1.5">
          <div className="h-3 w-3/4 bg-gray-200 rounded" />
          <div className="h-2.5 w-full bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Direct image URL — show full image, tap to open
  if (preview?.is_image && preview.image) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <Image
            src={preview.image}
            alt="Image"
            width={300}
            height={200}
            className="w-full object-cover"
            unoptimized
          />
          <div className="px-3 py-1.5 flex items-center justify-between bg-gray-50">
            <p className="text-xs text-gray-400 truncate">{new URL(url).hostname}</p>
            <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </a>
    );
  }

  // Social embed (YouTube) or branded card (TikTok / Instagram / Facebook)
  if (preview?.platform && preview.platform !== "generic") {
    return (
      <SocialEmbed url={url} metadata={preview as unknown as Record<string, unknown>} />
    );
  }

  if (!preview?.title && !preview?.image) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <div className="rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
        {preview?.image && (
          <Image
            src={preview.image}
            alt={preview.title ?? "Preview"}
            width={300}
            height={150}
            className="w-full object-cover max-h-36"
            unoptimized
          />
        )}
        <div className="px-3 py-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {preview?.title && (
              <p className="text-xs font-semibold text-gray-900 line-clamp-1">{preview.title}</p>
            )}
            {preview?.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{preview.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 truncate">{new URL(url).hostname}</p>
          </div>
          <ExternalLink size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
        </div>
      </div>
    </a>
  );
}
