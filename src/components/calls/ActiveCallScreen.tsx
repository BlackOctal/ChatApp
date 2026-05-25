"use client";

import { useRef, useEffect } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useCallStore } from "@/stores/callStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export function ActiveCallScreen() {
  const {
    callType,
    callState: state,
    remoteUserName,
    remoteUserAvatar,
    isMuted,
    isSpeaker,
    isCameraOn,
    isFullscreen,
    localStream,
    remoteStream,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    toggleFrontCamera,
    toggleFullscreen,
  } = useCallStore(
    useShallow((s) => ({
      callType: s.callType,
      callState: s.state,
      remoteUserName: s.remoteUserName,
      remoteUserAvatar: s.remoteUserAvatar,
      isMuted: s.isMuted,
      isSpeaker: s.isSpeaker,
      isCameraOn: s.isCameraOn,
      isFullscreen: s.isFullscreen,
      localStream: s.localStream,
      remoteStream: s.remoteStream,
      toggleMute: s.toggleMute,
      toggleSpeaker: s.toggleSpeaker,
      toggleCamera: s.toggleCamera,
      toggleFrontCamera: s.toggleFrontCamera,
      toggleFullscreen: s.toggleFullscreen,
    }))
  );

  const { hangup } = useWebRTC();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Audio element only used for voice calls; video calls use the video element for audio
  useEffect(() => {
    if (isVoiceOnly && remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, isVoiceOnly]);

  const isVoiceOnly = callType === "voice";

  return (
    <div
      className={cn(
        "fixed z-50 bg-[#1A2327] flex flex-col",
        isFullscreen
          ? "inset-0"
          : "bottom-4 right-4 w-72 h-auto rounded-2xl overflow-hidden shadow-2xl"
      )}
    >
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {isVoiceOnly ? (
          /* Voice call — show avatar only */
          <div className="flex flex-col items-center gap-4 py-12">
            <Avatar src={remoteUserAvatar} name={remoteUserName ?? "?"} size="xl" />
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{remoteUserName}</p>
              <p className="text-gray-400 text-sm mt-1">
                {state === "calling" ? "Calling…" : "Connected"}
              </p>
            </div>
          </div>
        ) : (
          /* Video call — always keep the video element mounted so the ref is stable */
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Overlay avatar while waiting for remote video */}
            {!remoteStream && (
              <div className="absolute inset-0 bg-[#1A2327] flex flex-col items-center justify-center gap-4">
                <Avatar src={remoteUserAvatar} name={remoteUserName ?? "?"} size="xl" />
                <div className="text-center">
                  <p className="text-white font-semibold text-lg">{remoteUserName}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {state === "calling" ? "Calling…" : "Connecting…"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Local video PiP */}
        {callType === "video" && localStream && isCameraOn && (
          <div className="absolute top-3 right-3 h-24 w-16 rounded-xl overflow-hidden border-2 border-white/30">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center"
        >
          <Maximize2 size={14} className="text-white" />
        </button>
      </div>

      {/* Audio element only for voice calls — video calls use the <video> element for audio */}
      {isVoiceOnly && <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-5 pb-safe">
        <ControlBtn
          active={isMuted}
          icon={isMuted ? MicOff : Mic}
          onClick={toggleMute}
          label="Mute"
        />
        {callType === "video" && (
          <>
            <ControlBtn
              active={!isCameraOn}
              icon={isCameraOn ? Video : VideoOff}
              onClick={toggleCamera}
              label="Camera"
            />
            <ControlBtn
              active={false}
              icon={RotateCcw}
              onClick={toggleFrontCamera}
              label="Flip"
            />
          </>
        )}
        <ControlBtn
          active={isSpeaker}
          icon={isSpeaker ? Volume2 : VolumeX}
          onClick={toggleSpeaker}
          label="Speaker"
        />
        <button
          onClick={hangup}
          className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center"
        >
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>
    </div>
  );
}

function ControlBtn({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-12 w-12 rounded-full flex flex-col items-center justify-center",
        active ? "bg-white/20" : "bg-white/10"
      )}
      aria-label={label}
    >
      <Icon size={20} className="text-white" />
    </button>
  );
}
