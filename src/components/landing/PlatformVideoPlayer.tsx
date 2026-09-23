import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface PlatformVideoPlayerProps {
  src?: string;
  poster?: string;
  autoPlay?: boolean;
}

export function PlatformVideoPlayer({
  src = "/landing/platform-demo.mp4",
  poster = "/landing/analyze_illustration.jpg",
  autoPlay = true,
}: PlatformVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [showControls, setShowControls] = useState(true);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || 1;
    setProgress((current / total) * 100);
    setCurrentTime(formatTime(current));
    setDuration(formatTime(total));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * (videoRef.current.duration || 1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Auto-play with sound blocked by browser policy; fallback to muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [autoPlay]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      className="relative w-full aspect-video bg-black overflow-hidden group select-none flex items-center justify-center rounded-b-2xl"
    >
      {/* Native HTML5 Video Element with Direct CDN MP4 Stream */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        playsInline
        className="w-full h-full object-cover cursor-pointer"
        onClick={togglePlay}
      />

      {/* Ambient Gradient Overlays */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Top Floating Badge */}
      <div
        className={`absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-mono text-slate-200 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Direct CDN Stream • 1080p</span>
      </div>

      {/* Center Large Play/Pause Action Indicator */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute z-20 w-16 h-16 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 transform hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
        >
          <Play className="w-7 h-7 ml-1 fill-white" />
        </button>
      )}

      {/* Bottom Custom Media Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 p-3 sm:p-4 flex flex-col gap-2 transition-opacity duration-300 ${
          showControls || !isPlaying
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div
          onClick={handleSeek}
          className="relative w-full h-1.5 hover:h-2.5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all duration-200"
        >
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between text-white text-xs font-mono">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1 rounded-md hover:bg-white/15 transition-colors cursor-pointer text-slate-300 hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <span className="text-[11px] text-slate-300">
              {currentTime} / {duration}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                  setIsPlaying(true);
                }
              }}
              title="Replay from start"
              className="p-1 rounded-md hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="p-1 rounded-md hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
