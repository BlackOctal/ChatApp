"use client";

import { useState, useRef, useCallback } from "react";
import { Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { formatDuration } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  src: string;
  duration: number;
  senderAvatar?: string | null;
  senderName: string;
}

export function VoiceMessagePlayer({
  src,
  duration,
  senderAvatar,
  senderName,
}: VoiceMessagePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(src);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        setProgress(pct);
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [src, playing]);

  const displayDuration = playing ? currentTime : duration;

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <Avatar src={senderAvatar} name={senderName} size="sm" />

      <Button
        variant="icon"
        size="icon"
        className="flex-shrink-0 h-9 w-9 rounded-full bg-[#25D366] text-white"
        onClick={togglePlay}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </Button>

      <div className="flex-1">
        {/* Waveform progress bar */}
        <div className="flex items-center gap-0.5 mb-1">
          {[...Array(30)].map((_, i) => {
            const played = (i / 30) * 100 < progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full ${played ? "bg-[#25D366]" : "bg-gray-300"}`}
                style={{ height: `${Math.sin(i * 0.6) * 8 + 12}px` }}
              />
            );
          })}
        </div>
        <span className="text-xs text-gray-500">{formatDuration(displayDuration)}</span>
      </div>

      <a href={src} download className="flex-shrink-0">
        <Button variant="icon" size="icon" className="h-7 w-7 text-gray-400">
          <Download size={14} />
        </Button>
      </a>
    </div>
  );
}
