import { describe, it, expect } from "vitest";
import { canAccessRoute, getRedirectPathForRole } from "../../lib/auth-utils";
import { ROLES } from "../../lib/roles";
import type { UserData } from "../../lib/auth-service";

const makeUser = (role: string): UserData => ({
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role,
  phoneNumber: null,
  organisationData: null,
});

describe("Auth Utils", () => {
  describe("canAccessRoute", () => {
    it("should deny access for null user", () => {
      expect(canAccessRoute(null, [ROLES.ADMIN])).toBe(false);
    });

    it("should allow access when user has a required role", () => {
      const user = makeUser("ADMIN");
      expect(canAccessRoute(user, [ROLES.ADMIN, ROLES.SUPERADMIN])).toBe(true);
    });

    it("should deny access when user lacks required role", () => {
      const user = makeUser("CANDIDATE");
      expect(canAccessRoute(user, [ROLES.ADMIN, ROLES.SUPERADMIN])).toBe(false);
    });

    it("should allow SUPERADMIN access to superadmin-only routes", () => {
      const user = makeUser("SUPERADMIN");
      expect(canAccessRoute(user, [ROLES.SUPERADMIN])).toBe(true);
    });
  });

  describe("getRedirectPathForRole", () => {
    it("should redirect SUPERADMIN to /superadmin", () => {
      expect(getRedirectPathForRole("SUPERADMIN")).toBe("/superadmin");
    });

    it("should redirect ADMIN to /admin", () => {
      expect(getRedirectPathForRole("ADMIN")).toBe("/admin");
    });

    it("should redirect TRAINER to /trainer", () => {
      expect(getRedirectPathForRole("TRAINER")).toBe("/trainer");
    });

    it("should redirect unknown roles to /dashboard", () => {
      expect(getRedirectPathForRole("UNKNOWN")).toBe("/dashboard");
    });
  });
});
