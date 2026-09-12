import React from "react";

const RELOAD_KEY = "rxone_chunk_reload_ts";
const RELOAD_DEBOUNCE_MS = 10000; // 10 seconds

/**
 * Checks if an error is a stale chunk or dynamic import failure
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === "string" ? error : (error as Error)?.message || String(error);
  const name = (error as Error)?.name || "";

  return (
    name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Expected a JavaScript-or-Wasm module script") ||
    msg.includes("MIME type of \"text/html\"") ||
    msg.includes("Loading chunk") ||
    msg.includes("dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Failed to load module script")
  );
}

/**
 * Safely triggers a page reload to pull the latest deployment assets,
 * protected by a sessionStorage debounce guard to prevent infinite loops.
 */
export function triggerChunkReload(): boolean {
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
    const now = Date.now();

    if (now - lastReload > RELOAD_DEBOUNCE_MS) {
      sessionStorage.setItem(RELOAD_KEY, String(now));
      console.warn("[Deployment Update] Stale chunk detected. Reloading page to fetch latest build...");
      window.location.reload();
      return true;
    }
  } catch {
    window.location.reload();
    return true;
  }
  return false;
}

/**
 * Wraps React.lazy with automatic chunk retry and deployment update recovery.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const component = await componentImport();
      // Reset reload key on successful component resolution
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // ignore storage errors
      }
      return component;
    } catch (error: unknown) {
      console.error("[Dynamic Import Error]:", error);

      if (isChunkLoadError(error)) {
        const reloaded = triggerChunkReload();
        if (reloaded) {
          // Return a pending promise while the browser performs the reload
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}

export default lazyWithRetry;
