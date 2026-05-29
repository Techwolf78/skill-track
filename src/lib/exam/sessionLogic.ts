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
