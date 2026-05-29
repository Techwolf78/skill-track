/**
 * Candidate management domain logic.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CandidatePayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  organisationId: string;
}

/** Validates a candidate creation payload, collecting all field errors. */
export const isValidCandidatePayload = (
  payload: Partial<CandidatePayload>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!payload.name || payload.name.trim() === "") errors.push("Name is required");
  if (!payload.email || !EMAIL_RE.test(payload.email))
    errors.push("Valid email is required");
  if (!payload.password || payload.password.length < 8)
    errors.push("Password must be at least 8 characters");
  if (!payload.organisationId) errors.push("Organisation ID is required");
  return { valid: errors.length === 0, errors };
};

/**
 * Masks the local part of an email, preserving only the first and last characters.
 * e.g. "jane.doe@example.com" → "j******e@example.com"
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length <= 2) return email;
  const masked = local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
};

/** Summarises the outcome of a bulk candidate upload operation. */
export const buildBulkUploadSummary = (
  results: { status: "success" | "failed" }[]
) => ({
  total: results.length,
  success: results.filter((r) => r.status === "success").length,
  failed: results.filter((r) => r.status === "failed").length,
});
