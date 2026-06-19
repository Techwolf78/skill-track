import { describe, it, expect, beforeEach, vi } from "vitest";
import { auditLogService } from "../../lib/audit-log-service";
import { apiClient } from "../../lib/api-client";

// Mock the apiClient
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("auditLogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuditLogs Filters & Query Params", () => {
    it("should construct the correct URL with query parameters", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          success: true,
          data: {
            content: [],
            totalElements: 0,
            totalPages: 1,
            size: 20,
            number: 0,
            last: true,
            first: true,
            empty: true,
          },
        },
      });

      await auditLogService.getAuditLogs({
        actor: "admin@test.com",
        start: "2026-06-01",
        end: "2026-06-19",
        page: 1,
        size: 10,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("/admin/audit-logs?actor=admin%40test.com&start=2026-06-01&end=2026-06-19&page=1&size=10")
      );
    });
  });

  describe("Backend Audit Log Parsing", () => {
    it("should correctly parse Spring Boot LocalDateTime array format into standard ISO string", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          success: true,
          data: {
            content: [
              {
                id: "log-1",
                actor: "user-1",
                action: "CREATE_TEST",
                details: "Created test A",
                createdAt: [2026, 6, 19, 17, 30, 0, 500],
              },
            ],
            totalElements: 1,
            totalPages: 1,
            size: 20,
            number: 0,
            last: true,
            first: true,
            empty: false,
          },
        },
      });

      const response = await auditLogService.getAuditLogs();
      expect(response.content.length).toBe(1);

      const log = response.content[0];
      // Expected date: Month is 0-indexed in JS Date constructor (6 -> June -> index 5)
      const expectedDate = new Date(2026, 5, 19, 17, 30, 0, 500).toISOString();
      expect(log.timestamp).toBe(expectedDate);
    });

    it("should dynamically build details from afterSnapshot if details is missing", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          success: true,
          data: {
            content: [
              {
                id: "log-1",
                actor: "admin",
                action: "UPDATE_QUESTION",
                entityType: "Question",
                entityId: "q-123",
                timestamp: "2026-06-19T12:00:00.000Z",
                afterSnapshot: JSON.stringify({ prompt: "What is Vitest?" }),
              },
            ],
          },
        },
      });

      const response = await auditLogService.getAuditLogs();
      expect(response.content[0].details).toBe('Performed update question on Question "What is Vitest?"');
    });

    it("should fall back to entityId in details if snapshot has no name/title/prompt", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          success: true,
          data: {
            content: [
              {
                id: "log-1",
                actor: "admin",
                action: "DELETE_USER",
                entityType: "User",
                entityId: "u-999",
                timestamp: "2026-06-19T12:00:00.000Z",
                afterSnapshot: JSON.stringify({}),
              },
            ],
          },
        },
      });

      const response = await auditLogService.getAuditLogs();
      expect(response.content[0].details).toBe("Performed delete user on User (ID: u-999)");
    });

    it("should handle direct array response from backend without pagination wrapper", async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              id: "log-1",
              actor: "user",
              action: "LOGIN",
              timestamp: "2026-06-19T12:00:00.000Z",
            },
          ],
        },
      });

      const response = await auditLogService.getAuditLogs({ page: 0, size: 5 });
      expect(response.totalElements).toBe(1);
      expect(response.totalPages).toBe(1);
      expect(response.size).toBe(5);
      expect(response.content[0].action).toBe("LOGIN");
    });
  });
});
