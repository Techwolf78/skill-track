/**
 * Keep-alive scheduler
 * Disabled: Backend is hosted on a 24/7 dedicated VPS.
 * Background ping loops with dummy data have been removed to prevent 401 token invalidation.
 */
export function initKeepAlive() {
  // No-op: Background pings disabled to maintain session stability
}

