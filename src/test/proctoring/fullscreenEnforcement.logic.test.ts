import { describe, it, expect } from "vitest";
import {
  computeFullscreenPolicy,
  tickFullscreenTimer,
  resetFullscreenTimer,
  FULLSCREEN_GRACE_PERIOD,
} from "../../lib/proctoring/fullscreenLogic";

describe("Fullscreen Enforcement Logic", () => {
  describe("computeFullscreenPolicy", () => {
    it("should return 'ok' when proctoring is inactive", () => {
      expect(computeFullscreenPolicy({ isProctoringActive: false, isFullscreen: false, fullscreenTimer: 5 })).toBe("ok");
    });

    it("should return 'ok' when user is in fullscreen", () => {
      expect(computeFullscreenPolicy({ isProctoringActive: true, isFullscreen: true, fullscreenTimer: 10 })).toBe("ok");
    });

    it("should return 'warn' when proctoring active and not fullscreen with time remaining", () => {
      expect(computeFullscreenPolicy({ isProctoringActive: true, isFullscreen: false, fullscreenTimer: 5 })).toBe("warn");
    });

    it("should return 'auto-submit' when timer reaches 0 and not in fullscreen", () => {
      expect(computeFullscreenPolicy({ isProctoringActive: true, isFullscreen: false, fullscreenTimer: 0 })).toBe("auto-submit");
    });
  });

  describe("tickFullscreenTimer", () => {
    it("should decrement timer by 1 on normal tick", () => {
      const result = tickFullscreenTimer(5);
      expect(result.next).toBe(4);
      expect(result.action).toBe("tick");
    });

    it("should trigger 'warn' action on first tick from grace period start", () => {
      const result = tickFullscreenTimer(10);
      expect(result.action).toBe("warn");
    });

    it("should trigger 'auto-submit' when timer hits 1 (last second)", () => {
      const result = tickFullscreenTimer(1);
      expect(result.next).toBe(0);
      expect(result.action).toBe("auto-submit");
    });
  });

  describe("resetFullscreenTimer", () => {
    it("should reset timer back to grace period", () => {
      expect(resetFullscreenTimer()).toBe(FULLSCREEN_GRACE_PERIOD);
    });
  });
});
