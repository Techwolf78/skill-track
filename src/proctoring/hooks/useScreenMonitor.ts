import { useEffect, useRef } from "react";

export function useScreenMonitor(
  isActive: boolean,
  onViolation: (
    type: "SCREEN_RECORD",
    metadata: Record<string, unknown>,
  ) => void,
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
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    // If already active and have a stream, don't start again
    if (streamRef.current?.active) return;

    const startScreenCapture = async () => {
      try {
        // 1. Pre-check for multiple monitors
        const isExtendedPre =
          "isExtended" in window.screen
            ? (window.screen as unknown as { isExtended?: boolean }).isExtended
            : false;
        if (isExtendedPre) {
          onViolationRef.current("SCREEN_RECORD", {
            detail:
              "Multiple displays detected. Secondary monitors are not permitted.",
          });
        }

        // 2. Request Entire Screen with Chromium constraints
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
          },
          audio: false,
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          surfaceSwitching: "exclude",
          systemAudio: "exclude",
        } as MediaStreamConstraints);

        const track = stream.getVideoTracks()[0];
        const settings = track
          ? (track.getSettings() as MediaTrackSettings & {
              displaySurface?: string;
            })
          : {};
        const displaySurface = settings.displaySurface;

        // 3. Strict surface validation
        if (displaySurface && displaySurface !== "monitor") {
          track.stop();
          streamRef.current = null;
          onViolationRef.current("SCREEN_RECORD", {
            detail:
              "Entire screen share required. Single tab or application window sharing is prohibited.",
            surface: displaySurface,
          });
          return;
        }

        streamRef.current = stream;

        // Re-enforce fullscreen
        if (
          !document.fullscreenElement &&
          document.documentElement.requestFullscreen
        ) {
          document.documentElement.requestFullscreen().catch(() => {});
        }

        track.onended = () => {
          onViolationRef.current("SCREEN_RECORD", {
            detail: "Screen sharing was stopped by user",
          });
        };
      } catch (err: unknown) {
        console.error("Screen capture failed:", err);
        const errName =
          typeof err === "object" && err !== null && "name" in err
            ? String((err as { name: string }).name)
            : "";
        onViolationRef.current("SCREEN_RECORD", {
          detail:
            errName === "NotAllowedError"
              ? "Screen sharing permission denied"
              : "Screen sharing capture failed",
        });
      }
    };

    startScreenCapture();
  }, [isActive]);

  // Periodic multi-screen check while active
  useEffect(() => {
    if (!isActive) return;

    const checkScreens = () => {
      const isExtended =
        "isExtended" in window.screen
          ? (window.screen as unknown as { isExtended?: boolean }).isExtended
          : false;
      if (isExtended) {
        onViolationRef.current("SCREEN_RECORD", {
          detail:
            "Multiple displays detected. Secondary monitors are not permitted.",
        });
      }
    };

    const intervalId = setInterval(checkScreens, 5000);
    return () => clearInterval(intervalId);
  }, [isActive]);

  // Handle unmount specifically
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);
}
