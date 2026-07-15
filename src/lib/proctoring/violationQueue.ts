/**
 * Extended violation queue management and trust scoring utilities.
 * Extends violationLogic.ts for the async sync queue workflow.
 */

export type ViolationType =
  | "TAB_SWITCH"
  | "EXTENDED_TAB_SWITCH"
  | "FACE_ABSENT"
  | "MULTIPLE_PERSONS"
  | "FULLSCREEN_EXIT";

export interface QueuedViolation {
  id: string;
  type: ViolationType;
  timestamp: string;
  synced: boolean;
}

/** Returns violations that have not yet been synced to the backend. */
export const getUnsyncedViolations = (violations: QueuedViolation[]): QueuedViolation[] =>
  violations.filter((v) => !v.synced);

/** Returns a new array with all violations marked as synced (immutable). */
export const markViolationsAsSynced = (violations: QueuedViolation[]): QueuedViolation[] =>
  violations.map((v) => ({ ...v, synced: true }));

/** Builds the backend sync payload from an array of violations. */
export const buildViolationPayload = (
  sessionId: string,
  violations: QueuedViolation[]
) => ({
  sessionId,
  violations: violations.map((v) => ({
    type: v.type,
    timestamp: v.timestamp,
  })),
});

const VIOLATION_WEIGHTS: Record<ViolationType | "LOOK_AWAY", number> = {
  TAB_SWITCH: 10,
  EXTENDED_TAB_SWITCH: 20,
  FACE_ABSENT: 5,
  MULTIPLE_PERSONS: 15,
  FULLSCREEN_EXIT: 10,
  LOOK_AWAY: 1,
};

/**
 * Computes a trust score (0–100) by deducting points per violation type.
 * Score floors at 0.
 */
export const computeTrustScore = (violations: QueuedViolation[]): number => {
  const deducted = violations.reduce(
    (total, v) => total + (VIOLATION_WEIGHTS[v.type as ViolationType] ?? (v.type === "LOOK_AWAY" ? 1 : 5)),
    0
  );
  return Math.max(0, 100 - deducted);
};
