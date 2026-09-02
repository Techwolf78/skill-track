import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCandidateTimer } from "../../hooks/useCandidateTimer";
import { detectTimeExtension, formatSeconds } from "../../lib/exam/sessionLogic";

describe("Candidate Timer & Time Extension Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("detectTimeExtension", () => {
    it("should detect extension when server time is significantly higher than local time", () => {
      // 15 mins (900s) added to current local 1200s -> server is 2100s
      const result = detectTimeExtension(2100, 1200, 10);
      expect(result.extended).toBe(true);
      expect(result.addedMinutes).toBe(15);
    });

    it("should NOT detect extension for normal clock drift or jitter within buffer", () => {
      // Server is 1205s vs local 1200s (5s difference is <= 10s buffer)
      const result = detectTimeExtension(1205, 1200, 10);
      expect(result.extended).toBe(false);
      expect(result.addedMinutes).toBe(0);
    });

    it("should NOT detect extension when server time is less than or equal to local time", () => {
      const result = detectTimeExtension(1100, 1200, 10);
      expect(result.extended).toBe(false);
      expect(result.addedMinutes).toBe(0);
    });

    it("should handle boundary values and invalid inputs gracefully", () => {
      expect(detectTimeExtension(NaN, 1200).extended).toBe(false);
      expect(detectTimeExtension(1200, NaN).extended).toBe(false);
      expect(detectTimeExtension(-10, 100).extended).toBe(false);
    });
  });

  describe("formatSeconds", () => {
    it("should format seconds to spaced HH : MM : SS string", () => {
      expect(formatSeconds(3665, true)).toBe("01 : 01 : 05");
      expect(formatSeconds(90, true)).toBe("00 : 01 : 30");
      expect(formatSeconds(0, true)).toBe("00 : 00 : 00");
    });

    it("should format seconds to compact HH:MM:SS string", () => {
      expect(formatSeconds(3665, false)).toBe("01:01:05");
      expect(formatSeconds(5400, false)).toBe("01:30:00");
    });

    it("should clamp negative seconds to 00 : 00 : 00", () => {
      expect(formatSeconds(-50, true)).toBe("00 : 00 : 00");
    });
  });

  describe("useCandidateTimer Hook", () => {
    it("should initialize with initialRemainingSecs and count down 1s per tick", () => {
      const { result } = renderHook(() =>
        useCandidateTimer({
          initialRemainingSecs: 100,
          enableAutoSync: false,
        })
      );

      expect(result.current.remainingSecs).toBe(100);
      expect(result.current.formattedTime).toBe("00 : 01 : 40");

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.remainingSecs).toBe(97);
      expect(result.current.formattedTime).toBe("00 : 01 : 37");
    });

    it("should trigger onExpire and clamp to 0 when countdown completes", () => {
      const onExpireMock = vi.fn();
      const { result } = renderHook(() =>
        useCandidateTimer({
          initialRemainingSecs: 2,
          onExpire: onExpireMock,
          enableAutoSync: false,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.remainingSecs).toBe(0);
      expect(result.current.isExpired).toBe(true);
      expect(onExpireMock).toHaveBeenCalledTimes(1);
    });

    it("should detect time extension in handleHeartbeatResponse and set notice", () => {
      const { result } = renderHook(() =>
        useCandidateTimer({
          initialRemainingSecs: 600, // 10 minutes
          enableAutoSync: false,
        })
      );

      // Advance 60s -> local remaining is 540s
      act(() => {
        vi.advanceTimersByTime(60000);
      });
      expect(result.current.remainingSecs).toBe(540);

      // Server heartbeat returns 1440s (15 mins added -> 540 + 900 = 1440)
      act(() => {
        result.current.handleHeartbeatResponse({
          timerRemainingSecs: 1440,
        });
      });

      expect(result.current.remainingSecs).toBe(1440);
      expect(result.current.timeAddedNotice).toBe("+15 mins added by administrator");

      // Notice should auto-clear after 8 seconds
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(result.current.timeAddedNotice).toBeNull();
    });

    it("should handle alternative payload key names (remainingSeconds / remainingTimeSecs)", () => {
      const { result } = renderHook(() =>
        useCandidateTimer({
          initialRemainingSecs: 300,
          enableAutoSync: false,
        })
      );

      act(() => {
        result.current.handleHeartbeatResponse({
          remainingSeconds: 900,
        });
      });

      expect(result.current.remainingSecs).toBe(900);
      expect(result.current.timeAddedNotice).toBe("+10 mins added by administrator");
    });

    it("should reconcile without false extension notice when server returns slightly lower or same time", () => {
      const { result } = renderHook(() =>
        useCandidateTimer({
          initialRemainingSecs: 600,
          enableAutoSync: false,
        })
      );

      act(() => {
        result.current.handleHeartbeatResponse({
          timerRemainingSecs: 595,
        });
      });

      expect(result.current.remainingSecs).toBe(595);
      expect(result.current.timeAddedNotice).toBeNull();
    });
  });
});
