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

export const organisationService = {
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
