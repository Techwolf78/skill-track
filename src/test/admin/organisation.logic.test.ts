import { describe, it, expect } from "vitest";
import {
  isValidOrgPayload,
  buildCreateOrgPayload,
  sortOrgsByName,
  type Organisation,
} from "../../lib/admin/organisationLogic";

describe("Organisation Management Logic", () => {
  describe("isValidOrgPayload", () => {
    it("should return true for valid organisation name", () => {
      expect(isValidOrgPayload({ name: "TechCorp" })).toBe(true);
    });

    it("should return false for empty name", () => {
      expect(isValidOrgPayload({ name: "" })).toBe(false);
    });

    it("should return false for blank name", () => {
      expect(isValidOrgPayload({ name: "   " })).toBe(false);
    });

    it("should return false when name is missing", () => {
      expect(isValidOrgPayload({})).toBe(false);
    });
  });

  describe("buildCreateOrgPayload", () => {
    it("should trim whitespace from name", () => {
      const payload = buildCreateOrgPayload("  Acme Corp  ");
      expect(payload.name).toBe("Acme Corp");
    });

    it("should include logoUrl when provided", () => {
      const payload = buildCreateOrgPayload("Acme", "https://acme.com/logo.png");
      expect(payload.logoUrl).toBe("https://acme.com/logo.png");
    });

    it("should omit logoUrl when not provided", () => {
      const payload = buildCreateOrgPayload("Acme");
      expect(payload).not.toHaveProperty("logoUrl");
    });
  });

  describe("sortOrgsByName", () => {
    it("should sort organisations alphabetically", () => {
      const orgs: Organisation[] = [
        { id: "1", name: "Zebra Corp" },
        { id: "2", name: "Acme Inc" },
        { id: "3", name: "MegaCo" },
      ];
      const sorted = sortOrgsByName(orgs);
      expect(sorted[0].name).toBe("Acme Inc");
      expect(sorted[2].name).toBe("Zebra Corp");
    });

    it("should not mutate the original array", () => {
      const orgs: Organisation[] = [{ id: "1", name: "B" }, { id: "2", name: "A" }];
      sortOrgsByName(orgs);
      expect(orgs[0].name).toBe("B");
    });
  });
});
