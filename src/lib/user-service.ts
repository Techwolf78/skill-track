import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";
import { SpringPage, unwrapPageResponse, unwrapArrayResponse } from "./api/baseResponseUtils";

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
  provider?: string;
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
  getUsers: async (params?: {
    role?: string;
    excludeRole?: string;
    page?: number;
    size?: number;
  }): Promise<UserResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.role && params.role !== "all") queryParams.append("role", params.role);
    if (params?.excludeRole) queryParams.append("excludeRole", params.excludeRole);
    queryParams.append("page", String(params?.page ?? 0));
    queryParams.append("size", String(params?.size ?? 1000));

    const response = await apiClient.get<BaseResponse<UserResponse[]>>(`/users?${queryParams.toString()}`);
    return unwrapArrayResponse<UserResponse>(response);
  },

  getUsersPage: async (
    page = 0,
    size = 20,
    params?: { role?: string; excludeRole?: string }
  ): Promise<SpringPage<UserResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.role && params.role !== "all") queryParams.append("role", params.role);
    if (params?.excludeRole) queryParams.append("excludeRole", params.excludeRole);
    queryParams.append("page", String(page));
    queryParams.append("size", String(size));

    const response = await apiClient.get<BaseResponse<SpringPage<UserResponse>>>(`/users?${queryParams.toString()}`);
    return unwrapPageResponse<UserResponse>(response);
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
