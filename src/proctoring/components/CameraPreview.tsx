import React, { useState } from "react";
import { useProctoring } from "../ProctoringProvider";
import { Maximize2, Minimize2, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraPreviewProps {
  position?: "top-right" | "bottom-right" | "bottom-left" | "top-left";
  size?: "small" | "medium" | "large";
  showOnHover?: boolean;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ 
  position = "bottom-right",
  size = "small",
  showOnHover = true
}) => {
  const { videoRef, isProctoringActive, trustScore } = useProctoring();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-left": "top-4 left-4",
  };

  const sizeClasses = {
    small: "w-48 h-36",
    medium: "w-64 h-48",
    large: "w-80 h-60",
  };

  if (!isProctoringActive) return null;

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out group",
        positionClasses[position],
        isMinimized ? "w-12 h-12" : sizeClasses[size],
        showOnHover && !isHovered && "opacity-40 hover:opacity-100"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden border-2 shadow-2xl bg-black/80 backdrop-blur-md"
        style={{ borderColor: trustScore > 80 ? "#10b981" : trustScore > 50 ? "#f59e0b" : "#ef4444" }}>
        
        {!isMinimized && (
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline
            className="w-full h-full object-cover mirror"
          />
        )}

        {/* Status Indicators */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isProctoringActive ? "bg-red-500" : "bg-gray-500"
          )} />
          {!isMinimized && (
            <span className="text-[10px] font-medium text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded">
              Live Monitor
            </span>
          )}
        </div>

        {/* Trust Score Overlay */}
        {!isMinimized && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
            <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-mono">
              Trust: {trustScore}%
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded bg-black/40 hover:bg-black/60 text-white"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
        </div>

        {isMinimized && (
          <div className="w-full h-full flex items-center justify-center text-white">
            <Video size={20} />
          </div>
        )}
      </div>
      
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};
