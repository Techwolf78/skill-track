import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";
import { SpringPage, unwrapPageResponse, unwrapArrayResponse } from "./api/baseResponseUtils";

export interface OrganisationResponse {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganisationRequest {
  name: string;
  logoUrl?: string;
}

export interface UpdateOrganisationRequest {
  name?: string;
  logoUrl?: string;
}

export interface OrganisationDashboardStats {
  totalCandidates: number;
  totalQuestions: number;
  activeTests: number;
  testsCreated: number;
  totalSubmissions: number;
  averageScore: number;
  completionRate: number;
  passRate: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  leaderboard: Array<{
    candidateId: string;
    candidateName: string;
    testsTaken: number;
    averageScore: number;
    rank: number;
  }>;
}

export const organisationService = {
  getDashboardStats: async (organisationId: string, batchId?: string): Promise<OrganisationDashboardStats> => {
    const params = batchId ? { batchId } : {};
    const response = await apiClient.get<BaseResponse<OrganisationDashboardStats>>(
      `/organisations/${organisationId}/dashboard`,
      { params }
    );
    return response.data.data;
  },

  getOrganisations: async (params?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<OrganisationResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.search && params.search.trim()) queryParams.append("search", params.search.trim());
    queryParams.append("page", String(params?.page ?? 0));
    queryParams.append("size", String(params?.size ?? 1000));

    const response = await apiClient.get<BaseResponse<OrganisationResponse[]>>(`/organisations?${queryParams.toString()}`);
    return unwrapArrayResponse<OrganisationResponse>(response);
  },

  getOrganisationsPage: async (
    page = 0,
    size = 20,
    search?: string
  ): Promise<SpringPage<OrganisationResponse>> => {
    const queryParams = new URLSearchParams();
    if (search && search.trim()) queryParams.append("search", search.trim());
    queryParams.append("page", String(page));
    queryParams.append("size", String(size));

    const response = await apiClient.get<BaseResponse<SpringPage<OrganisationResponse>>>(`/organisations?${queryParams.toString()}`);
    return unwrapPageResponse<OrganisationResponse>(response);
  },

  getOrganisationById: async (id: string): Promise<OrganisationResponse> => {
    const response = await apiClient.get<BaseResponse<OrganisationResponse>>(
      `/organisations/${id}`,
    );

    if (!response.data?.data) {
      throw new Error("Organisation not found");
    }

    return response.data.data;
  },

  createOrganisation: async (
    organisation: CreateOrganisationRequest,
  ): Promise<OrganisationResponse> => {
    const response = await apiClient.post<BaseResponse<OrganisationResponse>>(
      "/organisations",
      organisation,
    );

    return response.data.data;
  },

  updateOrganisation: async (
    id: string,
    organisation: UpdateOrganisationRequest,
  ): Promise<OrganisationResponse> => {
    const response = await apiClient.patch<BaseResponse<OrganisationResponse>>(
      `/organisations/${id}`,
      organisation,
    );

    return response.data.data;
  },

  deleteOrganisation: async (id: string): Promise<void> => {
    await apiClient.delete(`/organisations/${id}`);
  },
};
