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
    // Happy path
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

    // Business-rule failures: already-submitted or pending is NOT active
    it("should return false for SUBMITTED or PENDING in isActiveSession (business-rule)", () => {
      expect(isActiveSession("SUBMITTED")).toBe(false);
      expect(isActiveSession("PENDING")).toBe(false);
      expect(isActiveSession("EXPIRED")).toBe(false);
    });

    // Boundary: every status is only valid for one state
    it("STARTED should not be completed or expired (boundary)", () => {
      expect(isCompletedSession("STARTED")).toBe(false);
      expect(isExpiredSession("STARTED")).toBe(false);
    });
  });

  describe("filterSessionsByStatus", () => {
    const sessions: SessionSummary[] = [
      { id: "s1", status: "STARTED" },
      { id: "s2", status: "SUBMITTED" },
      { id: "s3", status: "STARTED" },
      { id: "s4", status: "EXPIRED" },
    ];

    // Happy path
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

    // Boundary: empty input list
    it("should return empty array when given an empty session list (boundary)", () => {
      expect(filterSessionsByStatus([], "STARTED")).toHaveLength(0);
    });

    // Boundary: all sessions match
    it("should return all sessions when all match requested status (boundary)", () => {
      const all: SessionSummary[] = [
        { id: "a1", status: "EXPIRED" },
        { id: "a2", status: "EXPIRED" },
      ];
      expect(filterSessionsByStatus(all, "EXPIRED")).toHaveLength(2);
    });
  });

  describe("computeRemainingTime", () => {
    // Happy path
    it("should return remaining seconds for a recently started session", () => {
      const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const remaining = computeRemainingTime(startedAt, 60);
      expect(remaining).toBeGreaterThan(50 * 60);
    });

    // Business-rule failure: already expired
    it("should return 0 for an already-expired session", () => {
      const startedAt = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      expect(computeRemainingTime(startedAt, 60)).toBe(0);
    });

    // Boundary: session starts exactly at this instant — nearly full time remains
    it("should return full duration seconds for a just-started session (boundary)", () => {
      const startedAt = new Date().toISOString();
      const remaining = computeRemainingTime(startedAt, 30);
      expect(remaining).toBeGreaterThanOrEqual(30 * 60 - 2); // allow 2s tolerance
      expect(remaining).toBeLessThanOrEqual(30 * 60);
    });

    // Boundary: extreme 24-hour duration
    it("should handle extreme 24-hour duration correctly (boundary)", () => {
      const startedAt = new Date(Date.now() - 60 * 1000).toISOString(); // started 1 minute ago
      const remaining = computeRemainingTime(startedAt, 24 * 60);
      expect(remaining).toBeGreaterThan(24 * 60 * 60 - 120); // nearly 24h left
    });

    // Boundary: 1-minute duration with 30 seconds elapsed
    it("should return ~30 seconds for a 1-minute session started 30s ago (boundary)", () => {
      const startedAt = new Date(Date.now() - 30 * 1000).toISOString();
      const remaining = computeRemainingTime(startedAt, 1);
      expect(remaining).toBeGreaterThanOrEqual(28);
      expect(remaining).toBeLessThanOrEqual(32);
    });

    // Recovery: future startedAt (clock drift) should clamp to duration maximum
    it("should not return negative remaining time under any conditions (recovery)", () => {
      const startedAt = new Date(Date.now() - 999 * 60 * 1000).toISOString();
      expect(computeRemainingTime(startedAt, 10)).toBe(0);
    });
  });
});

