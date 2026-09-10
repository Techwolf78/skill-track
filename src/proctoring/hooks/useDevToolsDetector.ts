import { useEffect } from "react";

export function useDevToolsDetector(
  isActive: boolean,
  onViolation: (type: "DEVTOOLS_OPEN") => void
) {
  useEffect(() => {
    if (!isActive) return;

    let devToolsOpen = false;
    
    const checkDevTools = () => {
      const threshold = 160;
      // This is a common but not foolproof way to detect DevTools
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > threshold || heightDiff > threshold;
      
      if (isOpen && !devToolsOpen) {
        onViolation("DEVTOOLS_OPEN");
        devToolsOpen = true;
      } else if (!isOpen && devToolsOpen) {
        devToolsOpen = false;
      }
    };
    
    const interval = setInterval(checkDevTools, 2000);

    // Keyboard shortcut interception for developer tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        onViolation("DEVTOOLS_OPEN");
        return false;
      }

      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Elements)
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        onViolation("DEVTOOLS_OPEN");
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        onViolation("DEVTOOLS_OPEN");
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isActive, onViolation]);
}
