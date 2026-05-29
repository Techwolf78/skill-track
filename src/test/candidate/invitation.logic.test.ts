import { describe, it, expect } from "vitest";
import {
  isInvitationUsable,
  getInvitationErrorMessage,
  buildStartSessionPayload,
  isValidUUID,
} from "../../lib/exam/invitationLogic";

describe("Candidate Invitation Logic", () => {
  describe("isInvitationUsable", () => {
    it("should return true for PENDING invitations", () => {
      expect(isInvitationUsable("PENDING")).toBe(true);
    });

    it("should return false for ACCEPTED invitations", () => {
      expect(isInvitationUsable("ACCEPTED")).toBe(false);
    });

    it("should return false for EXPIRED invitations", () => {
      expect(isInvitationUsable("EXPIRED")).toBe(false);
    });

    it("should return false for CANCELLED invitations", () => {
      expect(isInvitationUsable("CANCELLED")).toBe(false);
    });
  });

  describe("getInvitationErrorMessage", () => {
    it("should return null for PENDING (usable) invitations", () => {
      expect(getInvitationErrorMessage("PENDING")).toBeNull();
    });

    it("should return correct message for ACCEPTED status", () => {
      expect(getInvitationErrorMessage("ACCEPTED")).toContain("already been used");
    });

    it("should return correct message for EXPIRED status", () => {
      expect(getInvitationErrorMessage("EXPIRED")).toContain("expired");
    });

    it("should return correct message for CANCELLED status", () => {
      expect(getInvitationErrorMessage("CANCELLED")).toContain("cancelled");
    });
  });

  describe("buildStartSessionPayload", () => {
    it("should produce the correct payload shape", () => {
      const payload = buildStartSessionPayload("inv-uuid-1", "192.168.1.1");
      expect(payload.invitationId).toBe("inv-uuid-1");
      expect(payload.ipAddress).toBe("192.168.1.1");
    });
  });

  describe("isValidUUID", () => {
    it("should accept a valid UUID v4", () => {
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("should reject an empty string", () => {
      expect(isValidUUID("")).toBe(false);
    });

    it("should reject a non-UUID token string", () => {
      expect(isValidUUID("my-invite-token-abc")).toBe(false);
    });
  });
});
