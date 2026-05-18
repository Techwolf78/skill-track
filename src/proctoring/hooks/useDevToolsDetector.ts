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

    // Another trick: debugger statement
    const checkDebugger = () => {
      const start = Date.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = Date.now();
      if (end - start > 100) {
        // debugger took a long time, likely devtools is open
        // But this can be annoying for legitimate users if it pauses their execution
        // Maybe just stick to the size check for now
      }
    };

    return () => clearInterval(interval);
  }, [isActive, onViolation]);
}
