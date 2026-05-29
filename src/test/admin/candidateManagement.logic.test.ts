import { describe, it, expect } from "vitest";
import {
  isValidCandidatePayload,
  maskEmail,
  buildBulkUploadSummary,
} from "../../lib/admin/candidateLogic";

describe("Candidate Management Logic", () => {
  describe("isValidCandidatePayload", () => {
    it("should pass for a fully valid payload", () => {
      const { valid } = isValidCandidatePayload({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "Secure123",
        organisationId: "org-uuid-1",
      });
      expect(valid).toBe(true);
    });

    it("should fail for missing name", () => {
      const { valid, errors } = isValidCandidatePayload({ email: "a@b.com", password: "Secure123", organisationId: "o1" });
      expect(valid).toBe(false);
      expect(errors).toContain("Name is required");
    });

    it("should fail for invalid email format", () => {
      const { valid, errors } = isValidCandidatePayload({ name: "Jane", email: "not-an-email", password: "Secure123", organisationId: "o1" });
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("email"))).toBe(true);
    });

    it("should fail for password shorter than 8 chars", () => {
      const { valid, errors } = isValidCandidatePayload({ name: "Jane", email: "j@b.com", password: "abc", organisationId: "o1" });
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes("8 characters"))).toBe(true);
    });

    it("should fail for missing organisationId", () => {
      const { valid, errors } = isValidCandidatePayload({ name: "Jane", email: "j@b.com", password: "Secure123" });
      expect(valid).toBe(false);
      expect(errors).toContain("Organisation ID is required");
    });

    it("should collect all errors at once", () => {
      const { errors } = isValidCandidatePayload({});
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe("maskEmail", () => {
    it("should mask middle characters of the local part", () => {
      // "jane.doe" = 8 chars → first + 6 asterisks + last
      expect(maskEmail("jane.doe@example.com")).toBe("j******e@example.com");
    });

    it("should handle short local part (≤ 2 chars) without masking", () => {
      expect(maskEmail("ab@test.com")).toBe("ab@test.com");
    });
  });

  describe("buildBulkUploadSummary", () => {
    it("should correctly count successes and failures", () => {
      const results = [
        { status: "success" as const },
        { status: "success" as const },
        { status: "failed" as const },
      ];
      const summary = buildBulkUploadSummary(results);
      expect(summary.total).toBe(3);
      expect(summary.success).toBe(2);
      expect(summary.failed).toBe(1);
    });

    it("should return zeros for empty results", () => {
      expect(buildBulkUploadSummary([]).total).toBe(0);
    });
  });
});
