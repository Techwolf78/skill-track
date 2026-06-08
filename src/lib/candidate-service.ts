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
    const nestedData = (data as Record<string, unknown>)["data"];
    if (Array.isArray(nestedData)) {
      return nestedData as T[];
    }
    if (nestedData && typeof nestedData === "object" && "content" in nestedData && Array.isArray((nestedData as Record<string, unknown>)["content"])) {
      return (nestedData as Record<string, unknown>)["content"] as T[];
    }
  }
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as Record<string, unknown>)["content"])) {
    return (data as Record<string, unknown>)["content"] as T[];
  }
  return [];
};

export const candidateService = {
  getCandidates: async (): Promise<Candidate[]> => {
    const response = await apiClient.get<Candidate[]>("/candidates");
    const rawList = unwrapArrayResponse(response);
    return rawList.map((c: Candidate & Record<string, unknown>) => {
      if (c.user) return c;
      return {
        id: c.id,
        user: {
          id: c["userId"] as string,
          name: c["name"] as string,
          email: c["email"] as string,
          phoneNumber: c["phoneNumber"] as string | undefined,
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
        stale: (c["isStale"] as boolean | undefined) ?? c.stale ?? false,
        lastUpdated: (c["lastUpdated"] as string | undefined) || "",
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

  // Get the currently logged-in candidate's own profile
  // Uses GET /candidates/me — accessible by CANDIDATE role only
  getMyProfile: async (): Promise<Candidate | null> => {
    try {
      const response = await apiClient.get<Candidate>("/candidates/me");
      return unwrapResponse(response);
    } catch {
      return null;
    }
  },

  // Find a candidate by their user ID (the user object nested in the candidate)
  // For CANDIDATE role: delegates to getMyProfile() to avoid calling the admin-only list
  // For ADMIN/SUPERADMIN: falls back to the full list lookup
  getCandidateByUserId: async (userId: string): Promise<Candidate | null> => {
    try {
      // Try the self-lookup endpoint first (works for both candidate and admin roles)
      const myProfile = await candidateService.getMyProfile();
      if (myProfile) {
        // If the resolved profile matches the requested userId, return it
        if (myProfile.user?.id === userId) return myProfile;
      }
    } catch {
      // Fall through to list-based lookup for admin users
    }
    // Admin/SuperAdmin fallback: scan full candidate list
    try {
      const all = await candidateService.getCandidates();
      return all.find((c) => c.user?.id === userId) ?? null;
    } catch {
      return null;
    }
  },
};