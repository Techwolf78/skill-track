import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  organisation?: {
    id: string;
    name: string;
  };
  testsCompleted?: number;
  avgScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  organisation_id: string;
}

export interface UpdateUserRequestPatch {
  name?: string;
  phoneNumber?: string;
  role?: string;
}

export const userService = {
  getUsers: async (): Promise<UserResponse[]> => {
    const response =
      await apiClient.get<BaseResponse<UserResponse[]>>("/users");
    return response.data.data || [];
  },

  getUserById: async (id: string): Promise<UserResponse> => {
    const response = await apiClient.get<BaseResponse<UserResponse>>(
      `/users/${id}`,
    );
    return response.data.data;
  },

  createUser: async (
    request: CreateUserRequest,
    role: string,
  ): Promise<string> => {
    const response = await apiClient.post<BaseResponse<string>>(
      `/admin/users?role=${role}`,
      request,
    );
    return response.data.data;
  },

  patchUser: async (
    id: string,
    request: UpdateUserRequestPatch,
  ): Promise<UserResponse> => {
    const response = await apiClient.patch<BaseResponse<UserResponse>>(
      `/users/${id}`,
      request,
    );
    return response.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
