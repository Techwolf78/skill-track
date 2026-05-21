import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = "/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

    // Enhance the error object with standard BaseResponse error details
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as any;

      // Extract field validation errors
      if (data.errors && typeof data.errors === "object") {
        const errorEntries = Object.entries(data.errors);
        if (errorEntries.length > 0) {
          const validationMsg = errorEntries
            .map(([field, msg]) => `${field}: ${msg}`)
            .join("\n");
          const fullMessage = `${data.message || "Validation failed"}:\n${validationMsg}`;
          error.message = fullMessage;
          data.message = fullMessage; // For components using error.response?.data?.message
        }
      } else if (data.errorCode) {
        error.message = `${data.errorCode}: ${data.message || "An error occurred"}`;
        data.message = error.message;
      } else if (data.message) {
        error.message = data.message;
      }
    }

    if (error.response?.status === 403) {
      // Access denied — user lacks permission for this resource
      console.warn("Access denied:", error.response?.data);
      // Optional: if the UI expects an error message to be surfaced directly
      if (!error.response?.data?.message) {
        error.message = "Access Denied: You do not have permission to perform this action.";
      }
    }

    return Promise.reject(error);
  },
);
