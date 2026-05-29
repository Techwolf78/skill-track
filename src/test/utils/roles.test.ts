import { describe, it, expect } from "vitest";
import { ROLES, hasRole, hasAnyRole, canAccessSuperAdmin, canAccessAdmin, canAccessAdminOrSuperAdmin, canMutateTaxonomy } from "../../lib/roles";

describe("Roles Utility", () => {
  describe("hasRole", () => {
    it("should return true when role matches required role", () => {
      expect(hasRole("ADMIN", ROLES.ADMIN)).toBe(true);
    });

    it("should return false when role does not match required role", () => {
      expect(hasRole("TRAINER", ROLES.ADMIN)).toBe(false);
    });

    it("should handle undefined user role safely", () => {
      expect(hasRole(undefined, ROLES.ADMIN)).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("should return true if role is within target list", () => {
      expect(hasAnyRole("SUPERADMIN", [ROLES.ADMIN, ROLES.SUPERADMIN])).toBe(true);
    });

    it("should return false if role is outside target list", () => {
      expect(hasAnyRole("CANDIDATE", [ROLES.ADMIN, ROLES.SUPERADMIN])).toBe(false);
    });

    it("should handle undefined role safely", () => {
      expect(hasAnyRole(undefined, [ROLES.ADMIN])).toBe(false);
    });
  });

  describe("Role Permission Helpers", () => {
    it("canAccessSuperAdmin should only permit SUPERADMIN", () => {
      expect(canAccessSuperAdmin("SUPERADMIN")).toBe(true);
      expect(canAccessSuperAdmin("ADMIN")).toBe(false);
    });

    it("canAccessAdmin should only permit ADMIN", () => {
      expect(canAccessAdmin("ADMIN")).toBe(true);
      expect(canAccessAdmin("SUPERADMIN")).toBe(false);
    });

    it("canAccessAdminOrSuperAdmin should permit ADMIN and SUPERADMIN", () => {
      expect(canAccessAdminOrSuperAdmin("ADMIN")).toBe(true);
      expect(canAccessAdminOrSuperAdmin("SUPERADMIN")).toBe(true);
      expect(canAccessAdminOrSuperAdmin("CANDIDATE")).toBe(false);
    });

    it("canMutateTaxonomy should only permit SUPERADMIN", () => {
      expect(canMutateTaxonomy("SUPERADMIN")).toBe(true);
      expect(canMutateTaxonomy("ADMIN")).toBe(false);
    });
  });
});
