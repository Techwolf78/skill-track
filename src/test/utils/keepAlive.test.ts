import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initKeepAlive } from "../../lib/keep-alive";
import { apiClient } from "../../lib/api-client";

// Mock the apiClient
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe("initKeepAlive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Reset global state
    delete (window as unknown as Record<string, unknown>).__KEEP_ALIVE_STARTED__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should not start duplicate keep-alive schedulers", () => {
    const consoleSpy = vi.spyOn(console, "log");

    initKeepAlive();
    expect((window as unknown as Record<string, unknown>).__KEEP_ALIVE_STARTED__).toBe(true);

    // Call again
    initKeepAlive();
    // The second call should return early without printing initialization message again
    expect(consoleSpy).toHaveBeenCalledTimes(1); // Only called once because the second call returns early
  });

  it("should execute the initial bootstrap ping after 1 second", async () => {
    initKeepAlive();

    // Fast-forward by 1 second (1000ms)
    await vi.advanceTimersByTimeAsync(1000);

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("/subjects?_cb=bootstrap-")
    );
  });

  it("should schedule recurring random pings using setTimeout recursively", async () => {
    initKeepAlive();

    // Bootstrap runs after 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Fast-forward by another 15 minutes (max delay in keep-alive scheduler: 15 * 60 * 1000 = 900,000ms)
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    // Expect at least one periodic ping to have run
    const totalCalls = vi.mocked(apiClient.get).mock.calls.length + vi.mocked(apiClient.post).mock.calls.length;
    expect(totalCalls).toBeGreaterThanOrEqual(2);
  });

  it("should send post request for auth and validation endpoints", async () => {
    // Override endpoints temporarily to force choosing an auth endpoint
    // We can spy on Math.random to return a index pointing to auth endpoint
    // In KEEP_ALIVE_ENDPOINTS, "/auth/login" is near the end.
    // Let's force Math.random to return an index corresponding to /auth/login (index 63 in list)
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.999);

    initKeepAlive();
    // Run bootstrap
    await vi.advanceTimersByTimeAsync(1000);
    // Run next scheduled random ping
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.stringContaining("/candidate-invitations/validate"),
      expect.any(Object),
      expect.objectContaining({
        headers: { "X-Keep-Alive": "true" },
      })
    );

    randomSpy.mockRestore();
  });
});
