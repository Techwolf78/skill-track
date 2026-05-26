// src/lib/candidate-service.ts
import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

export interface Candidate {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  organisation: {
    id: string;
    name: string;
    logoUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  extraFields?: Record<string, unknown>;
  stale: boolean;
  lastUpdated: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCandidateRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  organisationId: string;
  extraFields?: Record<string, unknown>;
}

// Helper to unwrap BaseResponse
const unwrapResponse = <T>(response: { data: BaseResponse<T> | T }): T => {
  const data = response.data;
  if (data && typeof data === "object" && "data" in data && "success" in data) {
    return (data as BaseResponse<T>).data;
  }
  return data as T;
};

const unwrapArrayResponse = <T>(response: {
  data: BaseResponse<T[]> | T[];
}): T[] => {
  const data = response.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === "object" && "data" in data) {
    const nestedData = (data as any).data;
    if (Array.isArray(nestedData)) {
      return nestedData;
    }
    if (nestedData && typeof nestedData === "object" && "content" in nestedData && Array.isArray(nestedData.content)) {
      return nestedData.content;
    }
  }
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as any).content)) {
    return (data as any).content;
  }
  return [];
};

export const candidateService = {
  getCandidates: async (): Promise<Candidate[]> => {
    const response = await apiClient.get<any[]>("/candidates");
    const rawList = unwrapArrayResponse(response);
    return rawList.map((c: any) => {
      if (c.user) return c;
      return {
        id: c.id,
        user: {
          id: c.userId,
          name: c.name,
          email: c.email,
          phoneNumber: c.phoneNumber,
          role: "CANDIDATE"
        },
        organisation: c.organisation ? {
          id: c.organisation.id,
          name: c.organisation.name,
          logoUrl: c.organisation.logoUrl,
          createdAt: c.organisation.createdAt,
          updatedAt: c.organisation.updatedAt
        } : { id: "", name: "" },
        extraFields: c.extraFields,
        stale: c.isStale ?? c.stale ?? false,
        lastUpdated: c.lastUpdated || "",
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });
  },

  // Create a new candidate
  createCandidate: async (dto: CreateCandidateRequest): Promise<string> => {
    const response = await apiClient.post<string>("/candidates", dto);
    return unwrapResponse(response);
  },

  // Delete a candidate
  deleteCandidate: async (id: string): Promise<void> => {
    await apiClient.delete(`/candidates/${id}`);
  },
};