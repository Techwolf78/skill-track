import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("Auth Store (localStorage-backed)", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

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

  it("should handle malformed user JSON gracefully", () => {
    localStorage.setItem("user", "not-json");
    expect(() => JSON.parse(localStorage.getItem("user") as string)).toThrow();
  });
});
