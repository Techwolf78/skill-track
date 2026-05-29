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
