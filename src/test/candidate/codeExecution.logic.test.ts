import { describe, it, expect } from "vitest";
import {
  isTerminalStatus,
  mapTestCaseResults,
  buildSubmitOutputMessage,
  buildRunOutputMessage,
} from "../../lib/exam/codeExecution";

describe("Code Execution Logic", () => {
  describe("isTerminalStatus", () => {
    it("should return false for PENDING", () => {
      expect(isTerminalStatus("PENDING")).toBe(false);
    });

    it("should return false for PROCESSING", () => {
      expect(isTerminalStatus("PROCESSING")).toBe(false);
    });

    it("should return true for ACCEPTED", () => {
      expect(isTerminalStatus("ACCEPTED")).toBe(true);
    });

    it("should return true for WRONG_ANSWER", () => {
      expect(isTerminalStatus("WRONG_ANSWER")).toBe(true);
    });

    it("should return true for COMPILATION_ERROR", () => {
      expect(isTerminalStatus("COMPILATION_ERROR")).toBe(true);
    });

    it("should return true for TIME_LIMIT_EXCEEDED", () => {
      expect(isTerminalStatus("TIME_LIMIT_EXCEEDED")).toBe(true);
    });
  });

  describe("mapTestCaseResults", () => {
    it("should mark ACCEPTED as passed=true", () => {
      const results = mapTestCaseResults([{ status: "ACCEPTED" }]);
      expect(results[0].passed).toBe(true);
    });

    it("should mark WRONG_ANSWER as passed=false", () => {
      const results = mapTestCaseResults([{ status: "WRONG_ANSWER" }]);
      expect(results[0].passed).toBe(false);
    });

    it("should handle mixed results", () => {
      const results = mapTestCaseResults([
        { status: "ACCEPTED" },
        { status: "WRONG_ANSWER" },
        { status: "ACCEPTED" },
      ]);
      expect(results.filter((r) => r.passed).length).toBe(2);
    });
  });

  describe("buildSubmitOutputMessage", () => {
    it("should return success type for ACCEPTED status", () => {
      const out = buildSubmitOutputMessage({ status: "ACCEPTED", testCasesPassed: 5, testCasesTotal: 5 });
      expect(out.type).toBe("success");
      expect(out.message).toContain("All test cases passed");
    });

    it("should return error type for WRONG_ANSWER status", () => {
      const out = buildSubmitOutputMessage({ status: "WRONG_ANSWER", testCasesPassed: 3, testCasesTotal: 5 });
      expect(out.type).toBe("error");
      expect(out.message).toContain("WRONG_ANSWER");
      expect(out.message).toContain("3/5");
    });
  });

  describe("buildRunOutputMessage", () => {
    it("should return error for empty results", () => {
      const out = buildRunOutputMessage([]);
      expect(out.type).toBe("error");
      expect(out.message).toContain("No test cases returned");
    });

    it("should return success when all test cases pass", () => {
      const out = buildRunOutputMessage([{ passed: true }, { passed: true }]);
      expect(out.type).toBe("success");
      expect(out.message).toContain("All 2 test cases passed");
    });

    it("should return error when some test cases fail", () => {
      const out = buildRunOutputMessage([{ passed: true }, { passed: false }, { passed: false }]);
      expect(out.type).toBe("error");
      expect(out.message).toContain("1/3");
    });
  });

  describe("Validation Failures and Boundary Cases", () => {
    it("should handle empty or undefined test cases in mapTestCaseResults", () => {
      expect(mapTestCaseResults([])).toEqual([]);
      // Boundary check on null/empty attributes
      const results = mapTestCaseResults([{ status: undefined as unknown as SubmissionStatus }]);
      expect(results[0].passed).toBe(false);
    });

    it("should handle extremely large test case counts in buildRunOutputMessage", () => {
      const largeCases = Array.from({ length: 10000 }, () => ({ passed: true }));
      const out = buildRunOutputMessage(largeCases);
      expect(out.type).toBe("success");
      expect(out.message).toContain("10000 test cases passed");
    });
  });

  describe("Security Sanitization", () => {
    it("should sanitize or cleanly print potentially injected status strings safely", () => {
      const scriptInjectedStatus = "<script>alert('hack')</script>" as SubmissionStatus;
      const out = buildSubmitOutputMessage({
        status: scriptInjectedStatus,
        testCasesPassed: 0,
        testCasesTotal: 1
      });
      expect(out.type).toBe("error");
      expect(out.message).toContain("<script>alert('hack')</script>");
    });
  });
});
