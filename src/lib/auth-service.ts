import { apiClient } from "./api-client";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string;
  organisationData?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  user: UserData;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface BaseResponse<T> {
  success: boolean;
  status: number;
  statusCode?: number;
  message: string;
  data: T;
  errorCode?: string;
  errors?: unknown;
  timestamp: string;
  path?: string;
}

export const authService = {
  login: async (request: LoginRequest): Promise<AuthResponse> => {
    // Your backend might be returning BaseResponse<AuthResponse>
    const response = await apiClient.post<BaseResponse<AuthResponse>>(
      "/auth/login",
      request,
    );

    // Check if response is wrapped in BaseResponse
    if (response.data && "data" in response.data) {
      // It's wrapped in BaseResponse
      const authData = response.data.data;

      // Store the token (using accessToken field)
      if (authData.accessToken) {
        localStorage.setItem("token", authData.accessToken);
        localStorage.setItem("user", JSON.stringify(authData.user));
      }

      return authData;
    } else {
      // It's direct AuthResponse
      const authData = response.data as unknown as AuthResponse;

      if (authData.accessToken) {
        localStorage.setItem("token", authData.accessToken);
        localStorage.setItem("user", JSON.stringify(authData.user));
      }

      return authData;
    }
  },

  resetPassword: async (request: unknown): Promise<AuthResponse> => {
    const response = await apiClient.patch<BaseResponse<AuthResponse>>(
      "/auth/reset-password",
      request,
    );
    return (response.data as any).data || response.data;
  },

  // Helper method to get user
  getCurrentUser: (): UserData | null => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Helper method to check if user has role
  hasRole: (role: string): boolean => {
    const user = authService.getCurrentUser();
    return user?.role === role;
  },

  // Helper method to logout
  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      console.warn("Failed to call backend logout endpoint:", e);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  },
};
