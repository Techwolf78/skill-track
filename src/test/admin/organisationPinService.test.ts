import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  organisationPinService,
  validatePinAdjustment,
  formatSignedDelta,
  type AllocatePinsRequest,
  type AdjustPinsRequest,
  type RefundPinsRequest,
} from "../../lib/organisation-pin-service";
import { apiClient } from "../../lib/api-client";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Organisation PIN Service & Validation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validatePinAdjustment", () => {
    it("should reject adjustment when amount is zero", () => {
      const result = validatePinAdjustment(100, 0);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot be zero");
    });

    it("should accept valid positive credit adjustment", () => {
      const result = validatePinAdjustment(50, 25);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should accept valid negative debit adjustment that does not reduce balance below zero", () => {
      const result = validatePinAdjustment(50, -30);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should reject negative debit adjustment that results in balance < 0", () => {
      const result = validatePinAdjustment(20, -50);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("negative balance (-30 PINs)");
    });

    it("should accept exact zero balance reduction", () => {
      const result = validatePinAdjustment(20, -20);
      expect(result.valid).toBe(true);
    });
  });

  describe("formatSignedDelta", () => {
    it("should format positive amounts with plus sign and commas", () => {
      expect(formatSignedDelta(500)).toBe("+500");
      expect(formatSignedDelta(1500)).toBe("+1,500");
    });

    it("should format negative amounts with minus sign and commas", () => {
      expect(formatSignedDelta(-50)).toBe("-50");
      expect(formatSignedDelta(-2500)).toBe("-2,500");
    });

    it("should format zero delta as '0'", () => {
      expect(formatSignedDelta(0)).toBe("0");
    });
  });

  describe("organisationPinService API calls", () => {
    const orgId = "11111111-2222-3333-4444-555555555555";

    it("allocatePins should send POST /organisations/{id}/pins/allocate with payload", async () => {
      const mockSummary = {
        organisationId: orgId,
        organisationName: "Acme Corp",
        pinBalance: 600,
        totalAllocatedPins: 600,
        totalUsedPins: 0,
        lastAllocatedAt: "2026-04-01T10:00:00",
      };
      (apiClient.post as any).mockResolvedValueOnce({
        data: { success: true, data: mockSummary },
      });

      const payload: AllocatePinsRequest = { pins: 500, notes: "Annual renewal" };
      const response = await organisationPinService.allocatePins(orgId, payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/organisations/${orgId}/pins/allocate`,
        payload
      );
      expect(response.pinBalance).toBe(600);
      expect(response.totalAllocatedPins).toBe(600);
    });

    it("adjustPins should send POST /organisations/{id}/pins/adjust with signed amount and reason", async () => {
      const mockSummary = {
        organisationId: orgId,
        organisationName: "Acme Corp",
        pinBalance: 550,
        totalAllocatedPins: 600,
        totalUsedPins: 0,
        lastAllocatedAt: "2026-04-01T10:00:00",
      };
      (apiClient.post as any).mockResolvedValueOnce({
        data: { success: true, data: mockSummary },
      });

      const payload: AdjustPinsRequest = {
        amount: -50,
        reason: "Correction of over-allocated credits",
        testSessionId: "session-uuid-123",
      };
      const response = await organisationPinService.adjustPins(orgId, payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/organisations/${orgId}/pins/adjust`,
        payload
      );
      expect(response.pinBalance).toBe(550);
    });

    it("refundPins should send POST /organisations/{id}/pins/refund with mandatory testSessionId and reason", async () => {
      const mockSummary = {
        organisationId: orgId,
        organisationName: "Acme Corp",
        pinBalance: 551,
        totalAllocatedPins: 600,
        totalUsedPins: 0,
        lastAllocatedAt: "2026-04-01T10:00:00",
      };
      (apiClient.post as any).mockResolvedValueOnce({
        data: { success: true, data: mockSummary },
      });

      const payload: RefundPinsRequest = {
        testSessionId: "session-uuid-456",
        reason: "Proctoring camera failure during exam",
      };
      const response = await organisationPinService.refundPins(orgId, payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/organisations/${orgId}/pins/refund`,
        payload
      );
      expect(response.pinBalance).toBe(551);
    });

    it("getPinSummary should send GET /organisations/{id}/pins/summary", async () => {
      const mockSummary = {
        organisationId: orgId,
        organisationName: "Acme Corp",
        pinBalance: 250,
        totalAllocatedPins: 300,
        totalUsedPins: 50,
        lastAllocatedAt: "2026-04-01T10:00:00",
      };
      (apiClient.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockSummary },
      });

      const response = await organisationPinService.getPinSummary(orgId);

      expect(apiClient.get).toHaveBeenCalledWith(`/organisations/${orgId}/pins/summary`);
      expect(response.pinBalance).toBe(250);
      expect(response.totalUsedPins).toBe(50);
    });

    it("getPinSummaryByFinancialYear should send GET /organisations/{id}/pins/summary/by-fy", async () => {
      const mockFyList = [
        {
          financialYear: "FY 2025-26",
          startDate: "2025-04-01",
          endDate: "2026-03-31",
          allocatedPins: 500,
          usedPins: 50,
          refundedPins: 1,
          adjustedPins: -10,
          netChange: 441,
        },
      ];
      (apiClient.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockFyList },
      });

      const response = await organisationPinService.getPinSummaryByFinancialYear(orgId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/organisations/${orgId}/pins/summary/by-fy`
      );
      expect(response).toHaveLength(1);
      expect(response[0].financialYear).toBe("FY 2025-26");
      expect(response[0].netChange).toBe(441);
    });

    it("getPinTransactions should send GET /organisations/{id}/pins/transactions with pagination", async () => {
      const mockPage = {
        content: [
          {
            id: "tx-1",
            organisationId: orgId,
            amount: -1,
            balanceAfter: 499,
            transactionType: "DEDUCTION",
            testSessionId: "session-1",
            candidateName: "John Doe",
            candidateEmail: "john@example.com",
            createdAt: "2026-04-01T12:00:00",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10,
        first: true,
        last: true,
      };
      (apiClient.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockPage },
      });

      const response = await organisationPinService.getPinTransactions(orgId, 0, 10);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/organisations/${orgId}/pins/transactions?page=0&size=10&sort=createdAt,desc`
      );
      expect(response.content).toHaveLength(1);
      expect(response.content[0].candidateName).toBe("John Doe");
      expect(response.content[0].candidateEmail).toBe("john@example.com");
    });
  });
});
