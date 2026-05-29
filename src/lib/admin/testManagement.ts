/**
 * Admin test management domain logic — pure, framework-agnostic helpers.
 */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface TestPayload {
  title: string;
  description: string;
  durationMins: number;
  difficulty: Difficulty;
  passMark: number;
}

/** Validates required fields and range constraints on a test creation payload. */
export const isValidTestPayload = (
  payload: Partial<TestPayload>
): boolean => {
  if (!payload.title || payload.title.trim() === "") return false;
  if (!payload.durationMins || payload.durationMins <= 0) return false;
  if (payload.passMark == null || payload.passMark < 0 || payload.passMark > 100) return false;
  return true;
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/** Returns a human-readable label for a difficulty enum value. */
export const getDifficultyLabel = (difficulty: Difficulty): string =>
  DIFFICULTY_LABELS[difficulty];

/** Filters a test list by active/inactive publishing status. */
export const filterTestsByStatus = (
  tests: { id: string; active: boolean }[],
  active: boolean
) => tests.filter((t) => t.active === active);
