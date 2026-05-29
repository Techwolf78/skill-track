import { describe, it, expect } from "vitest";
import {
  isActiveSession,
  isCompletedSession,
  isExpiredSession,
  filterSessionsByStatus,
  computeRemainingTime,
  type SessionSummary,
} from "../../lib/exam/sessionLogic";

describe("Session Domain Logic", () => {
  describe("Status Helpers", () => {
    it("should identify STARTED session as active", () => {
      expect(isActiveSession("STARTED")).toBe(true);
      expect(isActiveSession("SUBMITTED")).toBe(false);
    });

    it("should identify SUBMITTED session as completed", () => {
      expect(isCompletedSession("SUBMITTED")).toBe(true);
      expect(isCompletedSession("STARTED")).toBe(false);
    });

    it("should identify EXPIRED session correctly", () => {
      expect(isExpiredSession("EXPIRED")).toBe(true);
      expect(isExpiredSession("PENDING")).toBe(false);
    });
  });

  describe("filterSessionsByStatus", () => {
    const sessions: SessionSummary[] = [
      { id: "s1", status: "STARTED" },
      { id: "s2", status: "SUBMITTED" },
      { id: "s3", status: "STARTED" },
      { id: "s4", status: "EXPIRED" },
    ];

    it("should return only STARTED sessions", () => {
      const result = filterSessionsByStatus(sessions, "STARTED");
      expect(result.length).toBe(2);
    });

    it("should return only SUBMITTED sessions", () => {
      const result = filterSessionsByStatus(sessions, "SUBMITTED");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("s2");
    });

    it("should return empty array when no matching sessions", () => {
      expect(filterSessionsByStatus(sessions, "PENDING")).toHaveLength(0);
    });
  });

  describe("computeRemainingTime", () => {
    it("should return remaining seconds for a recently started session", () => {
      const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const remaining = computeRemainingTime(startedAt, 60);
      expect(remaining).toBeGreaterThan(50 * 60);
    });

    it("should return 0 for an already-expired session", () => {
      const startedAt = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      expect(computeRemainingTime(startedAt, 60)).toBe(0);
    });
  });
});
