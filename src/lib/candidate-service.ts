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
  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as BaseResponse<T[]>).data)
  ) {
    return (data as BaseResponse<T[]>).data;
  }
  return [];
};

export const candidateService = {
  // Get all candidates
  getCandidates: async (): Promise<Candidate[]> => {
    const response = await apiClient.get<Candidate[]>("/candidates");
    return unwrapArrayResponse(response);
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