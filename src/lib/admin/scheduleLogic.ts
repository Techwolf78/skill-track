/**
 * Test schedule admin domain logic — pure, framework-agnostic helpers.
 */

export interface TestSchedule {
  id: string;
  testId: string;
  startTime: string;
  endTime: string;
  maxCandidates: number;
  status: "ACTIVE" | "INACTIVE" | "COMPLETED";
}

export const isScheduleActive = (schedule: TestSchedule): boolean =>
  schedule.status === "ACTIVE";

/** Returns true when the current time falls within the schedule's start–end window. */
export const isScheduleWithinWindow = (schedule: TestSchedule): boolean => {
  const now = Date.now();
  const start = new Date(schedule.startTime).getTime();
  const end = new Date(schedule.endTime).getTime();
  return now >= start && now <= end;
};

/** Builds the POST /test-schedules payload, defaulting maxCandidates to 100. */
export const buildSchedulePayload = (
  testId: string,
  startTime: string,
  endTime: string,
  maxCandidates?: number
) => ({
  testId,
  startTime,
  endTime,
  maxCandidates: maxCandidates ?? 100,
});
