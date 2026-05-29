import { describe, it, expect } from "vitest";
import {
  isValidTestPayload,
  getDifficultyLabel,
  filterTestsByStatus,
} from "../../lib/admin/testManagement";

describe("Admin Test Management Logic", () => {
  describe("isValidTestPayload", () => {
    it("should return true for a valid payload", () => {
      expect(isValidTestPayload({ title: "Java Basics", durationMins: 60, passMark: 50 })).toBe(true);
    });

    it("should return false for missing title", () => {
      expect(isValidTestPayload({ durationMins: 60, passMark: 50 })).toBe(false);
    });

    it("should return false for blank title", () => {
      expect(isValidTestPayload({ title: "   ", durationMins: 60, passMark: 50 })).toBe(false);
    });

    it("should return false for zero or negative durationMins", () => {
      expect(isValidTestPayload({ title: "Test", durationMins: 0, passMark: 50 })).toBe(false);
      expect(isValidTestPayload({ title: "Test", durationMins: -5, passMark: 50 })).toBe(false);
    });

    it("should return false when passMark is out of range", () => {
      expect(isValidTestPayload({ title: "Test", durationMins: 60, passMark: 110 })).toBe(false);
      expect(isValidTestPayload({ title: "Test", durationMins: 60, passMark: -1 })).toBe(false);
    });
  });

  describe("getDifficultyLabel", () => {
    it("should return human-readable label for EASY", () => {
      expect(getDifficultyLabel("EASY")).toBe("Easy");
    });

    it("should return human-readable label for MEDIUM", () => {
      expect(getDifficultyLabel("MEDIUM")).toBe("Medium");
    });

    it("should return human-readable label for HARD", () => {
      expect(getDifficultyLabel("HARD")).toBe("Hard");
    });
  });

  describe("filterTestsByStatus", () => {
    const tests = [
      { id: "t1", active: true },
      { id: "t2", active: false },
      { id: "t3", active: true },
    ];

    it("should return only active tests", () => {
      const result = filterTestsByStatus(tests, true);
      expect(result.length).toBe(2);
    });

    it("should return only inactive tests", () => {
      const result = filterTestsByStatus(tests, false);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("t2");
    });
  });
});
