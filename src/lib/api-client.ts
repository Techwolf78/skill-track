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

    return Promise.reject(error);
  },
);
