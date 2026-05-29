/**
 * Candidate invitation validation and session start helpers.
 * Used by the TestAccess gateway page.
 */

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

/** Returns true only for PENDING invitations (the only usable state). */
export const isInvitationUsable = (status: InvitationStatus): boolean =>
  status === "PENDING";

/** Returns a user-friendly error message for non-usable invitation statuses. */
export const getInvitationErrorMessage = (status: InvitationStatus): string | null => {
  if (status === "ACCEPTED") return "This invitation has already been used.";
  if (status === "EXPIRED") return "This invitation link has expired. Please contact your administrator.";
  if (status === "CANCELLED") return "This invitation has been cancelled.";
  return null;
};

/** Builds the payload for the POST /test-sessions/start endpoint. */
export const buildStartSessionPayload = (invitationId: string, ipAddress: string) => ({
  invitationId,
  ipAddress,
});

/** Validates a string as a standard UUID v4 format. */
export const isValidUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
