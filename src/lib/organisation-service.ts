import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

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
  topicPerformance: Array<{
    topic: string;
    avgScore: number;
    difficulty: "Easy" | "Medium" | "Hard";
  }>;
  topPerformers: Array<{
    name: string;
    score: number;
    batch: string;
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

  getOrganisations: async (): Promise<OrganisationResponse[]> => {
    const response =
      await apiClient.get<BaseResponse<OrganisationResponse[]>>(
        "/organisations",
      );

    return response.data?.data ?? [];
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
