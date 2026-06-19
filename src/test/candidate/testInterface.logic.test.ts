import { describe, it, expect } from "vitest";
import { formatTime } from "../../lib/exam/formatTime";
import { countTabSwitches, shouldAutoSubmitOnTabSwitch } from "../../lib/proctoring/violationLogic";

describe("Timer Formatting", () => {
  it("should display mm:ss for durations under one hour", () => {
    expect(formatTime(90)).toBe("01:30");
  });

  it("should display 00:00 for zero seconds", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("should display hh:mm:ss format for durations >= 1 hour", () => {
    expect(formatTime(3661)).toBe("1:01:01");
  });

  it("should correctly format 59 minutes 59 seconds", () => {
    expect(formatTime(3599)).toBe("59:59");
  });
});

describe("Tab Switch Violation Logic", () => {
  it("should count only TAB_SWITCH and EXTENDED_TAB_SWITCH violations", () => {
    const violations = [
      { type: "TAB_SWITCH" },
      { type: "FACE_ABSENT" },
      { type: "EXTENDED_TAB_SWITCH" },
    ];
    expect(countTabSwitches(violations)).toBe(2);
  });

  it("should trigger auto-submit at 3 or more tab switches", () => {
    const violations = [
      { type: "TAB_SWITCH" },
      { type: "TAB_SWITCH" },
      { type: "TAB_SWITCH" },
    ];
    expect(shouldAutoSubmitOnTabSwitch(violations)).toBe(true);
  });

  it("should NOT trigger auto-submit at 2 tab switches", () => {
    const violations = [{ type: "TAB_SWITCH" }, { type: "TAB_SWITCH" }];
    expect(shouldAutoSubmitOnTabSwitch(violations)).toBe(false);
  });

  it("should return 0 for an empty violations array", () => {
    expect(countTabSwitches([])).toBe(0);
  });

  it("should NOT count unrelated violation types", () => {
    const violations = [{ type: "FACE_ABSENT" }, { type: "MULTIPLE_PERSONS" }];
    expect(countTabSwitches(violations)).toBe(0);
    expect(shouldAutoSubmitOnTabSwitch(violations)).toBe(false);
  });
});

describe("Telemetry Timing Constraints", () => {
  const getBoundedDelta = (seconds: number): number => {
    return Math.min(Math.max(seconds, 0), 300);
  };

  it("should bound negative deltas to 0", () => {
    expect(getBoundedDelta(-10)).toBe(0);
  });

  it("should preserve valid deltas within 0 and 300", () => {
    expect(getBoundedDelta(45)).toBe(45);
    expect(getBoundedDelta(0)).toBe(0);
    expect(getBoundedDelta(300)).toBe(300);
  });

  it("should cap deltas exceeding 300 to 300", () => {
    expect(getBoundedDelta(301)).toBe(300);
    expect(getBoundedDelta(1000)).toBe(300);
  });
});

describe("Calibration Metadata Mapping & DTO Validation", () => {
  interface QuestionMock {
    prompt: string;
    subject_id: string;
    questionType: "MCQ" | "CODING";
    domain?: "ENGINEERING" | "BUSINESS" | "APTITUDE" | "CORPORATE";
    cognitiveLevel?: "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";
    status?: "ACTIVE" | "UNDER_REVIEW" | "QUARANTINED";
    p_value?: number;
    discrimination_index?: number;
    avg_time_seconds?: number;
    options?: unknown[];
  }

  const validateQuestionDto = (q: QuestionMock): boolean => {
    if (!q.prompt || q.prompt.trim() === "") return false;
    if (!q.subject_id || q.subject_id.trim() === "") return false;
    if (q.questionType === "MCQ") {
      if (!q.options || q.options.length < 2) return false;
    }
    if (q.p_value !== undefined && (q.p_value < 0 || q.p_value > 1)) return false;
    if (q.discrimination_index !== undefined && (q.discrimination_index < -1 || q.discrimination_index > 1)) return false;
    if (q.avg_time_seconds !== undefined && q.avg_time_seconds < 0) return false;
    return true;
  };

  it("should accept valid question calibration mapping and metadata", () => {
    const validMCQ: QuestionMock = {
      prompt: "What is 2+2?",
      subject_id: "math-101",
      questionType: "MCQ",
      domain: "APTITUDE",
      cognitiveLevel: "REMEMBER",
      status: "ACTIVE",
      p_value: 0.85,
      discrimination_index: 0.45,
      avg_time_seconds: 15,
      options: [{ text: "4", isCorrect: true }, { text: "5", isCorrect: false }]
    };
    expect(validateQuestionDto(validMCQ)).toBe(true);
  });

  it("should reject calibration validation if psychometric bounds are invalid", () => {
    const invalidPValue: QuestionMock = {
      prompt: "Q",
      subject_id: "sub-1",
      questionType: "CODING",
      p_value: 1.5 // Invalid, must be <= 1.0
    };
    const invalidDiscrimination: QuestionMock = {
      prompt: "Q",
      subject_id: "sub-1",
      questionType: "CODING",
      discrimination_index: -1.2 // Invalid, must be >= -1.0
    };

    expect(validateQuestionDto(invalidPValue)).toBe(false);
    expect(validateQuestionDto(invalidDiscrimination)).toBe(false);
  });
});


