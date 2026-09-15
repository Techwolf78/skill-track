import { describe, it, expect, vi } from "vitest";
import { initKeepAlive } from "../../lib/keep-alive";
import { apiClient } from "../../lib/api-client";

// Mock the apiClient
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe("initKeepAlive (Disabled)", () => {
  it("should be a safe no-op and not make background network requests", () => {
    initKeepAlive();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

