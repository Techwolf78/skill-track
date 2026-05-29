import { describe, it, expect, beforeEach, vi, type MockInstance } from "vitest";
import { apiClient } from "../../lib/api-client";
import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Request Interceptor", () => {
    it("should append Authorization header if token is present in localStorage", async () => {
      localStorage.setItem("token", "dummy-jwt-token");
      
      // Access request interceptors
      const interceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const mockConfig = {
        headers: {
          set: vi.fn(),
        },
      } as unknown as InternalAxiosRequestConfig;

      const result = interceptor(mockConfig);

      expect(mockConfig.headers.set).toHaveBeenCalledWith("Authorization", "Bearer dummy-jwt-token");
      expect(result).toBe(mockConfig);
    });

    it("should not append Authorization header if token is absent", async () => {
      const interceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const mockConfig = {
        headers: {
          set: vi.fn(),
        },
      } as unknown as InternalAxiosRequestConfig;

      const result = interceptor(mockConfig);

      expect(mockConfig.headers.set).not.toHaveBeenCalled();
      expect(result).toBe(mockConfig);
    });
  });

  describe("Response Interceptor", () => {
    const getResponseErrorHandler = () => {
      return (apiClient.interceptors.response as any).handlers[0].rejected;
    };

    it("should clean localStorage when status code is 401", async () => {
      localStorage.setItem("token", "active-token");
      localStorage.setItem("user", "active-user");

      const errorHandler = getResponseErrorHandler();
      const mockError = {
        response: {
          status: 401,
        },
      } as AxiosError;

      await expect(errorHandler(mockError)).rejects.toBe(mockError);
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("should format field validation errors dynamically", async () => {
      const errorHandler = getResponseErrorHandler();
      const mockError = {
        response: {
          status: 400,
          data: {
            success: false,
            message: "Validation failed",
            errors: {
              email: "Invalid email structure",
              password: "Too short",
            },
          },
        },
      } as unknown as AxiosError;

      await expect(errorHandler(mockError)).rejects.toBe(mockError);
      
      const expectedMessage = "Validation failed:\nemail: Invalid email structure\npassword: Too short";
      expect(mockError.message).toBe(expectedMessage);
      expect((mockError.response?.data as any).message).toBe(expectedMessage);
    });

    it("should parse standard backend error codes", async () => {
      const errorHandler = getResponseErrorHandler();
      const mockError = {
        response: {
          status: 400,
          data: {
            success: false,
            errorCode: "INVITATION_EXPIRED",
            message: "This invitation link is expired.",
          },
        },
      } as unknown as AxiosError;

      await expect(errorHandler(mockError)).rejects.toBe(mockError);
      expect(mockError.message).toBe("INVITATION_EXPIRED: This invitation link is expired.");
    });

    it("should append a default message on 403 Access Denied if absent", async () => {
      const errorHandler = getResponseErrorHandler();
      const mockError = {
        response: {
          status: 403,
          data: {},
        },
      } as unknown as AxiosError;

      await expect(errorHandler(mockError)).rejects.toBe(mockError);
      expect(mockError.message).toBe("Access Denied: You do not have permission to perform this action.");
    });
  });
});
