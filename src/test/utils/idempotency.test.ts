import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hashPayload,
  generateIdempotencyKey,
  createRequestFingerprint,
  getActiveRequestLock,
  setActiveRequestLock,
  releaseActiveRequestLock,
} from "../../lib/idempotency";
import { apiClient } from "../../lib/api-client";

describe("Idempotency Utilities & API Client Protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Unit: hashPayload ───────────────────────────────────────────────────
  describe("hashPayload", () => {
    it("returns identical hashes for structurally equal payloads", () => {
      const a = { amount: 1000, currency: "USD" };
      const b = { amount: 1000, currency: "USD" };
      expect(hashPayload(a)).toBe(hashPayload(b));
    });

    it("returns different hashes for different payloads", () => {
      expect(hashPayload({ amount: 1000 })).not.toBe(hashPayload({ amount: 5000 }));
    });

    it("handles null and undefined without throwing", () => {
      expect(() => hashPayload(null)).not.toThrow();
      expect(() => hashPayload(undefined)).not.toThrow();
      expect(hashPayload(null)).toBe(hashPayload(undefined));
    });
  });

  // ─── Unit: generateIdempotencyKey ────────────────────────────────────────
  describe("generateIdempotencyKey", () => {
    it("generates a key with domain prefix if provided", () => {
      const key = generateIdempotencyKey("test_sub");
      expect(key.startsWith("test_sub_")).toBe(true);
    });

    it("generates a raw uuid when no prefix given", () => {
      const key = generateIdempotencyKey();
      // UUID v4 pattern
      expect(key).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it("generates unique keys on every call (no collisions at scale)", () => {
      const keys = Array.from({ length: 1000 }, () => generateIdempotencyKey("op"));
      const unique = new Set(keys);
      expect(unique.size).toBe(1000);
    });
  });

  // ─── Unit: createRequestFingerprint ─────────────────────────────────────
  describe("createRequestFingerprint", () => {
    it("produces identical fingerprints for identical requests", () => {
      const fp1 = createRequestFingerprint("POST", "/api/submit", { questionId: "q1" });
      const fp2 = createRequestFingerprint("POST", "/api/submit", { questionId: "q1" });
      expect(fp1).toBe(fp2);
    });

    it("produces different fingerprints for different payloads", () => {
      const fp1 = createRequestFingerprint("POST", "/api/submit", { questionId: "q1" });
      const fp2 = createRequestFingerprint("POST", "/api/submit", { questionId: "q2" });
      expect(fp1).not.toBe(fp2);
    });

    it("is case-insensitive for method and URL", () => {
      const upper = createRequestFingerprint("POST", "/API/Submit", {});
      const lower = createRequestFingerprint("post", "/api/submit", {});
      expect(upper).toBe(lower);
    });

    it("ignores query strings in URL normalisation", () => {
      const fp1 = createRequestFingerprint("DELETE", "/api/items/1?confirm=true", null);
      const fp2 = createRequestFingerprint("DELETE", "/api/items/1", null);
      expect(fp1).toBe(fp2);
    });
  });

  // ─── Concurrency: in-flight request deduplication ────────────────────────
  describe("In-flight request lock registry (deduplication)", () => {
    it("returns undefined when no lock is registered", () => {
      const fp = createRequestFingerprint("POST", "/api/test", { id: "x" });
      expect(getActiveRequestLock(fp)).toBeUndefined();
    });

    it("returns the same Promise for concurrent duplicate calls", () => {
      const fp = createRequestFingerprint("POST", "/api/sessions/s1/submit", {});
      const promise = new Promise<void>((resolve) => setTimeout(resolve, 50));

      setActiveRequestLock(fp, promise);

      // Simulate 10 concurrent callers checking for the same in-flight lock
      const results = Array.from({ length: 10 }, () => getActiveRequestLock(fp));
      results.forEach((r) => expect(r).toBe(promise));

      releaseActiveRequestLock(fp);
      expect(getActiveRequestLock(fp)).toBeUndefined();
    });

    it("isolates locks by fingerprint — different endpoints don't collide", () => {
      const fp1 = createRequestFingerprint("POST", "/api/submit", { q: "1" });
      const fp2 = createRequestFingerprint("POST", "/api/submit", { q: "2" });

      const p1 = Promise.resolve("result-1");
      const p2 = Promise.resolve("result-2");

      setActiveRequestLock(fp1, p1);
      setActiveRequestLock(fp2, p2);

      expect(getActiveRequestLock(fp1)).toBe(p1);
      expect(getActiveRequestLock(fp2)).toBe(p2);

      releaseActiveRequestLock(fp1);
      releaseActiveRequestLock(fp2);
    });

    it("simulates double-click: second call finds in-flight lock and reuses it", async () => {
      const fp = createRequestFingerprint("POST", "/api/code/submit", { sessionId: "s1" });

      let resolveFirst!: (v: string) => void;
      const firstCall = new Promise<string>((res) => { resolveFirst = res; });

      // First click registers the lock
      setActiveRequestLock(fp, firstCall);

      // Second click (double-click) detects the lock and reuses the same promise
      const lockForSecondClick = getActiveRequestLock<string>(fp);
      expect(lockForSecondClick).toBe(firstCall);

      // First call resolves
      resolveFirst("done");
      const result = await lockForSecondClick!;
      expect(result).toBe("done");

      releaseActiveRequestLock(fp);
      expect(getActiveRequestLock(fp)).toBeUndefined();
    });
  });

  // ─── Integration: Axios interceptor header injection ─────────────────────
  describe("apiClient Idempotency Interceptor", () => {
    it("auto-attaches Idempotency-Key and X-Idempotency-Key on POST", async () => {
      const interceptors = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => unknown }>;
      };
      const interceptor = interceptors.handlers[0].fulfilled;

      const mockSet = vi.fn();
      const mockGet = vi.fn().mockReturnValue(undefined);
      const mockConfig = {
        method: "POST",
        url: "/api/test-sessions/s123/submit",
        headers: { set: mockSet, get: mockGet },
      };

      interceptor(mockConfig);

      expect(mockSet).toHaveBeenCalledWith("Idempotency-Key", expect.stringMatching(/^op_post_/));
      expect(mockSet).toHaveBeenCalledWith("X-Idempotency-Key", expect.stringMatching(/^op_post_/));
    });

    it("preserves explicitly passed Idempotency-Key header", async () => {
      const interceptors = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => unknown }>;
      };
      const interceptor = interceptors.handlers[0].fulfilled;

      const mockSet = vi.fn();
      const mockGet = vi.fn().mockImplementation((name: string) =>
        name === "Idempotency-Key" ? "custom-key-xyz" : undefined
      );
      const mockConfig = {
        method: "POST",
        url: "/api/test-sessions/s123/submit",
        headers: { set: mockSet, get: mockGet },
      };

      interceptor(mockConfig);

      expect(mockSet).toHaveBeenCalledWith("Idempotency-Key", "custom-key-xyz");
      expect(mockSet).toHaveBeenCalledWith("X-Idempotency-Key", "custom-key-xyz");
    });

    it("does NOT inject Idempotency-Key on GET requests", async () => {
      const interceptors = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => unknown }>;
      };
      const interceptor = interceptors.handlers[0].fulfilled;

      const mockSet = vi.fn();
      const mockGet = vi.fn().mockReturnValue(undefined);
      const mockConfig = {
        method: "GET",
        url: "/api/tests",
        headers: { set: mockSet, get: mockGet },
      };

      interceptor(mockConfig);

      // Should only set Authorization, not Idempotency-Key
      const idempotencyCalls = mockSet.mock.calls.filter(([key]) =>
        key === "Idempotency-Key" || key === "X-Idempotency-Key"
      );
      expect(idempotencyCalls.length).toBe(0);
    });

    it("each concurrent POST gets a unique idempotency key", async () => {
      const interceptors = apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => unknown }>;
      };
      const interceptor = interceptors.handlers[0].fulfilled;

      const keys: string[] = [];

      // Simulate 20 concurrent POST requests
      for (let i = 0; i < 20; i++) {
        const mockSet = vi.fn((_, val) => keys.push(val));
        const mockGet = vi.fn().mockReturnValue(undefined);
        interceptor({ method: "POST", url: `/api/resource/${i}`, headers: { set: mockSet, get: mockGet } });
      }

      // Filter only the Idempotency-Key values (not X-Idempotency-Key)
      const idempotencyKeys = keys.filter((_, idx) => idx % 2 === 0);
      const uniqueKeys = new Set(idempotencyKeys);
      expect(uniqueKeys.size).toBe(20);
    });
  });
});

// ─── Integration: Transport-level deduplication (withDedup wrapper) ─────
// Because `withDedup` wraps `apiClient.post/put/patch/delete`, we can't simply
// vi.spyOn them (that replaces the wrapper). Instead, we test using the lock
// registry directly to verify the wrapper's behavior contract.
describe("apiClient transport-level deduplication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear any lingering locks between tests
    [
      createRequestFingerprint("POST", "/api/dedup-test", { id: "1" }),
      createRequestFingerprint("POST", "/api/dedup-test", { id: "2" }),
    ].forEach(releaseActiveRequestLock);
  });

  it("calling apiClient.post registers a lock for that fingerprint", async () => {
    const fp = createRequestFingerprint("POST", "/api/dedup-test", { id: "1" });
    expect(getActiveRequestLock(fp)).toBeUndefined();

    // Mock the adapter so no real HTTP call fires
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = () => Promise.resolve({ data: {}, status: 200, statusText: "OK", headers: {}, config: {} as any });

    const p = apiClient.post("/api/dedup-test", { id: "1" });

    // While in-flight, the lock should be registered
    expect(getActiveRequestLock(fp)).toBeDefined();

    await p;
    // After settlement, lock is released
    expect(getActiveRequestLock(fp)).toBeUndefined();

    apiClient.defaults.adapter = originalAdapter;
  });

  it("different payloads produce different fingerprints — no false collision", () => {
    const fp1 = createRequestFingerprint("POST", "/api/dedup-test", { id: "1" });
    const fp2 = createRequestFingerprint("POST", "/api/dedup-test", { id: "2" });
    expect(fp1).not.toBe(fp2);
  });

  it("lock releases on error so retries are not permanently blocked", async () => {
    const fp = createRequestFingerprint("POST", "/api/dedup-test", { id: "1" });

    const originalAdapter = apiClient.defaults.adapter;
    let callCount = 0;
    apiClient.defaults.adapter = () => {
      callCount++;
      if (callCount === 1) return Promise.reject({ response: { status: 500 } });
      return Promise.resolve({ data: { ok: true }, status: 200, statusText: "OK", headers: {}, config: {} as any });
    };

    // First call fails
    try { await apiClient.post("/api/dedup-test", { id: "1" }); } catch { /* expected */ }
    expect(getActiveRequestLock(fp)).toBeUndefined(); // lock released

    // Retry goes through
    await apiClient.post("/api/dedup-test", { id: "1" });
    expect(callCount).toBe(2);

    apiClient.defaults.adapter = originalAdapter;
  });

  it("withDedup wrapper is applied — concurrent identical calls share one Promise", () => {
    // Verify the wrapper is in place by checking that setting a lock manually
    // causes the wrapper to return the cached promise instead of calling through
    const fp = createRequestFingerprint("POST", "/api/dedup-test", { id: "1" });
    const cachedPromise = Promise.resolve({ data: "cached" });

    setActiveRequestLock(fp, cachedPromise);

    // The wrapped post should detect the lock and return the cached promise
    const result = apiClient.post("/api/dedup-test", { id: "1" });
    expect(result).toBe(cachedPromise);

    releaseActiveRequestLock(fp);
  });
});

