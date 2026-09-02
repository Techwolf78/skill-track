import { describe, it, expect, vi, beforeEach } from "vitest";
import { testService, TestSession } from "../../lib/test-service";
import { apiClient } from "../../lib/api-client";

describe("Admin Individual Time Extension", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("testService.extendTime", () => {
    it("should call POST /test-sessions/{sessionId}/extend-time with minutes payload", async () => {
      const mockResponseSession: TestSession = {
        id: "sess-12345",
        testId: "test-abc",
        candidateId: "cand-xyz",
        status: "ACTIVE",
        startedAt: "2026-09-02T11:45:00Z",
        expiresAt: "2026-09-02T13:15:00Z",
        timerRemainingSecs: 3600,
        remainingSeconds: 3600,
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: mockResponseSession,
          message: null,
        },
      } as unknown as import("axios").AxiosResponse);

      const result = await testService.extendTime("sess-12345", 15);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith("/test-sessions/sess-12345/extend-time", {
        minutes: 15,
      });
      expect(result.id).toBe("sess-12345");
      expect(result.timerRemainingSecs).toBe(3600);
      expect(result.status).toBe("ACTIVE");
    });

    it("should propagate backend error when extension request fails", async () => {
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        new Error("Candidate session has already ended")
      );

      await expect(testService.extendTime("sess-ended", 30)).rejects.toThrow(
        "Candidate session has already ended"
      );
    });
  });

  describe("Time Extension Bounds Validation", () => {
    const validateMinutes = (mins: number): { valid: boolean; error?: string } => {
      if (!mins || isNaN(mins) || mins < 1 || mins > 180) {
        return { valid: false, error: "Please specify a duration between 1 and 180 minutes." };
      }
      return { valid: true };
    };

    it("should accept valid minute presets (5, 10, 15, 30, 45, 60)", () => {
      const presets = [5, 10, 15, 30, 45, 60];
      presets.forEach((p) => {
        expect(validateMinutes(p).valid).toBe(true);
      });
    });

    it("should accept valid custom minutes within 1-180 range", () => {
      expect(validateMinutes(1).valid).toBe(true);
      expect(validateMinutes(180).valid).toBe(true);
      expect(validateMinutes(25).valid).toBe(true);
    });

    it("should reject minutes below 1, above 180, or NaN", () => {
      expect(validateMinutes(0).valid).toBe(false);
      expect(validateMinutes(-15).valid).toBe(false);
      expect(validateMinutes(181).valid).toBe(false);
      expect(validateMinutes(NaN).valid).toBe(false);
    });
  });
});
