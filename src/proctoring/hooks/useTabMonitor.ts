import { useEffect } from "react";

export function useTabMonitor(
  isActive: boolean,
  onViolation: (type: "TAB_SWITCH" | "EXTENDED_TAB_SWITCH", metadata: Record<string, unknown>) => void
) {
  useEffect(() => {
    if (!isActive) return;

    const startTime = Date.now();
    let hiddenStartTime: number | null = null;
    
    const handleVisibilityChange = () => {
      // Ignore if within 5s grace period (screen share popup, etc)
      if (Date.now() - startTime < 5000) return;
      
      if (document.hidden) {
        hiddenStartTime = Date.now();
        onViolation("TAB_SWITCH", { timestamp: hiddenStartTime });
      } else {
        if (hiddenStartTime) {
          const duration = Date.now() - hiddenStartTime;
          if (duration > 5000) { // 5+ seconds away
            onViolation("EXTENDED_TAB_SWITCH", { durationMs: duration });
          }
          hiddenStartTime = null;
        }
      }
    };

    const handleBlur = () => {
      // Ignore if within grace period
      if (Date.now() - startTime < 5000) return;
      
      // Debounce blur to avoid false positives from browser UI interactions (like "Hide" button)
      setTimeout(() => {
        if (!document.hasFocus() && isActive) {
          onViolation("TAB_SWITCH", { type: "window-blur" });
        }
      }, 300);
    };

    const handleFullscreenChange = () => {
      // Ignore if within grace period
      if (Date.now() - startTime < 5000) return;
      
      if (!document.fullscreenElement && isActive) {
        onViolation("TAB_SWITCH", { detail: "Exited fullscreen mode" });
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isActive, onViolation]);
}
