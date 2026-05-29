import { describe, it, expect } from "vitest";
import { LANGUAGE_MAP, resolveStarterCode, getAvailableLanguages } from "../../lib/exam/languageMap";

describe("Code Editor Language Logic", () => {
  describe("resolveStarterCode", () => {
    it("should return code for requested language", () => {
      const template = { python3: { code: "def solution():\n  pass", language: "python3" } };
      expect(resolveStarterCode(template, "python3")).toBe("def solution():\n  pass");
    });

    it("should fallback to first language if requested is absent", () => {
      const template = { java: { code: "public class Main {}", language: "java" } };
      expect(resolveStarterCode(template, "python3")).toBe("public class Main {}");
    });

    it("should return null when template is undefined", () => {
      expect(resolveStarterCode(undefined, "python3")).toBeNull();
    });

    it("should return null when template is empty", () => {
      expect(resolveStarterCode({}, "python3")).toBeNull();
    });
  });

  describe("getAvailableLanguages", () => {
    it("should return template keys when template is provided", () => {
      const template = {
        python3: { code: "", language: "python3" },
        java: { code: "", language: "java" },
      };
      const langs = getAvailableLanguages(template);
      expect(langs).toContain("python3");
      expect(langs).toContain("java");
    });

    it("should return all 4 defaults when no template is provided", () => {
      const langs = getAvailableLanguages(undefined);
      expect(langs.length).toBe(4);
    });
  });

  describe("LANGUAGE_MAP", () => {
    it("should have correct slug for python3", () => {
      expect(LANGUAGE_MAP.python3.slug).toBe("python3");
    });

    it("should have correct monaco id for cpp", () => {
      expect(LANGUAGE_MAP.cpp.monaco).toBe("cpp");
    });

    it("should have human-readable name for javascript", () => {
      expect(LANGUAGE_MAP.javascript.name).toBe("JavaScript");
    });
  });
});
