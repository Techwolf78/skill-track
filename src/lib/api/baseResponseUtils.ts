/**
 * BaseResponse envelope parsing utilities.
 * Mirrors the Spring Boot BaseResponse<T> wrapper used on all API endpoints.
 */

export interface BaseResponse<T> {
  success: boolean;
  status?: number;
  message: string;
  data: T | null;
  warnings?: string[];
  timestamp?: string;
  path?: string;
  correlationId?: string;
  errorCode?: string | null;
  errors?: Record<string, string> | null;
}

/** Unwraps the inner data from a BaseResponse envelope, or returns the raw payload. */
export const unwrapResponse = <T>(response: { data: BaseResponse<T> | T }): T => {
  const payload = response.data as BaseResponse<T>;
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data !== undefined
  ) {
    return payload.data as T;
  }
  return payload as unknown as T;
};

/** Extracts data alongside any non-blocking warnings from the response. */
export const unwrapWithWarnings = <T>(
  response: { data: BaseResponse<T> | T }
): { data: T; warnings: string[] } => {
  const payload = response.data as BaseResponse<T>;
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data !== undefined
  ) {
    return { data: payload.data as T, warnings };
  }
  return { data: payload as unknown as T, warnings };
};

/** Extracts any non-blocking warnings attached to a response payload. */
export const extractWarnings = (response: { data: unknown }): string[] => {
  if (response && response.data && typeof response.data === "object") {
    const payload = response.data as { warnings?: string[] };
    if (Array.isArray(payload.warnings)) {
      return payload.warnings;
    }
  }
  return [];
};

/** Unwraps an array BaseResponse, Spring Page, or raw array, always returning a valid array. */
export const unwrapArrayResponse = <T = any>(
  response: { data: BaseResponse<T[] | { content?: T[] }> | T[] | { content?: T[] } | unknown } | any
): T[] => {
  const payload = response.data;
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === "object") {
    // If inside a BaseResponse envelope
    if ("data" in payload && (payload as { data?: unknown }).data !== undefined && (payload as { data?: unknown }).data !== null) {
      const inner = (payload as { data: unknown }).data;
      if (Array.isArray(inner)) {
        return inner as T[];
      }
      if (inner && typeof inner === "object" && "content" in inner && Array.isArray((inner as { content?: unknown }).content)) {
        return (inner as { content: T[] }).content;
      }
    }
    // If raw Spring Page: { content: [...] }
    if ("content" in payload && Array.isArray((payload as { content?: unknown }).content)) {
      return (payload as { content: T[] }).content;
    }
  }
  return [];
};

/** Returns true when the response envelope indicates a successful operation. */
export const isSuccessResponse = (
  response: { data: BaseResponse<unknown> }
): boolean => response.data?.success === true;
