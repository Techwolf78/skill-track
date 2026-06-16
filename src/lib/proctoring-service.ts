import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

export interface ProctoringConfigDto {
  camera: boolean;
  audio: boolean;
  tabSwitch: boolean;
  devtools: boolean;
  screenShare: boolean;
  objectDetection: boolean;
  llmDetector: boolean;
  maxTabSwitches: number;
  snapshotIntervalSecs: number;
  violationThresholds: Record<string, number>;
}

export interface TrustScoreDto {
  id: string | null;
  score: number;
  flagsCount: number;
  isMalpractice: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  updatedAt: string | null;
}

export interface ProctoringEventDto {
  id: string;
  eventType: string;
  severity: string | null;
  occurredAt: string;
  metadata: Record<string, unknown> | null;
  syncedAt: string;
  evidence?: string | null;
}

export interface PaginatedProctoringEvents {
  content: ProctoringEventDto[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ProctoringSummaryResponse {
  trustScore: TrustScoreDto;
  events: PaginatedProctoringEvents;
}

const unwrapResponse = <T>(response: { data: BaseResponse<T> | T }): T => {
  const data = response.data;
  if (data && typeof data === "object" && "data" in data && "success" in data) {
    return (data as BaseResponse<T>).data;
  }
  return data as T;
};

export const proctoringService = {
  getProctoringConfig: async (sessionId: string): Promise<ProctoringConfigDto> => {
    const response = await apiClient.get<BaseResponse<ProctoringConfigDto>>(
      `/test-sessions/${sessionId}/proctoring-config`
    );
    return unwrapResponse(response);
  },

  submitViolation: async (sessionId: string, violation: unknown): Promise<string> => {
    const response = await apiClient.post<BaseResponse<string>>(
      `/test-sessions/${sessionId}/violations`,
      violation
    );
    return unwrapResponse(response);
  },

  submitBatchViolations: async (sessionId: string, violations: unknown[]): Promise<string> => {
    const response = await apiClient.post<BaseResponse<string>>(
      `/test-sessions/${sessionId}/violations/batch`,
      { violations }
    );
    return unwrapResponse(response);
  },

  submitBatchSnapshots: async (sessionId: string, snapshots: unknown[]): Promise<string> => {
    const response = await apiClient.post<BaseResponse<string>>(
      `/test-sessions/${sessionId}/snapshots/batch`,
      { snapshots }
    );
    return unwrapResponse(response);
  },

  getProctoringSummary: async (sessionId: string, page = 0, size = 20): Promise<ProctoringSummaryResponse> => {
    const response = await apiClient.get<BaseResponse<ProctoringSummaryResponse>>(
      `/admin/sessions/${sessionId}/proctoring-summary?page=${page}&size=${size}`
    );
    return unwrapResponse(response);
  }
};
