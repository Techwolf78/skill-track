import { describe, it, expect, vi, beforeEach } from "vitest";
import { logService } from "../../lib/log-service";
import { apiClient } from "../../lib/api-client";

describe("logService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllLogs", () => {
    it("should fetch all logs as plain text from the /logs endpoint", async () => {
      const mockLogs = "INFO: Application started\nWARN: High memory usage";
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        data: mockLogs,
      });

      const result = await logService.getAllLogs();

      expect(getSpy).toHaveBeenCalledWith("/logs", {
        responseType: "text",
      });
      expect(result).toBe(mockLogs);
    });

    it("should propagate errors from the apiClient", async () => {
      const mockError = new Error("Network Error");
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(mockError);

      await expect(logService.getAllLogs()).rejects.toThrow("Network Error");
    });
  });

  describe("getLogsByLevel", () => {
    it("should fetch logs filtered by level from /logs/level/{level} endpoint", async () => {
      const mockErrorLogs = "ERROR: Connection failed\nERROR: Out of memory";
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        data: mockErrorLogs,
      });

      const result = await logService.getLogsByLevel("ERROR");

      expect(getSpy).toHaveBeenCalledWith("/logs/level/ERROR", {
        responseType: "text",
      });
      expect(result).toBe(mockErrorLogs);
    });

    it("should propagate errors from the apiClient on filtered log request", async () => {
      const mockError = new Error("Access Denied");
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(mockError);

      await expect(logService.getLogsByLevel("INFO")).rejects.toThrow("Access Denied");
    });
  });
});
