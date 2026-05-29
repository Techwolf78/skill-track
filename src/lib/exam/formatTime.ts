/**
 * Timer formatting utilities for exam countdowns.
 * Extracted from TestInterface.tsx for testability and reuse.
 */

/**
 * Formats a duration in seconds into a human-readable time string.
 * Returns hh:mm:ss for durations >= 1 hour, otherwise mm:ss.
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
