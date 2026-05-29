/**
 * Fullscreen enforcement state machine utilities.
 * Extracted from TestInterface.tsx for testability and reuse.
 */

export const FULLSCREEN_GRACE_PERIOD = 10;

export interface FullscreenState {
  isProctoringActive: boolean;
  isFullscreen: boolean;
  fullscreenTimer: number;
}

/** Computes the enforcement action based on current fullscreen state. */
export const computeFullscreenPolicy = (
  state: FullscreenState
): "ok" | "warn" | "auto-submit" => {
  if (!state.isProctoringActive || state.isFullscreen) return "ok";
  if (state.fullscreenTimer > 0) return "warn";
  return "auto-submit";
};

/** Advances the countdown timer by 1 second, returning the new value and action to fire. */
export const tickFullscreenTimer = (
  timer: number
): { next: number; action: "warn" | "auto-submit" | "tick" } => {
  if (timer <= 1) return { next: 0, action: "auto-submit" };
  return { next: timer - 1, action: timer === FULLSCREEN_GRACE_PERIOD ? "warn" : "tick" };
};

/** Resets the fullscreen countdown timer back to the grace period. */
export const resetFullscreenTimer = (): number => FULLSCREEN_GRACE_PERIOD;
