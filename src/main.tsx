import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initKeepAlive } from "./lib/keep-alive";
import { isChunkLoadError, triggerChunkReload } from "./lib/lazyWithRetry";

// Global listener for Vite dynamic import preload errors (native to Vite)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("[Vite Preload Error]: Dynamic asset chunk could not be loaded, triggering reload...", event);
  event.preventDefault(); // Suppress unhandled error
  triggerChunkReload();
});

// Global unhandled rejection listener for dynamic module script failures
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) {
    console.warn("[Unhandled Chunk Error]: Dynamic import rejected, recovering with page reload...", event.reason);
    event.preventDefault();
    triggerChunkReload();
  }
});

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/api\.gryphon360\.com/,
    ],
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Don't send noisy chunk load errors to Sentry as they are auto-recovered by reload
      if (isChunkLoadError(hint.originalException)) {
        return null;
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
// initKeepAlive(); // Disabled: backend hosted on dedicated Airtel Cloud VPS (24/7 active)


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}


