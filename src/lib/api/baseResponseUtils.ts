/**
 * BaseResponse envelope parsing utilities.
 * Mirrors the Spring Boot BaseResponse<T> wrapper used on all API endpoints.
 */

export interface BaseResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
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

/** Unwraps an array BaseResponse, returning an empty array when data is null. */
export const unwrapArrayResponse = <T>(
  response: { data: BaseResponse<T[]> | T[] }
): T[] => {
  const payload = response.data as BaseResponse<T[]>;
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data ?? [];
  }
  return payload as unknown as T[];
};

/** Returns true when the response envelope indicates a successful operation. */
export const isSuccessResponse = (
  response: { data: BaseResponse<unknown> }
): boolean => response.data?.success === true;
