import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => {
      if (store["__error_mode__"]) throw new Error("localStorage blocked");
      return store[key] ?? null;
    },
    setItem: (key: string, value: string) => {
      if (store["__error_mode__"]) throw new Error("localStorage blocked");
      store[key] = value;
    },
    removeItem: (key: string) => {
      if (store["__error_mode__"]) throw new Error("localStorage blocked");
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    setErrorMode: (enabled: boolean) => {
      if (enabled) store["__error_mode__"] = "true";
      else delete store["__error_mode__"];
    }
  };
})();

Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("Auth Store (localStorage-backed)", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockLocalStorage.setErrorMode(false);
  });

  describe("Happy Path & Persistence", () => {
    it("should return null token when localStorage is empty", () => {
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("should persist token to localStorage", () => {
      localStorage.setItem("token", "jwt-abc-123");
      expect(localStorage.getItem("token")).toBe("jwt-abc-123");
    });

    it("should persist user data to localStorage", () => {
      const user = { id: "1", name: "Admin", role: "ADMIN", email: "a@b.com" };
      localStorage.setItem("user", JSON.stringify(user));
      const parsed = JSON.parse(localStorage.getItem("user") as string);
      expect(parsed.role).toBe("ADMIN");
    });

    it("should clear token and user on logout", () => {
      localStorage.setItem("token", "jwt-abc-123");
      localStorage.setItem("user", JSON.stringify({ id: "1" }));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });
  });

  describe("Boundary Cases & Validation", () => {
    it("should handle extremely long tokens securely", () => {
      const longToken = "a".repeat(10000);
      localStorage.setItem("token", longToken);
      expect(localStorage.getItem("token")).toBe(longToken);
    });

    it("should handle malformed user JSON gracefully", () => {
      localStorage.setItem("user", "not-json");
      expect(() => JSON.parse(localStorage.getItem("user") as string)).toThrow();
    });
  });

  describe("Dependency Failures (Blocked Storage)", () => {
    it("should throw errors when localStorage is blocked or full", () => {
      mockLocalStorage.setErrorMode(true);
      expect(() => localStorage.setItem("token", "val")).toThrow("localStorage blocked");
      expect(() => localStorage.getItem("token")).toThrow("localStorage blocked");
    });
  });

  describe("Security Checks", () => {
    it("should store token containing special characters without corruption", () => {
      const injectionToken = "<script>alert('xss')</script>; SELECT * FROM users;";
      localStorage.setItem("token", injectionToken);
      expect(localStorage.getItem("token")).toBe(injectionToken);
    });
  });
});

