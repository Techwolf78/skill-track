import { useEffect, useRef } from "react";

export function useScreenMonitor(
  isActive: boolean,
  onViolation: (type: "SCREEN_RECORD", metadata: Record<string, unknown>) => void
) {
  const streamRef = useRef<MediaStream | null>(null);
  const onViolationRef = useRef(onViolation);

  // Update ref when callback changes, but don't re-trigger effect
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    if (!isActive) {
      // Stop stream if proctoring is deactivated
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    // If already active and have a stream, don't start again
    if (streamRef.current?.active) return;

    const startScreenCapture = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        streamRef.current = stream;

        // Re-enforce fullscreen
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }

        stream.getVideoTracks()[0].onended = () => {
          onViolationRef.current("SCREEN_RECORD", { detail: "Screen sharing stopped" });
        };
      } catch (err) {
        console.error("Screen capture failed:", err);
        onViolationRef.current("SCREEN_RECORD", { detail: "Screen sharing denied" });
      }
    };

    startScreenCapture();

    // Note: We don't stop tracks here on every effect re-run to avoid loops
    // We handle it in the !isActive check and unmount
  }, [isActive]);

  // Handle unmount specifically
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);
}
