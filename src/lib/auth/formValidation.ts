/**
 * Auth form validation logic — pure, framework-agnostic validators.
 * Used by Login and ResetPassword pages.
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  oldPassword: string;
  newPassword: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLoginForm = (
  creds: Partial<LoginCredentials>
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  if (!creds.email || creds.email.trim() === "") {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(creds.email)) {
    errors.email = "Invalid email format";
  }
  if (!creds.password || creds.password.trim() === "") {
    errors.password = "Password is required";
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const validateResetPasswordForm = (
  payload: Partial<ResetPasswordPayload>
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  if (!payload.oldPassword || payload.oldPassword.trim() === "")
    errors.oldPassword = "Old password is required";
  if (!payload.newPassword || payload.newPassword.length < 8)
    errors.newPassword = "New password must be at least 8 characters long";
  if (
    payload.oldPassword &&
    payload.newPassword &&
    payload.oldPassword === payload.newPassword
  ) {
    errors.newPassword = "New password must be different from old password";
  }
  return { valid: Object.keys(errors).length === 0, errors };
};
