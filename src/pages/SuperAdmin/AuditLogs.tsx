import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Search,
  Download,
  Calendar,
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  FileSpreadsheet,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Server,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auditLogService, AuditLog } from "@/lib/audit-log-service";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Rich fallback dataset for sandbox demonstration
const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-13T12:45:00Z",
    actor: "superadmin@rxone.com",
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
    actor: "superadmin@rxone.com",
    action: "CREATE_USER",
    details: "Created user: 'ajay.pawar@rxone.com' as ADMIN",
    ipAddress: "192.168.1.10",
    status: "SUCCESS",
    beforeSnapshot: undefined,
    afterSnapshot:
      '{"email":"ajay.pawar@rxone.com","role":"ADMIN","name":"Ajay Pawar","status":"ACTIVE"}',
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
    actor: "superadmin@rxone.com",
    action: "DELETE_USER",
    details: "Deleted user 'testuser@rxone.com'",
    ipAddress: "192.168.1.10",
    status: "SUCCESS",
    beforeSnapshot:
      '{"email":"testuser@rxone.com","role":"CANDIDATE","name":"Test User","status":"ACTIVE"}',
    afterSnapshot: undefined,
  },
  {
    id: "log-6",
    timestamp: "2026-06-12T17:45:00Z",
    actor: "superadmin@rxone.com",
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
    actor: "superadmin@rxone.com",
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

export default function AuditLogs() {
  const { toast } = useToast();

  // Expanded comparison rows
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedLogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to diff before and after snapshots
  const getSnapshotDiff = (beforeStr?: string, afterStr?: string) => {
    let before: Record<string, unknown> = {};
    let after: Record<string, unknown> = {};

    try {
      if (beforeStr) before = JSON.parse(beforeStr);
    } catch (e) {
      // Ignored parsing error
    }

    try {
      if (afterStr) after = JSON.parse(afterStr);
    } catch (e) {
      // Ignored parsing error
    }

    const ignoreKeys = [
      "id",
      "createdAt",
      "updatedAt",
      "createdDate",
      "lastModifiedDate",
      "version",
    ];
    const allKeys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)]),
    ).filter((key) => !ignoreKeys.includes(key));

    const changes: Array<{ key: string; beforeVal: unknown; afterVal: unknown }> = [];

    for (const key of allKeys) {
      const bVal = before[key];
      const aVal = after[key];

      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        changes.push({
          key,
          beforeVal: bVal,
          afterVal: aVal,
        });
      }
    }

    return changes;
  };

  // Search and Pagination states
  const [actorSearch, setActorSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // Active query parameters (to prevent query firing on every keystroke, or we use dynamic reactive fetching)
  const [filterActor, setFilterActor] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const handleApplyFilters = () => {
    setFilterActor(actorSearch);
    setFilterStart(startDate);
    setFilterEnd(endDate);
    setPage(0);
  };

  const handleClearFilters = () => {
    setActorSearch("");
    setStartDate("");
    setEndDate("");
    setFilterActor("");
    setFilterStart("");
    setFilterEnd("");
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
      { actor: filterActor, start: filterStart, end: filterEnd, page, size },
    ],
    queryFn: () =>
      auditLogService.getAuditLogs({
        actor: filterActor,
        start: filterStart ? `${filterStart}T00:00:00` : undefined,
        end: filterEnd ? `${filterEnd}T23:59:59` : undefined,
        page,
        size,
      }),
    retry: 1,
  });

  // Check if we have active API data. If not (or if empty or failed), fallback to mock data
  const [showSimulation, setShowSimulation] = useState(false);
  const hasApiContent =
    apiData && apiData.content && apiData.content.length > 0;
  // Fallback to mock data only if user explicitly turned on simulation and we have no API content
  const isUsingFallback = showSimulation && !hasApiContent;

  // Filter local mock data if using fallback
  const getFilteredMockLogs = () => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const matchesActor =
        !filterActor ||
        log.actor.toLowerCase().includes(filterActor.toLowerCase());

      const logTime = new Date(log.timestamp).getTime();
      const matchesStart =
        !filterStart || logTime >= new Date(filterStart).getTime();
      const matchesEnd =
        !filterEnd || logTime <= new Date(`${filterEnd}T23:59:59`).getTime();

      return matchesActor && matchesStart && matchesEnd;
    });
  };

  const filteredMockLogs = getFilteredMockLogs();
  const mockTotalElements = filteredMockLogs.length;
  const mockTotalPages = Math.max(1, Math.ceil(mockTotalElements / size));

  // Slice mock logs for current page
  const visibleLogs = isUsingFallback
    ? filteredMockLogs.slice(page * size, (page + 1) * size)
    : apiData?.content || [];

  const totalElements = isUsingFallback
    ? mockTotalElements
    : apiData?.totalElements || 0;
  const totalPages = isUsingFallback
    ? mockTotalPages
    : apiData?.totalPages || 1;

  // Helper to color code log actions
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.startsWith("CREATE")) {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-xs"
        >
          {action}
        </Badge>
      );
    }
    if (
      act.startsWith("UPDATE") ||
      act.startsWith("MUTATE") ||
      act.startsWith("PATCH") ||
      act.startsWith("ACTIVATE") ||
      act.startsWith("DEACTIVATE")
    ) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono text-xs"
        >
          {action}
        </Badge>
      );
    }
    if (act.startsWith("DELETE")) {
      return (
        <Badge
          variant="outline"
          className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-mono text-xs"
        >
          {action}
        </Badge>
      );
    }
    if (act.startsWith("BULK")) {
      return (
        <Badge
          variant="outline"
          className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-mono text-xs"
        >
          {action}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-mono text-xs"
      >
        {action}
      </Badge>
    );
  };

  // Helper to format Date
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

    const formattedData = logsToExport.map((log) => ({
      "Timestamp (UTC)": log.timestamp,
      "Formatted Time": formatDateTime(log.timestamp),
      "Actor Email": log.actor,
      "Action Type": log.action,
      Details: log.details,
      "IP Address": log.ipAddress || "N/A",
      Status: log.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet["!autofilter"] = { ref: `A1:G1` };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

    // Auto-adjust column widths
    const colWidths = Object.keys(formattedData[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...formattedData.map(
          (row) => String(row[key as keyof typeof row] || "").length,
        ),
      );
      return { wch: Math.min(maxLength + 2, 50) }; // limit to max width 50
    });
    worksheet["!cols"] = colWidths;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const date = new Date().toISOString().split("T")[0];
    saveAs(file, `AuditLogs_${date}.xlsx`);

    toast({
      title: "Logs Exported",
      description: `Successfully downloaded Excel sheet with ${logsToExport.length} entries.`,
    });
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">
              System Audit Logs
            </h1>
            {isUsingFallback ? (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 flex items-center gap-1 border-amber-500/20"
              >
                <Database className="w-3.5 h-3.5" />
                Sandbox Demo Data
              </Badge>
            ) : hasApiContent ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 flex items-center gap-1 border-emerald-500/20"
              >
                <Server className="w-3.5 h-3.5" />
                Backend Live
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/10 flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                No Connection
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Track, inspect, and analyze system actions and administrator changes
            in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showSimulation && (
            <Button
              variant="outline"
              onClick={() => {
                setShowSimulation(false);
                toast({
                  title: "Simulation Deactivated",
                  description: "Cleared simulated logs.",
                });
              }}
              className="h-10 text-rose-500 hover:text-rose-600 border-rose-500/20 hover:bg-rose-500/5 bg-transparent"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Clear Simulation
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-10"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="hero" onClick={handleExportLogs} className="h-10">
            <Download className="w-4 h-4 mr-2" />
            Export logs
          </Button>
        </div>
      </div>

      {/* Info Card when using fallback */}
      {isUsingFallback && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 text-sm text-amber-700 dark:text-amber-500">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Backend Audit Log Endpoint Offline or Empty
            </p>
            <p className="text-xs mt-1 text-amber-700/80 dark:text-amber-500/80">
              The application couldn't pull active logs from the server endpoint
              (
              <code className="font-mono bg-amber-500/10 px-1 rounded">
                GET /admin/audit-logs
              </code>
              ) or the server returned an empty dataset. We have automatically
              activated a simulated Sandbox Mode showing system-wide mock
              actions for evaluation.
            </p>
          </div>
        </div>
      )}

      {/* Filter Block */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          Filter Operations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Actor Filter */}
          <div className="space-y-2">
            <Label
              htmlFor="actor"
              className="font-medium text-xs uppercase tracking-wider text-muted-foreground"
            >
              Actor Email
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="actor"
                placeholder="Filter by actor email..."
                value={actorSearch}
                onChange={(e) => setActorSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label
              htmlFor="start"
              className="font-medium text-xs uppercase tracking-wider text-muted-foreground"
            >
              Start Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label
              htmlFor="end"
              className="font-medium text-xs uppercase tracking-wider text-muted-foreground"
            >
              End Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-xs h-9"
          >
            Clear Filters
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="bg-primary hover:opacity-95 text-xs h-9 px-6 text-white shadow-primary"
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Main logs table container */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px] font-semibold py-4">
                Timestamp
              </TableHead>
              <TableHead className="w-[200px] font-semibold">Actor</TableHead>
              <TableHead className="w-[150px] font-semibold">Action</TableHead>
              <TableHead className="w-[280px] font-semibold text-rose-600 dark:text-rose-400">
                Before
              </TableHead>
              <TableHead className="w-[280px] font-semibold text-emerald-600 dark:text-emerald-400">
                After
              </TableHead>
              <TableHead className="w-[130px] font-semibold">
                IP Address
              </TableHead>
              <TableHead className="w-[110px] font-semibold text-center">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-24 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">
                      Fetching secure audit entries...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-24 text-red-500"
                >
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                    <div className="p-3 bg-red-500/10 rounded-full text-red-600">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-heading font-semibold text-lg block text-foreground">
                        Failed to Load Audit Logs
                      </span>
                      <span className="text-xs text-red-500/80 leading-relaxed block font-mono bg-red-500/5 p-3 rounded border border-red-500/10 max-w-sm truncate whitespace-pre-wrap break-words">
                        {error instanceof Error
                          ? error.message
                          : "An unknown error occurred while contacting the server."}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                      className="mt-2 text-xs border-red-500/20 text-red-600 hover:bg-red-500/5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Retry Connection
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : visibleLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-24 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                    <div className="p-3 bg-muted rounded-full">
                      <XCircle className="w-8 h-8 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-heading font-semibold text-lg text-foreground block">
                        No audit logs till now
                      </span>
                      <span className="text-xs text-muted-foreground/80 leading-relaxed block">
                        No secure activity records are currently recorded by the
                        system. You can activate simulated dummy operations to
                        test the filters and search capabilities.
                      </span>
                    </div>
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => {
                        setShowSimulation(true);
                        toast({
                          title: "Simulation Activated",
                          description:
                            "Simulated dummy audit logs are now visible.",
                        });
                      }}
                      className="mt-2 text-xs text-white"
                    >
                      <Activity className="w-3.5 h-3.5 mr-1.5" />
                      Show Dummy Simulations
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              visibleLogs.map((log) => {
                const diffs = getSnapshotDiff(
                  log.beforeSnapshot,
                  log.afterSnapshot,
                );

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="text-xs font-semibold text-foreground max-w-[180px] truncate">
                          {log.actor}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    {diffs.length > 0 ? (
                      <>
                        <TableCell>
                          <div className="space-y-1.5 py-1.5 max-w-[280px]">
                            {diffs.map((diff) => (
                              <div
                                key={diff.key}
                                className="text-[10px] break-all bg-rose-500/5 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-500/10 font-mono"
                              >
                                <span className="font-bold text-rose-800 dark:text-rose-300">
                                  {diff.key}:{" "}
                                </span>
                                {diff.beforeVal !== undefined &&
                                diff.beforeVal !== null ? (
                                  typeof diff.beforeVal === "object" ? (
                                    JSON.stringify(diff.beforeVal)
                                  ) : (
                                    String(diff.beforeVal)
                                  )
                                ) : (
                                  <span className="italic text-muted-foreground/50">
                                    — (Empty)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5 py-1.5 max-w-[280px]">
                            {diffs.map((diff) => (
                              <div
                                key={diff.key}
                                className="text-[10px] break-all bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10 font-mono"
                              >
                                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                  {diff.key}:{" "}
                                </span>
                                {diff.afterVal !== undefined &&
                                diff.afterVal !== null ? (
                                  typeof diff.afterVal === "object" ? (
                                    JSON.stringify(diff.afterVal)
                                  ) : (
                                    String(diff.afterVal)
                                  )
                                ) : (
                                  <span className="italic text-muted-foreground/50">
                                    — (Deleted)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={2}>
                        <span className="text-xs font-medium text-foreground leading-normal block max-w-lg break-words">
                          {log.details}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded w-fit">
                        <Terminal className="w-3 h-3 opacity-60" />
                        {log.ipAddress || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {log.status === "SUCCESS" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold"
                        >
                          SUCCESS
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-rose-500/20 text-[10px] font-bold"
                        >
                          FAILED
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Table Footer / Pagination */}
        {visibleLogs.length > 0 && (
          <div className="border-t bg-muted/20 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {page * size + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min((page + 1) * size, totalElements)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalElements}
              </span>{" "}
              audit entries
            </div>

            <div className="flex items-center gap-6">
              {/* Rows per page */}
              <div className="flex items-center gap-2">
                <span className="text-xs">Rows per page:</span>
                <Select
                  value={String(size)}
                  onValueChange={(val) => {
                    setSize(Number(val));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue placeholder={String(size)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-xs font-semibold px-2">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
