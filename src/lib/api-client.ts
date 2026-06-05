import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request Interceptor (safe typing)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
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
      // 🔥 Token expired / invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Optional redirect
      // window.location.href = "/login";
    }

    if (error.response?.status === 429) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const retryAfter = error.response.headers?.["retry-after"] || error.response.headers?.["Retry-After"];
      const defaultMsg = `Too many requests. Please try again${retryAfter ? ` in ${retryAfter} seconds` : " later"}.`;
      const finalMsg = data?.message ? (data.message as string) : defaultMsg;
      
      error.message = finalMsg;
      if (data) {
        data.message = finalMsg;
      }
      console.warn("Rate limit exceeded:", finalMsg);
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
