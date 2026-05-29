/**
 * Tab-switch violation counting and auto-submit trigger logic.
 * Extracted from TestInterface.tsx for testability and reuse.
 */

export interface Violation {
  type: string;
}

/** Counts only TAB_SWITCH and EXTENDED_TAB_SWITCH violations from the list. */
export const countTabSwitches = (violations: Violation[]): number =>
  violations.filter(
    (v) => v.type === "TAB_SWITCH" || v.type === "EXTENDED_TAB_SWITCH"
  ).length;

/**
 * Returns true when the candidate has reached or exceeded the 3-strike limit,
 * triggering automatic test submission.
 */
export const shouldAutoSubmitOnTabSwitch = (violations: Violation[]): boolean =>
  countTabSwitches(violations) >= 3;
