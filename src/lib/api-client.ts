import axios, { AxiosError } from "axios";

import { toast } from "sonner";
import {
  generateIdempotencyKey,
  createRequestFingerprint,
  getActiveRequestLock,
  setActiveRequestLock,
  releaseActiveRequestLock,
} from "./idempotency";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor (Idempotency-Key injection + in-flight deduplication)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.set("Authorization", `Bearer ${token}`);

    const method = (config.method || "GET").toUpperCase();
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    if (isMutation) {
      const existingKey =
        config.headers.get("Idempotency-Key") ||
        config.headers.get("X-Idempotency-Key");

      const keyToUse = existingKey
        ? String(existingKey)
        : generateIdempotencyKey(`op_${method.toLowerCase()}`);

      config.headers.set("Idempotency-Key", keyToUse);
      config.headers.set("X-Idempotency-Key", keyToUse);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ✅ Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isKeepAlive = error.config?.headers?.["X-Keep-Alive"] === "true" || 
                          error.config?.headers?.get?.("X-Keep-Alive") === "true" ||
                          error.config?.url?.includes("_cb=bootstrap");
                          
      const isTestAccessPage = typeof window !== "undefined" && 
                               (window.location.pathname.includes("/test/access") || 
                                window.location.pathname.includes("/tests/access"));

      if (!isKeepAlive && !isTestAccessPage) {
        // 🔥 Token expired / invalid
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Prevent infinite redirect loop if already on login page or if the request is to login
        const isLoginPage = typeof window !== "undefined" && window.location.pathname === "/login";
        const isLoginRequest = error.config?.url?.includes("/auth/login");

        if (!isLoginPage && !isLoginRequest) {
          window.location.href = "/login";
        }
      }
    }

    if (error.response?.status === 429) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const retryAfterHeader = error.response.headers?.["retry-after"] || error.response.headers?.["Retry-After"];
      
      let secondsLeft = 30;
      if (retryAfterHeader) {
        const parsed = parseInt(retryAfterHeader as string, 10);
        if (!isNaN(parsed) && parsed > 0) {
          secondsLeft = parsed;
        }
      }

      const defaultMsg = `Too many requests. Please try again in ${secondsLeft} seconds.`;
      const finalMsg = data?.message ? (data.message as string) : defaultMsg;
      
      error.message = finalMsg;
      if (data) {
        data.message = finalMsg;
      }
      console.warn("Rate limit exceeded:", finalMsg);

      // Trigger a countdown timer toast using Sonner
      const toastId = toast.error("Rate Limit Exceeded", {
        description: `Too many requests. Please wait ${secondsLeft}s before retrying.`,
        duration: (secondsLeft + 1) * 1000,
      });

      const interval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          clearInterval(interval);
          toast.dismiss(toastId);
          toast.success("Rate Limit Lifted", {
            description: "You may now retry your request.",
            duration: 3000,
          });
        } else {
          toast.error("Rate Limit Exceeded", {
            id: toastId,
            description: `Too many requests. Please wait ${secondsLeft}s before retrying.`,
          });
        }
      }, 1000);
    }

    // Enhance the error object with standard BaseResponse error details
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as Record<string, unknown>;

      // Extract field validation errors
      if (data.errors && typeof data.errors === "object") {
        const errorEntries = Object.entries(
          data.errors as Record<string, string>,
        );
        if (errorEntries.length > 0) {
          const validationMsg = errorEntries
            .map(([field, msg]) => `${field}: ${msg}`)
            .join("\n");
          const fullMessage = `${(data.message as string) || "Validation failed"}:\n${validationMsg}`;
          error.message = fullMessage;
          data.message = fullMessage; // For components using error.response?.data?.message
        }
      } else if (data.errorCode) {
        error.message = `${data.errorCode as string}: ${(data.message as string) || "An error occurred"}`;
        data.message = error.message;
      } else if (data.message) {
        error.message = data.message as string;
      }
    }

    if (error.response?.status === 403) {
      // Access denied — user lacks permission for this resource
      console.warn("Access denied:", error.response?.data);
      // Optional: if the UI expects an error message to be surfaced directly
      const responseData = error.response?.data as
        | Record<string, unknown>
        | undefined;
      if (!responseData?.message) {
        error.message =
          "Access Denied: You do not have permission to perform this action.";
      }
    }

    return Promise.reject(error);
  },
);

// ✅ Transport-level deduplication for concurrent identical mutations.
// If an identical POST/PUT/PATCH/DELETE is already in-flight, callers get
// the same Promise back instead of firing a duplicate HTTP request.
// The lock auto-releases when the original request settles (success or error).
const _post = apiClient.post.bind(apiClient);
const _put = apiClient.put.bind(apiClient);
const _patch = apiClient.patch.bind(apiClient);
const _del = apiClient.delete.bind(apiClient);

/* eslint-disable @typescript-eslint/no-explicit-any */
function withDedup(method: string, fn: (...a: any[]) => Promise<any>) {
  return (...args: any[]) => {
    const url: string = args[0] ?? "";
    // POST/PUT/PATCH pass data as arg[1]; DELETE has no data arg.
    const data = method === "DELETE" ? undefined : args[1];
    const fp = createRequestFingerprint(method, url, data);
    const inflight = getActiveRequestLock(fp);
    if (inflight) return inflight;
    const promise = fn(...args).finally(() => releaseActiveRequestLock(fp));
    setActiveRequestLock(fp, promise);
    return promise;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

apiClient.post = withDedup("POST", _post) as typeof apiClient.post;
apiClient.put = withDedup("PUT", _put) as typeof apiClient.put;
apiClient.patch = withDedup("PATCH", _patch) as typeof apiClient.patch;
apiClient.delete = withDedup("DELETE", _del) as typeof apiClient.delete;
