import { apiClient } from "./api-client";
import {
  BaseResponse,
  SpringPage,
  unwrapPageResponse,
  unwrapResponse,
} from "./api/baseResponseUtils";

export type PinTransactionType =
  | "ALLOCATION"
  | "DEDUCTION"
  | "DEDUCTION_WAIVED"
  | "REFUND"
  | "ADJUSTMENT";

export interface AllocatePinsRequest {
  pins: number;
  notes?: string;
}

export interface AdjustPinsRequest {
  amount: number;
  reason: string;
  testSessionId?: string;
  candidateId?: string;
}

export interface RefundPinsRequest {
  testSessionId: string;
  reason: string;
}

export interface OrganisationPinSummaryResponse {
  organisationId: string;
  organisationName: string;
  pinBalance: number;
  totalAllocatedPins: number;
  totalUsedPins: number;
  lastAllocatedAt?: string | null;
}

export interface OrganisationPinFySummaryResponse {
  financialYear: string;
  startDate: string;
  endDate: string;
  allocatedPins: number;
  usedPins: number;
  refundedPins: number;
  adjustedPins: number;
  netChange: number;
}

export interface PinTransactionResponse {
  id: string;
  organisationId: string;
  amount: number;
  balanceAfter: number;
  transactionType: PinTransactionType;
  testSessionId?: string | null;
  scheduleId?: string | null;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export function validatePinAdjustment(
  currentBalance: number,
  adjustAmount: number
): { valid: boolean; message?: string } {
  if (adjustAmount === 0) {
    return { valid: false, message: "Adjustment amount cannot be zero." };
  }
  const projectedBalance = currentBalance + adjustAmount;
  if (projectedBalance < 0) {
    return {
      valid: false,
      message: `Adjustment would result in a negative balance (${projectedBalance} PINs). Minimum allowed balance is 0.`,
    };
  }
  return { valid: true };
}

export function formatSignedDelta(amount: number): string {
  if (amount > 0) return `+${amount.toLocaleString()}`;
  if (amount < 0) return amount.toLocaleString();
  return "0";
}

export const organisationPinService = {
  allocatePins: async (
    orgId: string,
    req: AllocatePinsRequest
  ): Promise<OrganisationPinSummaryResponse> => {
    const response = await apiClient.post<BaseResponse<OrganisationPinSummaryResponse>>(
      `/organisations/${orgId}/pins/allocate`,
      req
    );
    return unwrapResponse(response);
  },

  adjustPins: async (
    orgId: string,
    req: AdjustPinsRequest
  ): Promise<OrganisationPinSummaryResponse> => {
    const response = await apiClient.post<BaseResponse<OrganisationPinSummaryResponse>>(
      `/organisations/${orgId}/pins/adjust`,
      req
    );
    return unwrapResponse(response);
  },

  refundPins: async (
    orgId: string,
    req: RefundPinsRequest
  ): Promise<OrganisationPinSummaryResponse> => {
    const response = await apiClient.post<BaseResponse<OrganisationPinSummaryResponse>>(
      `/organisations/${orgId}/pins/refund`,
      req
    );
    return unwrapResponse(response);
  },

  getPinSummary: async (orgId: string): Promise<OrganisationPinSummaryResponse> => {
    const response = await apiClient.get<BaseResponse<OrganisationPinSummaryResponse>>(
      `/organisations/${orgId}/pins/summary`
    );
    return unwrapResponse(response);
  },

  getPinSummaryByFinancialYear: async (
    orgId: string
  ): Promise<OrganisationPinFySummaryResponse[]> => {
    const response = await apiClient.get<BaseResponse<OrganisationPinFySummaryResponse[]>>(
      `/organisations/${orgId}/pins/summary/by-fy`
    );
    return unwrapResponse(response);
  },

  getPinTransactions: async (
    orgId: string,
    page = 0,
    size = 10
  ): Promise<SpringPage<PinTransactionResponse>> => {
    const response = await apiClient.get<BaseResponse<SpringPage<PinTransactionResponse>>>(
      `/organisations/${orgId}/pins/transactions?page=${page}&size=${size}&sort=createdAt,desc`
    );
    return unwrapPageResponse<PinTransactionResponse>(response);
  },
};
