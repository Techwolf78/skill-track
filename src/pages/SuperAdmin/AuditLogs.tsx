import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search,
  Download,
  Clock,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Server,
  Database,
  Eye,
  Copy,
  Check,
  Sparkles,
  Layers,
  FileCode,
  FileText,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { formatDateTime, getTodayDateString } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { auditLogService, AuditLog } from "@/lib/audit-log-service";
import { stripHtml, cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Fallback dataset for sandbox demonstration
const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-13T12:45:00Z",
    actor: "superadmin@gryphon360.com",
    action: "CREATE_ORGANISATION",
    details: "Created new organisation: 'Tata Consultancy Services' (TCS)",
    ipAddress: "192.168.1.10",
    status: "SUCCESS",
    beforeSnapshot: undefined,
    afterSnapshot:
      '{"name":"Tata Consultancy Services","code":"TCS","description":"Global IT services provider","status":"ACTIVE"}',
  },
  {
    id: "log-2",
    timestamp: "2026-06-13T12:40:12Z",
    actor: "superadmin@gryphon360.com",
    action: "CREATE_USER",
    details: "Created user: 'ajay.pawar@gryphon360.com' as ADMIN",
    ipAddress: "192.168.1.10",
    status: "SUCCESS",
    beforeSnapshot: undefined,
    afterSnapshot:
      '{"email":"ajay.pawar@gryphon360.com","role":"ADMIN","name":"Ajay Pawar","status":"ACTIVE"}',
  },
  {
    id: "log-3",
    timestamp: "2026-06-13T11:30:45Z",
    actor: "admin@tata.com",
    action: "CREATE_TEST",
    details:
      "Created test assessment: 'Java & Spring Boot Core Skills Level 1'",
    ipAddress: "203.0.113.5",
    status: "SUCCESS",
    beforeSnapshot: undefined,
    afterSnapshot:
      '{"title":"Java & Spring Boot Core Skills Level 1","duration":60,"status":"ACTIVE","maxAttempts":1}',
  },
  {
    id: "log-4",
    timestamp: "2026-06-13T10:15:33Z",
    actor: "admin@tata.com",
    action: "BULK_UPLOAD_CANDIDATES",
    details: "Uploaded Excel candidate list: 120 candidates added successfully",
    ipAddress: "203.0.113.5",
    status: "SUCCESS",
  },
  {
    id: "log-5",
    timestamp: "2026-06-13T09:22:10Z",
    actor: "superadmin@gryphon360.com",
    action: "DELETE_USER",
    details: "Deleted user 'testuser@gryphon360.com'",
    ipAddress: "192.168.1.10",
    status: "SUCCESS",
    beforeSnapshot:
      '{"email":"testuser@gryphon360.com","role":"CANDIDATE","name":"Test User","status":"ACTIVE"}',
    afterSnapshot: undefined,
  },
  {
    id: "log-6",
    timestamp: "2026-06-12T17:45:00Z",
    actor: "superadmin@gryphon360.com",
    action: "UPDATE_ORGANISATION",
    details: "Updated organisation logo URL for 'Infosys Technologies'",
    ipAddress: "12.43.51.88",
    status: "SUCCESS",
    beforeSnapshot:
      '{"name":"Infosys Technologies","logoUrl":"http://old-logo.png","active":true}',
    afterSnapshot:
      '{"name":"Infosys Technologies","logoUrl":"https://new-logo.png","active":true}',
  },
  {
    id: "log-7",
    timestamp: "2026-06-12T16:12:05Z",
    actor: "admin@infosys.com",
    action: "CREATE_TEST_SCHEDULE",
    details: "Scheduled test 'React Development' for 2026-06-20",
    ipAddress: "198.51.100.12",
    status: "SUCCESS",
    beforeSnapshot: undefined,
    afterSnapshot:
      '{"testId":"test-react","scheduledDate":"2026-06-20T09:00:00Z","duration":120}',
  },
  {
    id: "log-8",
    timestamp: "2026-06-12T14:02:18Z",
    actor: "admin@infosys.com",
    action: "DELETE_TEST",
    details:
      "Attempted to delete test 'Draft Assessment' - Failed: Test has active submissions",
    ipAddress: "198.51.100.12",
    status: "FAILED",
    beforeSnapshot:
      '{"title":"Draft Assessment","status":"DRAFT","questionsCount":5}',
    afterSnapshot: undefined,
  },
  {
    id: "log-9",
    timestamp: "2026-06-12T11:08:44Z",
    actor: "superadmin@gryphon360.com",
    action: "MUTATE_PUBLIC_TAXONOMY",
    details: "Added new subtopic 'Microservices' to Topic 'Spring Boot'",
    ipAddress: "12.43.51.88",
    status: "SUCCESS",
    beforeSnapshot: '{"name":"Spring Boot","subtopics":[]}',
    afterSnapshot: '{"name":"Spring Boot","subtopics":["Microservices"]}',
  },
  {
    id: "log-10",
    timestamp: "2026-06-12T09:05:00Z",
    actor: "admin@tata.com",
    action: "UPDATE_TEST",
    details:
      "Updated instructions for 'Java & Spring Boot Core Skills Level 1'",
    ipAddress: "203.0.113.5",
    status: "SUCCESS",
    beforeSnapshot:
      '{"title":"Java & Spring Boot Core Skills Level 1","instructions":"Please solve all 4 coding questions.","duration":60}',
    afterSnapshot:
      '{"title":"Java & Spring Boot Core Skills Level 1","instructions":"Please solve all 4 coding questions. Do not use external aid.","duration":90}',
  },
];

// Snapshot Diff Analysis Engine
export type DiffChangeType = "CREATED" | "DELETED" | "MODIFIED" | "SCALAR" | "NO_SNAPSHOT";

export interface SnapshotChange {
  key: string;
  beforeVal: unknown;
  afterVal: unknown;
  isNew?: boolean;
  isDeleted?: boolean;
}

export interface DiffResult {
  type: DiffChangeType;
  changes: SnapshotChange[];
  beforeRaw?: unknown;
  afterRaw?: unknown;
  totalBeforeKeys: number;
  totalAfterKeys: number;
  summaryText: string;
}

function parseSnapshotValue(str?: string): unknown {
  if (!str || typeof str !== "string" || str.trim() === "") return undefined;
  const trimmed = str.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function computeSnapshotDiff(beforeStr?: string, afterStr?: string): DiffResult {
  const beforeVal = parseSnapshotValue(beforeStr);
  const afterVal = parseSnapshotValue(afterStr);

  const hasBefore =
    beforeVal !== undefined &&
    beforeVal !== null &&
    (typeof beforeVal !== "string" || beforeVal.trim() !== "");
  const hasAfter =
    afterVal !== undefined &&
    afterVal !== null &&
    (typeof afterVal !== "string" || afterVal.trim() !== "");

  if (!hasBefore && !hasAfter) {
    return {
      type: "NO_SNAPSHOT",
      changes: [],
      beforeRaw: beforeVal,
      afterRaw: afterVal,
      totalBeforeKeys: 0,
      totalAfterKeys: 0,
      summaryText: "No payload",
    };
  }

  const isBeforeObj = isPlainObject(beforeVal);
  const isAfterObj = isPlainObject(afterVal);

  if (isBeforeObj || isAfterObj) {
    const beforeObj = isBeforeObj ? (beforeVal as Record<string, unknown>) : {};
    const afterObj = isAfterObj ? (afterVal as Record<string, unknown>) : {};

    const ignoreKeys = [
      "id",
      "createdAt",
      "updatedAt",
      "createdDate",
      "lastModifiedDate",
      "version",
      "_class",
    ];

    const beforeKeys = Object.keys(beforeObj).filter((k) => !ignoreKeys.includes(k));
    const afterKeys = Object.keys(afterObj).filter((k) => !ignoreKeys.includes(k));
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

    const changes: SnapshotChange[] = [];

    for (const key of allKeys) {
      const b = beforeObj[key];
      const a = afterObj[key];

      const bStr = JSON.stringify(b);
      const aStr = JSON.stringify(a);

      if (bStr !== aStr) {
        changes.push({
          key,
          beforeVal: b,
          afterVal: a,
          isNew: b === undefined && a !== undefined,
          isDeleted: b !== undefined && a === undefined,
        });
      }
    }

    if (!hasBefore && hasAfter) {
      return {
        type: "CREATED",
        changes,
        beforeRaw: beforeVal,
        afterRaw: afterVal,
        totalBeforeKeys: 0,
        totalAfterKeys: afterKeys.length,
        summaryText: `${afterKeys.length} properties initialized`,
      };
    }

    if (hasBefore && !hasAfter) {
      return {
        type: "DELETED",
        changes,
        beforeRaw: beforeVal,
        afterRaw: afterVal,
        totalBeforeKeys: beforeKeys.length,
        totalAfterKeys: 0,
        summaryText: `Deleted entity (${beforeKeys.length} props)`,
      };
    }

    return {
      type: changes.length > 0 ? "MODIFIED" : "NO_SNAPSHOT",
      changes,
      beforeRaw: beforeVal,
      afterRaw: afterVal,
      totalBeforeKeys: beforeKeys.length,
      totalAfterKeys: afterKeys.length,
      summaryText:
        changes.length === 1 ? "1 field modified" : `${changes.length} fields modified`,
    };
  }

  // Primitive scalar values
  const isChanged = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
  const changes: SnapshotChange[] = isChanged
    ? [
        {
          key: "Payload",
          beforeVal,
          afterVal,
          isNew: !hasBefore && hasAfter,
          isDeleted: hasBefore && !hasAfter,
        },
      ]
    : [];

  return {
    type: "SCALAR",
    changes,
    beforeRaw: beforeVal,
    afterRaw: afterVal,
    totalBeforeKeys: hasBefore ? 1 : 0,
    totalAfterKeys: hasAfter ? 1 : 0,
    summaryText: isChanged ? "Value payload updated" : "No value change",
  };
}

export default function AuditLogs() {
  const { toast } = useToast();

  // Selected Log for Inspection Dialog
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search, Filter and Pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // Applied query filters
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedAction, setAppliedAction] = useState("all");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");

  const setPresetRange = (
    preset: "today" | "yesterday" | "last7" | "last30" | "thisMonth"
  ) => {
    const today = new Date();
    let range: DateRange | undefined;
    if (preset === "today") {
      range = { from: today, to: today };
    } else if (preset === "yesterday") {
      const yesterday = subDays(today, 1);
      range = { from: yesterday, to: yesterday };
    } else if (preset === "last7") {
      range = { from: subDays(today, 6), to: today };
    } else if (preset === "last30") {
      range = { from: subDays(today, 29), to: today };
    } else if (preset === "thisMonth") {
      range = { from: startOfMonth(today), to: endOfMonth(today) };
    }
    setDateRange(range);
    if (range?.from) {
      const s = format(range.from, "yyyy-MM-dd");
      const e = range.to ? format(range.to, "yyyy-MM-dd") : s;
      setStartDate(s);
      setEndDate(e);
    }
  };

  const handleApplyFilters = () => {
    const start = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : startDate;
    const end = dateRange?.to
      ? format(dateRange.to, "yyyy-MM-dd")
      : dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : endDate;

    setAppliedSearch(searchTerm);
    setAppliedAction(actionFilter);
    setAppliedStart(start);
    setAppliedEnd(end);
    setStartDate(start);
    setEndDate(end);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setActionFilter("all");
    setDateRange(undefined);
    setStartDate("");
    setEndDate("");
    setAppliedSearch("");
    setAppliedAction("all");
    setAppliedStart("");
    setAppliedEnd("");
    setPage(0);
    toast({
      title: "Filters Cleared",
      description: "Showing all audit logs.",
    });
  };

  // Fetch using react-query
  const {
    data: apiData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "auditLogs",
      { actor: appliedSearch, start: appliedStart, end: appliedEnd, page, size },
    ],
    queryFn: () =>
      auditLogService.getAuditLogs({
        actor: appliedSearch,
        start: appliedStart ? `${appliedStart}T00:00:00` : undefined,
        end: appliedEnd ? `${appliedEnd}T23:59:59` : undefined,
        page,
        size,
      }),
    retry: 1,
  });

  const [showSimulation, setShowSimulation] = useState(false);
  const hasApiContent = apiData && apiData.content && apiData.content.length > 0;
  const isUsingFallback = showSimulation && !hasApiContent;

  // Filter local mock data if using fallback
  const getFilteredMockLogs = () => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const matchesSearch =
        !appliedSearch ||
        log.actor.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(appliedSearch.toLowerCase());

      const logTime = new Date(log.timestamp).getTime();
      const matchesStart =
        !appliedStart || logTime >= new Date(appliedStart).getTime();
      const matchesEnd =
        !appliedEnd || logTime <= new Date(`${appliedEnd}T23:59:59`).getTime();

      const matchesAction =
        appliedAction === "all" ||
        log.action.toUpperCase().includes(appliedAction.toUpperCase());

      return matchesSearch && matchesStart && matchesEnd && matchesAction;
    });
  };

  const filteredMockLogs = getFilteredMockLogs();
  const mockTotalElements = filteredMockLogs.length;
  const mockTotalPages = Math.max(1, Math.ceil(mockTotalElements / size));

  const allVisibleLogs = isUsingFallback
    ? filteredMockLogs.slice(page * size, (page + 1) * size)
    : (apiData?.content || []).filter((log) => {
        const matchesAction =
          appliedAction === "all" ||
          log.action.toUpperCase().includes(appliedAction.toUpperCase());
        const matchesSearch =
          !appliedSearch ||
          log.actor.toLowerCase().includes(appliedSearch.toLowerCase()) ||
          log.details.toLowerCase().includes(appliedSearch.toLowerCase());
        return matchesAction && matchesSearch;
      });

  const totalElements = isUsingFallback
    ? mockTotalElements
    : apiData?.totalElements || allVisibleLogs.length;
  const totalPages = isUsingFallback
    ? mockTotalPages
    : apiData?.totalPages || 1;

  // Copy helper with feedback
  const handleCopyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast({
      title: "Copied to Clipboard",
      description: `Copied ${keyName} to clipboard.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Standard platform action badge matching Users & Organisations theme
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.startsWith("CREATE")) {
      return (
        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
          {action}
        </span>
      );
    }
    if (
      act.startsWith("UPDATE") ||
      act.startsWith("MUTATE") ||
      act.startsWith("PATCH")
    ) {
      return (
        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
          {action}
        </span>
      );
    }
    if (act.startsWith("DELETE")) {
      return (
        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
          {action}
        </span>
      );
    }
    if (act.startsWith("BULK")) {
      return (
        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium rounded inline-flex items-center gap-1">
        {action}
      </span>
    );
  };

  // Clean diff summary badge
  const renderDiffSummaryBadge = (diff: DiffResult) => {
    switch (diff.type) {
      case "CREATED":
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-medium rounded inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            {diff.summaryText}
          </span>
        );
      case "MODIFIED":
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-medium rounded inline-flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-600" />
            {diff.summaryText}
          </span>
        );
      case "DELETED":
        return (
          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px] font-medium rounded inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500" />
            {diff.summaryText}
          </span>
        );
      case "SCALAR":
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-medium rounded inline-flex items-center gap-1">
            <FileCode className="w-3 h-3 text-slate-500" />
            {diff.summaryText}
          </span>
        );
      default:
        return (
          <span className="text-xs text-slate-400 font-mono">
            —
          </span>
        );
    }
  };

  // Format value for visual diff renderer
  const formatDiffValue = (val: unknown) => {
    if (val === undefined) {
      return <span className="italic text-slate-400 text-xs">— (Not set)</span>;
    }
    if (val === null) {
      return <span className="italic text-slate-400 text-xs">null</span>;
    }
    if (typeof val === "boolean") {
      return (
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
            val
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          {val ? "true" : "false"}
        </span>
      );
    }
    if (typeof val === "object") {
      return (
        <pre className="font-mono text-[11px] whitespace-pre-wrap break-all bg-slate-50 p-2.5 rounded border border-slate-200 max-h-36 overflow-y-auto text-slate-800">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return <span className="font-mono text-xs break-all font-medium text-slate-800">{String(val)}</span>;
  };

  // Helper to format payload object with nested stringified JSON parsed
  const getFormattedPayload = (log: AuditLog) => {
    return {
      id: log.id,
      timestamp: log.timestamp,
      actor: log.actor,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      status: log.status,
      beforeSnapshot: parseSnapshotValue(log.beforeSnapshot),
      afterSnapshot: parseSnapshotValue(log.afterSnapshot),
    };
  };

  // Export to Excel function
  const handleExportLogs = () => {
    const logsToExport = isUsingFallback
      ? filteredMockLogs
      : apiData?.content || [];

    if (logsToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No logs found matching the current filters.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = logsToExport.map((log) => {
      const diff = computeSnapshotDiff(log.beforeSnapshot, log.afterSnapshot);
      return {
        "Timestamp (IST)": log.timestamp,
        "Formatted Time": formatDateTime(log.timestamp),
        "Actor Email": log.actor,
        "Action Type": log.action,
        Details: stripHtml(log.details),
        "Change Scope": diff.summaryText,
        "IP Address": log.ipAddress || "N/A",
        Status: log.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet["!autofilter"] = { ref: `A1:H1` };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

    const colWidths = Object.keys(formattedData[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...formattedData.map(
          (row) => String(row[key as keyof typeof row] || "").length
        )
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = colWidths;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const date = getTodayDateString();
    saveAs(file, `AuditLogs_${date}.xlsx`);

    toast({
      title: "Logs Exported",
      description: `Successfully downloaded Excel sheet with ${logsToExport.length} entries.`,
    });
  };

  // Selected Log Diff Result
  const selectedDiff = selectedLog
    ? computeSnapshotDiff(selectedLog.beforeSnapshot, selectedLog.afterSnapshot)
    : null;

  return (
    <div className="p-8 space-y-6 animate-fade-in font-sans">
      {/* Header - Matching Users & Organisations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-bold text-slate-900">
              System Audit Logs
            </h1>
            {isUsingFallback ? (
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded inline-flex items-center gap-1.5 shadow-2xs">
                <Database className="w-3 h-3 text-amber-600" />
                Sandbox Mode
              </span>
            ) : hasApiContent ? (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded inline-flex items-center gap-1.5 shadow-2xs">
                <Server className="w-3 h-3 text-emerald-600" />
                Backend Live
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium rounded inline-flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-slate-400" />
                Offline
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Track, inspect, and analyze system actions and administrator changes in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {showSimulation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSimulation(false);
                toast({
                  title: "Simulation Deactivated",
                  description: "Cleared simulated logs.",
                });
              }}
              className="h-9 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded"
            >
              Clear Simulation
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLogs}
            className="h-9 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Export Logs
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4 rounded"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor or event details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
            className="pl-10 h-10 text-xs border-slate-200 focus-visible:ring-slate-400 bg-white"
          />
        </div>

        {/* Action Filter */}
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44 h-10 text-xs border-slate-200 bg-white">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">CREATE</SelectItem>
            <SelectItem value="UPDATE">UPDATE / PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="BULK">BULK</SelectItem>
            <SelectItem value="SUBMIT">SUBMIT / CALCULATE</SelectItem>
          </SelectContent>
        </Select>

        {/* Modern Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-10 justify-start text-left font-normal border-slate-200 bg-white hover:bg-slate-50 text-xs gap-2 min-w-[240px] shadow-2xs",
                !dateRange?.from && "text-slate-500"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <span className="text-slate-900 font-semibold">
                    {format(dateRange.from, "MMM dd, yyyy")} –{" "}
                    {format(dateRange.to, "MMM dd, yyyy")}
                  </span>
                ) : (
                  <span className="text-slate-900 font-semibold">
                    {format(dateRange.from, "MMM dd, yyyy")}
                  </span>
                )
              ) : (
                <span>Filter by date range...</span>
              )}
              {dateRange?.from && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRange(undefined);
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="ml-auto hover:bg-slate-100 rounded-full p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50 flex flex-col sm:flex-row overflow-hidden"
            align="start"
          >
            {/* Quick Presets Sidebar */}
            <div className="p-3 border-b sm:border-b-0 sm:border-r border-slate-100 flex flex-col gap-1 min-w-[130px] bg-slate-50/50">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Quick Select
              </span>
              <button
                type="button"
                onClick={() => setPresetRange("today")}
                className="text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPresetRange("yesterday")}
                className="text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setPresetRange("last7")}
                className="text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setPresetRange("last30")}
                className="text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => setPresetRange("thisMonth")}
                className="text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                This Month
              </button>
              {dateRange?.from && (
                <button
                  type="button"
                  onClick={() => {
                    setDateRange(undefined);
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors mt-2 border-t border-slate-100 pt-2"
                >
                  Reset Dates
                </button>
              )}
            </div>
            <div className="p-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from || new Date()}
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setStartDate(range?.from ? format(range.from, "yyyy-MM-dd") : "");
                  setEndDate(
                    range?.to
                      ? format(range.to, "yyyy-MM-dd")
                      : range?.from
                      ? format(range.from, "yyyy-MM-dd")
                      : ""
                  );
                }}
                numberOfMonths={1}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="default"
          onClick={handleApplyFilters}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-10 px-4 rounded"
        >
          Apply Filters
        </Button>

        {(searchTerm ||
          actionFilter !== "all" ||
          startDate ||
          endDate ||
          dateRange?.from) && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-xs h-10 px-3 text-slate-500 hover:text-slate-900"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Main Table - Pure Light Theme matching Users & Organisations */}
      <div className="rounded-lg border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider pl-4 w-[170px]">
                Timestamp (IST)
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider w-[240px]">
                Actor
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider w-[140px]">
                Action
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider min-w-[280px]">
                Event Details
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider w-[170px]">
                Changes Scope
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider w-[120px]">
                IP Address
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider text-center w-[90px]">
                Status
              </TableHead>
              <TableHead className="text-[11.5px] font-bold text-slate-700 py-3 uppercase tracking-wider text-right pr-4 w-[90px]">
                Inspect
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-20 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Fetching secure audit records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-16 text-rose-500"
                >
                  <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                    <div className="p-2.5 bg-rose-50 rounded-full text-rose-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">
                      Failed to load audit records
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                      className="text-xs rounded border-slate-200"
                    >
                      Retry Connection
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : allVisibleLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-20 text-muted-foreground text-xs"
                >
                  <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                    <p>No audit logs found matching your criteria.</p>
                    {!showSimulation && (
                      <Button
                        onClick={() => {
                          setShowSimulation(true);
                          toast({
                            title: "Sandbox Mode Activated",
                            description: "Showing simulated demo audit records.",
                          });
                        }}
                        className="text-xs bg-slate-900 text-white font-semibold rounded h-8 px-3"
                      >
                        Show Sandbox Mock Data
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              allVisibleLogs.map((log) => {
                const diff = computeSnapshotDiff(
                  log.beforeSnapshot,
                  log.afterSnapshot
                );

                return (
                  <TableRow
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors group cursor-pointer"
                  >
                    {/* Timestamp */}
                    <TableCell className="pl-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="whitespace-nowrap font-medium text-slate-800">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actor */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2 max-w-[240px]">
                        <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                          {log.actor.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className="text-xs font-semibold text-slate-900 truncate"
                          title={log.actor}
                        >
                          {log.actor}
                        </span>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="py-3">{getActionBadge(log.action)}</TableCell>

                    {/* Details */}
                    <TableCell className="py-3">
                      <span className="text-xs text-slate-800 leading-tight line-clamp-2 font-medium">
                        {stripHtml(log.details)}
                      </span>
                    </TableCell>

                    {/* Changes Scope */}
                    <TableCell className="py-3">{renderDiffSummaryBadge(diff)}</TableCell>

                    {/* IP */}
                    <TableCell className="py-3">
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {log.ipAddress || "—"}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3 text-center">
                      {log.status === "SUCCESS" ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold rounded inline-flex items-center gap-1">
                          FAILED
                        </span>
                      )}
                    </TableCell>

                    {/* Inspect Button */}
                    <TableCell className="py-3 text-right pr-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="h-7 px-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inspect</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {allVisibleLogs.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {page * size + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-800">
                {Math.min((page + 1) * size, totalElements)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {totalElements}
              </span>{" "}
              audit entries
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <Select
                  value={String(size)}
                  onValueChange={(val) => {
                    setSize(Number(val));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-16 h-7 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder={String(size)} />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 border-slate-200 bg-white"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 font-medium text-slate-700">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 border-slate-200 bg-white"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Audit Details Dialog - Clean White Dialog matching Users.tsx & Organisations.tsx */}
      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="sm:max-w-[700px] w-full max-w-[95vw] bg-white text-slate-900 p-6 max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Complete breakdown of user action, payload mutations, and captured state diffs.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && selectedDiff && (
            <div className="space-y-4 py-3">
              {/* Event Profile Card */}
              <div className="flex items-center justify-between p-3 bg-slate-50/75 border border-slate-200/80 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-2xs shrink-0">
                    {selectedLog.actor.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedLog.actor}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {formatDateTime(selectedLog.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getActionBadge(selectedLog.action)}
                  {selectedLog.status === "SUCCESS" ? (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded">
                      SUCCESS
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold rounded">
                      FAILED
                    </span>
                  )}
                </div>
              </div>

              {/* Core Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5 font-medium">Log ID</p>
                  <p className="text-xs font-mono font-semibold text-slate-800 truncate" title={selectedLog.id}>
                    {selectedLog.id}
                  </p>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5 font-medium">IP Address</p>
                  <p className="text-xs font-mono font-semibold text-slate-800">
                    {selectedLog.ipAddress || "—"}
                  </p>
                </div>

                <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60">
                  <p className="text-[11px] text-slate-500 mb-0.5 font-medium">Change Scope</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedDiff.summaryText}
                  </p>
                </div>
              </div>

              {/* Operation Narrative Card */}
              <div className="p-3 rounded-md border border-slate-200/80 bg-slate-50/60 space-y-1">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Operation Narrative
                </p>
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {stripHtml(selectedLog.details)}
                </p>
              </div>

              {/* Tabs for Visual Diff and JSON Payloads */}
              <Tabs defaultValue="diff" className="w-full space-y-3 pt-1">
                <TabsList className="grid grid-cols-4 w-full h-9 bg-slate-100 p-0.5 text-xs text-slate-600 rounded">
                  <TabsTrigger value="diff" className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs rounded">
                    Visual Diff
                  </TabsTrigger>
                  <TabsTrigger value="before" className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs rounded">
                    Before
                  </TabsTrigger>
                  <TabsTrigger value="after" className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs rounded">
                    After
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs rounded">
                    Full JSON
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Visual Diff */}
                <TabsContent value="diff" className="space-y-3 pt-1">
                  {selectedDiff.type === "NO_SNAPSHOT" ? (
                    <div className="text-center py-10 px-4 rounded-md border border-dashed border-slate-200 bg-slate-50/50">
                      <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        No Snapshot Diff Recorded
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        This action does not capture before/after payload states.
                      </p>
                    </div>
                  ) : selectedDiff.type === "CREATED" ? (
                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Initial Entity State ({selectedDiff.totalAfterKeys} properties set)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 rounded font-bold">
                          INITIAL STATE
                        </span>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 text-xs">
                        {selectedDiff.changes.map((change) => (
                          <div
                            key={change.key}
                            className="p-2.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                          >
                            <span className="font-mono text-xs font-semibold text-slate-700 min-w-[160px]">
                              {change.key}
                            </span>
                            <div className="text-xs text-slate-800 font-mono">
                              {formatDiffValue(change.afterVal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedDiff.type === "DELETED" ? (
                    <div className="space-y-2.5">
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-xs font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Deleted Record ({selectedDiff.totalBeforeKeys} properties removed)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-rose-100 rounded font-bold">
                          DELETED
                        </span>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 text-xs">
                        {selectedDiff.changes.map((change) => (
                          <div
                            key={change.key}
                            className="p-2.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                          >
                            <span className="font-mono text-xs font-semibold text-slate-700 min-w-[160px]">
                              {change.key}
                            </span>
                            <div className="text-xs text-slate-800 font-mono">
                              {formatDiffValue(change.beforeVal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* MODIFIED / SCALAR Diff Cards */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Modified Properties ({selectedDiff.changes.length})
                        </span>
                      </div>

                      {selectedDiff.changes.map((change) => (
                        <div
                          key={change.key}
                          className="rounded-md border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {change.key}
                            </span>
                            {change.isNew ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded">
                                Added
                              </span>
                            ) : change.isDeleted ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold rounded">
                                Removed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded">
                                Modified
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                            {/* Before (Old) */}
                            <div className="p-2.5 rounded bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-0.5">
                              <p className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">
                                Before (Old)
                              </p>
                              <div>{formatDiffValue(change.beforeVal)}</div>
                            </div>

                            {/* After (New) */}
                            <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-0.5">
                              <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                                After (New)
                              </p>
                              <div>{formatDiffValue(change.afterVal)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Before Snapshot (JSON) */}
                <TabsContent value="before" className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Pre-Operation State (JSON)
                    </span>
                    {selectedLog.beforeSnapshot && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const parsed = parseSnapshotValue(selectedLog.beforeSnapshot);
                          handleCopyText(JSON.stringify(parsed, null, 2), "Before Snapshot");
                        }}
                        className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 rounded"
                      >
                        {copiedKey === "Before Snapshot" ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy JSON
                      </Button>
                    )}
                  </div>

                  {selectedLog.beforeSnapshot ? (
                    <pre className="font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-800 p-4 rounded-md border border-slate-200 overflow-x-auto overflow-y-auto max-h-80 whitespace-pre-wrap break-all w-full select-text">
                      {JSON.stringify(
                        parseSnapshotValue(selectedLog.beforeSnapshot),
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    <div className="text-center py-10 px-4 rounded-md border border-dashed border-slate-200 bg-slate-50/50">
                      <p className="text-xs text-slate-500">
                        No prior snapshot recorded.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: After Snapshot (JSON) */}
                <TabsContent value="after" className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Post-Operation State (JSON)
                    </span>
                    {selectedLog.afterSnapshot && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const parsed = parseSnapshotValue(selectedLog.afterSnapshot);
                          handleCopyText(JSON.stringify(parsed, null, 2), "After Snapshot");
                        }}
                        className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 rounded"
                      >
                        {copiedKey === "After Snapshot" ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy JSON
                      </Button>
                    )}
                  </div>

                  {selectedLog.afterSnapshot ? (
                    <pre className="font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-800 p-4 rounded-md border border-slate-200 overflow-x-auto overflow-y-auto max-h-80 whitespace-pre-wrap break-all w-full select-text">
                      {JSON.stringify(
                        parseSnapshotValue(selectedLog.afterSnapshot),
                        null,
                        2
                      )}
                    </pre>
                  ) : (
                    <div className="text-center py-10 px-4 rounded-md border border-dashed border-slate-200 bg-slate-50/50">
                      <p className="text-xs text-slate-500">
                        No post-operation snapshot recorded.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 4: Full Log (JSON) */}
                <TabsContent value="raw" className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Complete Audit Entry (JSON)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopyText(
                          JSON.stringify(getFormattedPayload(selectedLog), null, 2),
                          "Full Payload"
                        )
                      }
                      className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 rounded"
                    >
                      {copiedKey === "Full Payload" ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copy Payload
                    </Button>
                  </div>

                  <pre className="font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-800 p-4 rounded-md border border-slate-200 overflow-x-auto overflow-y-auto max-h-80 whitespace-pre-wrap break-all w-full select-text">
                    {JSON.stringify(getFormattedPayload(selectedLog), null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => setSelectedLog(null)}
              className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
