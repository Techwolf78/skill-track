// src/lib/candidate-service.ts
import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

// Spring Data Page response shape
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // 0-indexed current page
  first: boolean;
  last: boolean;
  empty: boolean;
}

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
    const nestedData = (data as unknown as Record<string, unknown>)["data"];
    if (Array.isArray(nestedData)) {
      return nestedData as T[];
    }
    if (nestedData && typeof nestedData === "object" && "content" in nestedData && Array.isArray((nestedData as unknown as Record<string, unknown>)["content"])) {
      return (nestedData as unknown as Record<string, unknown>)["content"] as T[];
    }
  }
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as unknown as Record<string, unknown>)["content"])) {
    return (data as unknown as Record<string, unknown>)["content"] as T[];
  }
  return [];
};

// Shared mapper from flat/nested CandidateResponse → Candidate
const mapCandidate = (c: Candidate & Record<string, unknown>): Candidate => {
  if (c.user) return c;
  return {
    id: c.id,
    user: {
      id: c["userId"] as string,
      name: c["name"] as string,
      email: c["email"] as string,
      phoneNumber: c["phoneNumber"] as string | undefined,
      role: "CANDIDATE",
    },
    organisation: c.organisation
      ? {
          id: c.organisation.id,
          name: c.organisation.name,
          logoUrl: c.organisation.logoUrl,
          createdAt: c.organisation.createdAt,
          updatedAt: c.organisation.updatedAt,
        }
      : { id: "", name: "" },
    extraFields: c.extraFields,
    stale: (c["isStale"] as boolean | undefined) ?? c.stale ?? false,
    lastUpdated: (c["lastUpdated"] as string | undefined) || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

export const candidateService = {
  /**
   * Flat list used by non-management pages (InviteCandidates, Reports, etc.)
   * that need a full candidate lookup map for name resolution.
   * Continues to use size=5000 to load all records in one shot.
   */
  getCandidates: async (): Promise<Candidate[]> => {
    const response = await apiClient.get<Candidate[]>("/candidates?size=5000");
    const rawList = unwrapArrayResponse(response);
    return rawList.map((c) => mapCandidate(c as Candidate & Record<string, unknown>));
  },

  /**
   * True server-side paginated fetch.
   * Used by AdminCandidates and SuperAdminCandidates management pages.
   * Sends `page` (0-indexed) and `size` to the backend and returns
   * the full Spring Page metadata (totalElements, totalPages, etc.).
   */
  getCandidatesPage: async (
    page: number,
    size: number
  ): Promise<SpringPage<Candidate>> => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    const response = await apiClient.get<unknown>(`/candidates?${params.toString()}`);
    const raw = response.data as Record<string, unknown>;

    // Unwrap BaseResponse<Page<CandidateResponse>>
    const pageData = (
      raw && typeof raw === "object" && "data" in raw && "success" in raw
        ? (raw as { data: Record<string, unknown> }).data
        : raw
    ) as Record<string, unknown>;

    const rawContent = Array.isArray(pageData?.content)
      ? (pageData.content as (Candidate & Record<string, unknown>)[])
      : [];

    return {
      content: rawContent.map(mapCandidate),
      totalElements: (pageData?.totalElements as number) ?? 0,
      totalPages: (pageData?.totalPages as number) ?? 1,
      size: (pageData?.size as number) ?? size,
      number: (pageData?.number as number) ?? page,
      first: (pageData?.first as boolean) ?? true,
      last: (pageData?.last as boolean) ?? true,
      empty: (pageData?.empty as boolean) ?? true,
    };
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