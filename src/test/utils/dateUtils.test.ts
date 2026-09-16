import { describe, it, expect } from "vitest";
import { toBackendDateTime, parseBackendDateTime } from "@/lib/date-utils";

describe("date-utils", () => {
  describe("toBackendDateTime", () => {
    it("handles datetime-local format without seconds (e.g. from input type=datetime-local)", () => {
      const result = toBackendDateTime("2028-09-13T14:45");
      expect(result).toBe("2028-09-13T14:45:00");
    });

    it("handles datetime-local format with seconds", () => {
      const result = toBackendDateTime("2028-09-13T14:45:30");
      expect(result).toBe("2028-09-13T14:45:30");
    });

    it("handles separate date and time arguments", () => {
      const result = toBackendDateTime("2028-09-13", "14:45");
      expect(result).toBe("2028-09-13T14:45:00");
    });

    it("handles separate date without time argument", () => {
      const result = toBackendDateTime("2028-09-13");
      expect(result).toBe("2028-09-13T00:00:00");
    });

    it("handles ISO strings with trailing Z", () => {
      const result = toBackendDateTime("2028-09-13T14:45:00Z");
      expect(result).toBe("2028-09-13T14:45:00");
    });

    it("returns empty string for empty input", () => {
      expect(toBackendDateTime("")).toBe("");
    });
  });

  describe("parseBackendDateTime", () => {
    it("parses ISO datetime into date and time parts", () => {
      const parsed = parseBackendDateTime("2028-09-13T14:45:00");
      expect(parsed).toEqual({ date: "2028-09-13", time: "14:45" });
    });
  });
});
