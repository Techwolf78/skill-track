// src/lib/audit-log-service.ts
import { apiClient } from "./api-client";
import { BaseResponse } from "./auth-service";

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  details: string;
  ipAddress?: string;
  status: string; // e.g. "SUCCESS", "FAILED"
  timestamp: string; // ISO date string
  beforeSnapshot?: string;
  afterSnapshot?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

export interface BackendAuditLog {
  id?: string;
  actor?: string;
  action?: string;
  details?: string;
  ipAddress?: string;
  status?: string;
  timestamp?: string;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string | number[];
}

export interface AuditLogFilters {
  actor?: string;
  start?: string;
  end?: string;
  page?: number;
  size?: number;
}

export const auditLogService = {
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<PageResponse<AuditLog>> => {
    const params = new URLSearchParams();
    if (filters.actor) params.append("actor", filters.actor);
    if (filters.start) params.append("start", filters.start);
    if (filters.end) params.append("end", filters.end);
    if (filters.page !== undefined) params.append("page", String(filters.page));
    if (filters.size !== undefined) params.append("size", String(filters.size));

    const response = await apiClient.get<BaseResponse<PageResponse<BackendAuditLog>>>(
      `/admin/audit-logs?${params.toString()}`
    );

    const data = response.data?.data;

    const mapBackendLog = (log: BackendAuditLog): AuditLog => {
      // Parse timestamp (handles ISO string and Spring Boot LocalDateTime array format)
      let timestamp = new Date().toISOString();
      const dateVal = log.createdAt || log.timestamp;
      if (dateVal) {
        if (Array.isArray(dateVal)) {
          const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = dateVal;
          timestamp = new Date(year, month - 1, day, hour, minute, second, ms).toISOString();
        } else {
          timestamp = new Date(dateVal).toISOString();
        }
      }

      // Dynamically build user-friendly details if not provided by backend
      let details = log.details || "";
      if (!details) {
        const actionText = (log.action || "").toLowerCase().replace(/_/g, " ");
        const entityLabel = log.entityType || "entity";
        let entityName = "";

        if (log.afterSnapshot) {
          try {
            const parsed = JSON.parse(log.afterSnapshot);
            entityName = parsed.name || parsed.title || parsed.prompt || parsed.email || parsed.label || parsed.description || "";
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }

        const parts = [`Performed ${actionText} on ${entityLabel}`];
        if (entityName) {
          parts.push(`"${entityName}"`);
        } else if (log.entityId) {
          parts.push(`(ID: ${log.entityId})`);
        }
        details = parts.join(" ");
      }

      return {
        id: log.id || String(Math.random()),
        actor: log.actor || "system",
        action: log.action || "UNKNOWN",
        details: details,
        ipAddress: log.ipAddress || "—",
        status: log.status || "SUCCESS",
        timestamp: timestamp,
        beforeSnapshot: log.beforeSnapshot,
        afterSnapshot: log.afterSnapshot,
      };
    };

    if (data && typeof data === "object" && "content" in data) {
      return {
        ...data,
        content: (data.content || []).map(mapBackendLog),
      };
    }

    // Return structured default pagination wrapper if backend structure is direct or missing wrapper
    const rawContent = Array.isArray(data) ? data : [];
    return {
      content: rawContent.map(mapBackendLog),
      totalElements: rawContent.length,
      totalPages: 1,
      size: filters.size || 20,
      number: filters.page || 0,
      last: true,
      first: true,
      empty: rawContent.length === 0,
    };
  },
};
