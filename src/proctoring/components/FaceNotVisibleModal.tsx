import React from "react";
import { Camera, AlertTriangle, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import { useProctoring } from "@/proctoring/ProctoringProvider";

export const FaceNotVisibleModal: React.FC = () => {
  const { faceNotVisible, isCameraObscured, videoRef } = useProctoring();

  if (!faceNotVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5 animate-pulse">
          {isCameraObscured ? (
            <ShieldAlert className="h-7 w-7" />
          ) : (
            <AlertTriangle className="h-7 w-7" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isCameraObscured
              ? "Camera Lens Obscured or Dark"
              : "Face Not Visible in Camera"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {isCameraObscured
              ? "Your camera feed is too dark or the lens appears to be covered. Please remove any obstruction and ensure adequate lighting."
              : "Proctoring requires your face to remain in front of the camera. Please position yourself in the frame to continue your assessment."}
          </p>
        </div>

        {/* Live Camera Preview with Face Alignment Oval */}
        <div className="relative mx-auto h-48 w-64 overflow-hidden rounded-xl border-2 border-dashed border-destructive/50 bg-black/90 shadow-inner flex items-center justify-center">
          {videoRef?.current && videoRef.current.srcObject ? (
            <video
              ref={(node) => {
                if (node && videoRef.current && videoRef.current.srcObject) {
                  if (node.srcObject !== videoRef.current.srcObject) {
                    node.srcObject = videoRef.current.srcObject;
                    node.play().catch(() => {});
                  }
                }
              }}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Camera className="h-8 w-8 animate-pulse text-destructive" />
              <span className="text-xs">Camera Feed Inactive</span>
            </div>
          )}

          {/* Guide Reticle */}
          <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-destructive/60 border-dashed animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-semibold text-white/80 bg-black/60 px-2 py-0.5 rounded-full">
              Align Face Here
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
          <span>Assessment interaction paused. It will resume automatically once verified.</span>
        </div>
      </div>
    </div>
  );
};
