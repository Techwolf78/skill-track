/**
 * Test session domain logic utilities.
 * Used by admin dashboards and candidate session tracking.
 */

export type SessionStatus = "STARTED" | "SUBMITTED" | "EXPIRED" | "PENDING";

export interface SessionSummary {
  id: string;
  status: SessionStatus;
}

export const isActiveSession = (status: SessionStatus): boolean => status === "STARTED";
export const isCompletedSession = (status: SessionStatus): boolean => status === "SUBMITTED";
export const isExpiredSession = (status: SessionStatus): boolean => status === "EXPIRED";

/** Filters a session list by a target status. */
export const filterSessionsByStatus = (
  sessions: SessionSummary[],
  status: SessionStatus
): SessionSummary[] => sessions.filter((s) => s.status === status);

/**
 * Computes the remaining seconds for an in-progress session.
 * Returns 0 if the session has already exceeded its duration.
 */
export const computeRemainingTime = (
  startedAt: string,
  durationMins: number
): number => {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, durationMins * 60 - elapsed);
};

/**
 * Detects if the server timer indicates an extension compared to local remaining seconds.
 * A buffer (default 10s) prevents false positives from minor network jitter or clock tick mismatch.
 */
export const detectTimeExtension = (
  serverSecs: number,
  localSecs: number,
  bufferSecs: number = 10
): { extended: boolean; addedMinutes: number } => {
  if (typeof serverSecs !== "number" || typeof localSecs !== "number" || isNaN(serverSecs) || isNaN(localSecs)) {
    return { extended: false, addedMinutes: 0 };
  }
  if (serverSecs > localSecs + bufferSecs) {
    const diff = serverSecs - localSecs;
    const addedMinutes = Math.max(1, Math.round(diff / 60));
    return { extended: true, addedMinutes };
  }
  return { extended: false, addedMinutes: 0 };
};

/**
 * Formats seconds into HH : MM : SS or HH:MM:SS format.
 */
export const formatSeconds = (totalSecs: number, spaced: boolean = true): string => {
  const clamped = Math.max(0, Math.floor(totalSecs || 0));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const parts = [h, m, s].map((v) => String(v).padStart(2, "0"));
  return spaced ? parts.join(" : ") : parts.join(":");
};

