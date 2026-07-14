import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testService, CodeExecutionTimeoutError } from "../../lib/test-service";
import { apiClient } from "../../lib/api-client";
import { BaseResponse } from "../../lib/auth-service";

// Mock the apiClient dependency
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("testService.executeCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const payload = {
    sessionId: "session-123",
    questionId: "question-456",
    language: "python3",
    sourceCode: "print('hello')",
  };

  it("should successfully execute code and poll until 200 OK with results", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 202,
      data: { success: true, message: "Accepted", data: "run-group-uuid-1" },
    });

    // Mock first poll: 202 Accepted, data: null (still running)
    // Mock second poll: 200 OK, data: results
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        status: 202,
        data: { success: true, message: "Running", data: null },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          message: "Success",
          data: [
            {
              testCaseId: "tc-1",
              status: "ACCEPTED",
              stdout: "result",
              stderr: "",
              compileOutput: "",
              execTimeMs: 120,
              expectedOutput: "result",
            },
            {
              testCaseId: "tc-2",
              status: "WRONG_ANSWER",
              stdout: "wrong",
              stderr: "",
              compileOutput: "",
              execTimeMs: 80,
              expectedOutput: "result",
            },
          ],
        },
      });

    const executePromise = testService.executeCode(payload);

    // Initial delay is 300ms
    await vi.advanceTimersByTimeAsync(300);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/code/execute/run/run-group-uuid-1");

    // Second poll delay is 300 * 2 = 600ms
    await vi.advanceTimersByTimeAsync(600);
    expect(apiClient.get).toHaveBeenCalledTimes(2);

    const results = await executePromise;

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      testCaseId: "tc-1",
      status: "ACCEPTED",
      stdout: "result",
      stderr: "",
      compileOutput: "",
      execTimeMs: 120,
      expectedOutput: "result",
      passed: true,
    });
    expect(results[1]).toEqual({
      testCaseId: "tc-2",
      status: "WRONG_ANSWER",
      stdout: "wrong",
      stderr: "",
      compileOutput: "",
      execTimeMs: 80,
      expectedOutput: "result",
      passed: false,
    });
  });

  it("should resolve normally with passed: false when poll returns 200 OK with status: 'ERROR'", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 202,
      data: { success: true, message: "Accepted", data: "run-group-uuid-2" },
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        message: "Completed with Error",
        data: [
          {
            testCaseId: "tc-1",
            status: "ERROR",
            stdout: null,
            stderr: "fatal error",
            compileOutput: null,
            execTimeMs: 0,
            expectedOutput: "result",
          },
        ],
      },
    });

    const executePromise = testService.executeCode(payload);
    await vi.advanceTimersByTimeAsync(300);

    const results = await executePromise;
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("ERROR");
    expect(results[0].passed).toBe(false);
  });

  it("should throw a transport-level error if apiClient.post fails", async () => {
    const error500 = new Error("Request failed with status code 500");
    vi.mocked(apiClient.post).mockRejectedValue(error500);

    await expect(testService.executeCode(payload)).rejects.toThrow(error500);
  });

  it("should throw a transport-level error if apiClient.get fails during polling", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 202,
      data: { success: true, message: "Accepted", data: "run-group-uuid-3" },
    });

    const networkError = new Error("Network Error");
    vi.mocked(apiClient.get).mockRejectedValue(networkError);

    const executePromise = testService.executeCode(payload);
    executePromise.catch(() => {});
    await vi.advanceTimersByTimeAsync(300);

    await expect(executePromise).rejects.toThrow(networkError);
  });

  it("should throw CodeExecutionTimeoutError if polling exceeds 30 seconds", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 202,
      data: { success: true, data: "run-group-uuid-4" },
    });

    // Keep returning 202 Accepted (still running)
    vi.mocked(apiClient.get).mockResolvedValue({
      status: 202,
      data: { success: true, data: null },
    });

    const executePromise = testService.executeCode(payload);
    executePromise.catch(() => {});

    // We advance the timers past the 30 seconds threshold.
    // Progression of delays: 300 -> 600 -> 1200 -> 2000 -> 2000 -> ...
    await vi.advanceTimersByTimeAsync(31000);

    await expect(executePromise).rejects.toThrow(CodeExecutionTimeoutError);
    await expect(executePromise).rejects.toThrow("Code execution timed out. Please try running your code again.");
  });

  it("should apply exponential backoff capped at 2000ms and sequential awaits", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 202,
      data: { success: true, data: "run-group-uuid-5" },
    });

    let pollCount = 0;
    vi.mocked(apiClient.get).mockImplementation(async () => {
      pollCount++;
      return {
        status: 202,
        data: { success: true, data: null },
      };
    });

    const executePromise = testService.executeCode(payload);

    // Initial Delay: 300ms
    await vi.advanceTimersByTimeAsync(300);
    expect(pollCount).toBe(1);

    // 2nd Delay: 600ms (doubled)
    await vi.advanceTimersByTimeAsync(600);
    expect(pollCount).toBe(2);

    // 3rd Delay: 1200ms (doubled)
    await vi.advanceTimersByTimeAsync(1200);
    expect(pollCount).toBe(3);

    // 4th Delay: 2000ms (doubled to 2400, capped at 2000)
    await vi.advanceTimersByTimeAsync(2000);
    expect(pollCount).toBe(4);

    // 5th Delay: 2000ms (capped at 2000)
    await vi.advanceTimersByTimeAsync(2000);
    expect(pollCount).toBe(5);

    // 6th Delay: 2000ms (capped at 2000)
    await vi.advanceTimersByTimeAsync(2000);
    expect(pollCount).toBe(6);
  });
});
