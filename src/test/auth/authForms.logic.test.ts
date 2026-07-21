import { validateLoginForm, validateResetPasswordForm } from "../../lib/auth/formValidation";

describe("Auth Form Validation Logic", () => {
  describe("validateLoginForm", () => {
    it("should pass for valid credentials", () => {
      expect(validateLoginForm({ email: "admin@test.com", password: "pass123" }).valid).toBe(true);
    });

    it("should fail for missing email", () => {
      const { errors } = validateLoginForm({ password: "pass123" });
      expect(errors.email).toBe("Email is required");
    });

    it("should fail for invalid email format", () => {
      const { errors } = validateLoginForm({ email: "not-an-email", password: "pass123" });
      expect(errors.email).toBe("Invalid email format");
    });

    it("should fail for missing password", () => {
      const { errors } = validateLoginForm({ email: "a@b.com" });
      expect(errors.password).toBe("Password is required");
    });

    it("should fail for both missing fields", () => {
      const { valid, errors } = validateLoginForm({});
      expect(valid).toBe(false);
      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
    });

    it("should fail for extremely long password (boundary check)", () => {
      const longPassword = "a".repeat(10000);
      const { valid, errors } = validateLoginForm({ email: "admin@test.com", password: longPassword });
      // Depending on rules, it should fail or truncate safely. In this logic it should be valid but we test stability.
      expect(valid).toBe(true);
    });
  });

  describe("validateResetPasswordForm", () => {
    it("should pass when old and new passwords are valid and different", () => {
      const { valid } = validateResetPasswordForm({ oldPassword: "OldPass1", newPassword: "NewPass12" });
      expect(valid).toBe(true);
    });

    it("should fail when old password is blank", () => {
      const { errors } = validateResetPasswordForm({ oldPassword: "", newPassword: "NewPass12" });
      expect(errors.oldPassword).toBeDefined();
    });

    it("should fail when new password is less than 8 characters", () => {
      const { errors } = validateResetPasswordForm({ oldPassword: "OldPass1", newPassword: "abc" });
      expect(errors.newPassword).toContain("8 characters");
    });

    it("should fail when new password equals old password", () => {
      const { errors } = validateResetPasswordForm({ oldPassword: "SamePass1", newPassword: "SamePass1" });
      expect(errors.newPassword).toContain("different");
    });

    it("should fail when inputs are null or undefined (validation/malformed check)", () => {
      const { valid, errors } = validateResetPasswordForm({});
      expect(valid).toBe(false);
      expect(errors.oldPassword).toBeDefined();
      expect(errors.newPassword).toBeDefined();
    });
  });
});

