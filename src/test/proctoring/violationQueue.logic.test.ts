import { describe, it, expect } from "vitest";
import {
  getUnsyncedViolations,
  markViolationsAsSynced,
  buildViolationPayload,
  computeTrustScore,
  type QueuedViolation,
} from "../../lib/proctoring/violationQueue";

describe("Proctoring Violation Queue Logic", () => {
  const violations: QueuedViolation[] = [
    { id: "v1", type: "TAB_SWITCH", timestamp: "2026-01-01T10:00:00Z", synced: false },
    { id: "v2", type: "FACE_ABSENT", timestamp: "2026-01-01T10:01:00Z", synced: true },
    { id: "v3", type: "FULLSCREEN_EXIT", timestamp: "2026-01-01T10:02:00Z", synced: false },
  ];

  describe("getUnsyncedViolations", () => {
    it("should return only unsynced violations", () => {
      const unsynced = getUnsyncedViolations(violations);
      expect(unsynced.length).toBe(2);
      expect(unsynced.every((v) => !v.synced)).toBe(true);
    });

    it("should return empty array when all violations synced", () => {
      const all = violations.map((v) => ({ ...v, synced: true }));
      expect(getUnsyncedViolations(all)).toHaveLength(0);
    });
  });

  describe("markViolationsAsSynced", () => {
    it("should mark all violations as synced", () => {
      const result = markViolationsAsSynced(violations);
      expect(result.every((v) => v.synced)).toBe(true);
    });

    it("should not mutate the original array", () => {
      markViolationsAsSynced(violations);
      expect(violations[0].synced).toBe(false);
    });
  });

  describe("buildViolationPayload", () => {
    it("should build correct payload shape", () => {
      const payload = buildViolationPayload("session-1", [violations[0]]);
      expect(payload.sessionId).toBe("session-1");
      expect(payload.violations[0].type).toBe("TAB_SWITCH");
      expect(payload.violations[0]).toHaveProperty("timestamp");
    });

    it("should not include synced field in payload", () => {
      const payload = buildViolationPayload("session-1", [violations[0]]);
      expect(payload.violations[0]).not.toHaveProperty("synced");
    });
  });

  describe("computeTrustScore", () => {
    it("should return 100 for no violations", () => {
      expect(computeTrustScore([])).toBe(100);
    });

    it("should deduct 10 for a TAB_SWITCH violation", () => {
      expect(computeTrustScore([violations[0]])).toBe(90);
    });

    it("should deduct 5 for a FACE_ABSENT violation", () => {
      const v: QueuedViolation = { id: "x", type: "FACE_ABSENT", timestamp: "", synced: false };
      expect(computeTrustScore([v])).toBe(95);
    });

    it("should floor at 0 for excessive violations", () => {
      const many: QueuedViolation[] = Array.from({ length: 20 }, (_, i) => ({
        id: `v${i}`,
        type: "TAB_SWITCH" as const,
        timestamp: "",
        synced: false,
      }));
      expect(computeTrustScore(many)).toBe(0);
    });

    it("should handle unrecognized violation types using a safe default weight deduction", () => {
      const invalidTypeViolation = {
        id: "v-unknown",
        type: "UNKNOWN_TYPE" as unknown as ViolationType,
        timestamp: "2026-01-01T10:00:00Z",
        synced: false
      };
      // Expected default weight is 5
      expect(computeTrustScore([invalidTypeViolation])).toBe(95);
    });
  });

  describe("Validation Failures and Payload Integrity Checks", () => {
    it("should handle empty or null lists of violations during payload construction gracefully", () => {
      const payload = buildViolationPayload("session-empty", []);
      expect(payload.sessionId).toBe("session-empty");
      expect(payload.violations).toEqual([]);
    });

    it("should ignore invalid sessionIds or null violation records during payload formatting", () => {
      const payload = buildViolationPayload("", [
        { id: "", type: "TAB_SWITCH", timestamp: "", synced: false }
      ]);
      expect(payload.sessionId).toBe("");
      expect(payload.violations[0].type).toBe("TAB_SWITCH");
      expect(payload.violations[0].timestamp).toBe("");
    });
  });

  describe("Boundary Cases & Security Integrity", () => {
    it("should handle massive violation queue inputs without stack overflows or trust score errors", () => {
      const massiveList: QueuedViolation[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `v-${i}`,
        type: "EXTENDED_TAB_SWITCH",
        timestamp: "2026-01-01T10:00:00Z",
        synced: false
      }));
      expect(computeTrustScore(massiveList)).toBe(0);
      const payload = buildViolationPayload("session-large", massiveList);
      expect(payload.violations.length).toBe(1000);
    });

    it("should strictly ensure internal tracking flags like 'synced' are not leaked to backend payload structure", () => {
      const payload = buildViolationPayload("session-sec", [
        { id: "sec-1", type: "TAB_SWITCH", timestamp: "2026-01-01T10:00:00Z", synced: false }
      ]);
      expect(payload.violations[0]).not.toHaveProperty("synced");
      expect(payload.violations[0]).not.toHaveProperty("id");
    });
  });
});
