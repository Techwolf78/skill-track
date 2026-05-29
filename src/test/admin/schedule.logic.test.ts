import { describe, it, expect } from "vitest";
import {
  isScheduleActive,
  isScheduleWithinWindow,
  buildSchedulePayload,
  type TestSchedule,
} from "../../lib/admin/scheduleLogic";

describe("Admin Schedule Logic", () => {
  const baseSchedule: TestSchedule = {
    id: "sched-1",
    testId: "test-1",
    startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    maxCandidates: 50,
    status: "ACTIVE",
  };

  describe("isScheduleActive", () => {
    it("should return true for ACTIVE schedules", () => {
      expect(isScheduleActive(baseSchedule)).toBe(true);
    });

    it("should return false for INACTIVE schedules", () => {
      expect(isScheduleActive({ ...baseSchedule, status: "INACTIVE" })).toBe(false);
    });
  });

  describe("isScheduleWithinWindow", () => {
    it("should return true for schedules currently within window", () => {
      expect(isScheduleWithinWindow(baseSchedule)).toBe(true);
    });

    it("should return false for schedules that have not started yet", () => {
      const future = {
        ...baseSchedule,
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      };
      expect(isScheduleWithinWindow(future)).toBe(false);
    });

    it("should return false for schedules that have already ended", () => {
      const past = {
        ...baseSchedule,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      };
      expect(isScheduleWithinWindow(past)).toBe(false);
    });
  });

  describe("buildSchedulePayload", () => {
    it("should build a valid payload with all fields", () => {
      const payload = buildSchedulePayload("test-1", "2026-01-01T09:00:00Z", "2026-01-01T11:00:00Z", 75);
      expect(payload.testId).toBe("test-1");
      expect(payload.maxCandidates).toBe(75);
    });

    it("should default maxCandidates to 100 when not provided", () => {
      const payload = buildSchedulePayload("test-1", "2026-01-01T09:00:00Z", "2026-01-01T11:00:00Z");
      expect(payload.maxCandidates).toBe(100);
    });
  });
});
