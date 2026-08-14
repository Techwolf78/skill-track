import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { testService } from "@/lib/test-service";
import type {
  TestResult,
  TestScheduleExtended,
  TestSession,
} from "@/lib/test-service";
import { candidateService } from "@/lib/candidate-service";
import type { Candidate } from "@/lib/candidate-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Search,
  BookOpen,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";

// Mock data fallbacks removed for production

const RESULT_POLL_INTERVAL_MS = 3000;
const MAX_RESULT_POLL_ATTEMPTS = 40;

export default function Reports() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<TestScheduleExtended[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");

  const [loadingData, setLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState("");

  // Advanced Manual Mode States
  const [manualSessionId, setManualSessionId] = useState("");
  const [manualCandidateId, setManualCandidateId] = useState("");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Schedule Combobox state
  const [scheduleComboboxOpen, setScheduleComboboxOpen] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");

  // Candidate Inspector Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [sortField, setSortField] = useState<"name" | "startTime" | "status" | "score">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Status mapping for each session ID
  const [sessionStates, setSessionStates] = useState<
    Record<
      string,
      {
        status: "IDLE" | "POLLING" | "SUCCESS" | "ERROR";
        message: string;
        result: TestResult | null;
      }
    >
  >({});

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfLoadingSessionId, setPdfLoadingSessionId] = useState<string | null>(
    null,
  );
  const pollingRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch all initial data from real backend services
  const loadAllData = async () => {
    try {
      setLoadingData(true);
      setErrorLoadingData("");
      const [schedulesData, candidatesData, sessionsData, testsData] =
        await Promise.all([
          testService.getAllTestSchedules(),
          candidateService.getCandidates(),
          testService.getAllSessions(),
          testService.getAllTests(),
        ]);

      // Map test titles into schedules
      const schedulesWithTests = schedulesData.map((sch) => {
        const test = testsData.find((t) => t.id === sch.testId);
        return {
          ...sch,
          test: test || sch.test,
        };
      });

      setSchedules(schedulesWithTests);
      setCandidates(candidatesData);
      setSessions(sessionsData);

      // Pre-select first schedule if available
      if (schedulesWithTests.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(schedulesWithTests[0].id);
      }

      // Proactively fetch results for all EVALUATED or SUBMITTED sessions to build overview analytics
      const evaluatedSessions = sessionsData.filter(
        (s) => s.status === "EVALUATED" || s.status === "SUBMITTED",
      );

      // Fetch in parallel using Promise.allSettled to ensure individual failures don't block others
      const resultsMap: Record<
        string,
        {
          status: "IDLE" | "POLLING" | "SUCCESS" | "ERROR";
          message: string;
          result: TestResult | null;
        }
      > = {};

      await Promise.allSettled(
        evaluatedSessions.map(async (session) => {
          try {
            const res = await testService.getResultBySessionId(session.id);
            if (res) {
              resultsMap[session.id] = {
                status: "SUCCESS",
                message: "Result loaded.",
                result: res,
              };
            }
          } catch {
            // Result might not be calculated yet
          }
        }),
      );

      setSessionStates((prev) => ({ ...prev, ...resultsMap }));
    } catch (err: unknown) {
      console.error("Failed to load reports data:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "Failed to load schedules, candidates, or test sessions.";
      setErrorLoadingData(errMsg);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const currentRefs = pollingRefs.current;
    return () => {
      // Clean up all active timers on unmount
      Object.values(currentRefs).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewScorecard = async (sid: string) => {
    try {
      setPdfLoadingSessionId(sid);
      console.log(`[Scorecard PDF Request] Downloading PDF scorecard for session ID:`, sid);
      const sessionObj = sessions.find((s) => s.id === sid);
      const candObj = sessionObj ? getCandidateForSession(sessionObj.candidateId) : null;
      const sessionState = sessionStates[sid];
      console.log(`[Scorecard Data Summary]`, {
        sessionId: sid,
        candidateName: candObj?.user?.name || "Unknown",
        candidateEmail: candObj?.user?.email || "No Email",
        status: sessionObj?.status,
        result: sessionState?.result,
        totalScore: sessionState?.result?.totalScore,
        maxScore: sessionState?.result?.maxScore,
        percentage: sessionState?.result?.percentage,
        passFailStatus: sessionState?.result?.passed ? "PASSED" : "FAILED",
      });

      const { data: blob, filename } = await testService.downloadScorecard(sid);
      console.log(`[Scorecard Download Success] Received PDF Blob for file: ${filename}, Size: ${blob.size} bytes`);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error
          ? error.message
          : "Scorecard PDF is not available yet.";
      console.error(`[Scorecard Download Error] Failed to download scorecard PDF:`, error);
      window.alert(errMsg);
    } finally {
      setPdfLoadingSessionId(null);
    }
  };

  // Polling logic for a specific session ID
  const startPollingSession = (sid: string) => {
    if (pollingRefs.current[sid]) {
      clearTimeout(pollingRefs.current[sid]);
      delete pollingRefs.current[sid];
    }

    setSessionStates((prev) => ({
      ...prev,
      [sid]: {
        status: "POLLING",
        message: "Fetching / Polling results...",
        result: null,
      },
    }));

    const poll = async (attempt = 1) => {
      try {
        const response = await testService.pollResultBySessionId(sid);
        const statusCode = response.statusCode || response.status;

        if (statusCode === 202) {
          if (attempt >= MAX_RESULT_POLL_ATTEMPTS) {
            delete pollingRefs.current[sid];
            setSessionStates((prev) => ({
              ...prev,
              [sid]: {
                status: "ERROR",
                message:
                  response.message ||
                  "Result is still not available after polling.",
                result: null,
              },
            }));
            return;
          }

          pollingRefs.current[sid] = setTimeout(
            () => poll(attempt + 1),
            RESULT_POLL_INTERVAL_MS,
          );
        } else if (statusCode === 200) {
          delete pollingRefs.current[sid];
          setSessionStates((prev) => ({
            ...prev,
            [sid]: {
              status: "SUCCESS",
              message: "Result fetched successfully.",
              result: response.data,
            },
          }));
        } else {
          delete pollingRefs.current[sid];
          setSessionStates((prev) => ({
            ...prev,
            [sid]: {
              status: "ERROR",
              message: response.message || "Unknown error",
              result: null,
            },
          }));
        }
      } catch (error: unknown) {
        delete pollingRefs.current[sid];
        const errMsg =
          error instanceof Error ? error.message : "Failed to fetch results";
        setSessionStates((prev) => ({
          ...prev,
          [sid]: { status: "ERROR", message: errMsg, result: null },
        }));
      }
    };

    poll();
  };

  // Force grade calculation
  const handleForceGenerate = async (sid: string, cid: string) => {
    const existingResult = sessionStates[sid]?.result;
    if (existingResult) {
      const confirmRecalculate = window.confirm(
        `A scorecard already exists for this candidate with a score of ${existingResult.totalScore}/${existingResult.maxScore}. Are you sure you want to recalculate and overwrite it?`
      );
      if (!confirmRecalculate) return;
    }

    setSessionStates((prev) => ({
      ...prev,
      [sid]: {
        status: "POLLING",
        message: "Recalculating results...",
        result: null,
      },
    }));

    try {
      const response = (await testService.recalculateTestResult(sid)) as any;
      const statusCode = response?.statusCode || response?.status;
      if (statusCode === 202) {
        startPollingSession(sid);
      } else {
        setSessionStates((prev) => ({
          ...prev,
          [sid]: {
            status: "SUCCESS",
            message: "Result calculated successfully.",
            result: response?.data || response,
          },
        }));
      }
    } catch (error: unknown) {
      let statusCode: number | undefined;
      let message = "";
      if (typeof error === "object" && error !== null) {
        statusCode = (error as { response?: { status?: number } }).response
          ?.status;
        message = (error as { message?: string }).message || "";
      }
      if (
        statusCode === 409 ||
        message.toLowerCase().includes("already exists")
      ) {
        try {
          const existingResult = await testService.getResultBySessionId(sid);
          setSessionStates((prev) => ({
            ...prev,
            [sid]: {
              status: "SUCCESS",
              message: "Existing result loaded.",
              result: existingResult,
            },
          }));
          return;
        } catch {
          // Fall through
        }
      }

      setSessionStates((prev) => ({
        ...prev,
        [sid]: {
          status: "ERROR",
          message: message || "Failed to trigger grading",
          result: null,
        },
      }));
    }
  };

  // Selected schedule object & Search filtering for 200+ schedules dropdown
  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.id === selectedScheduleId),
    [schedules, selectedScheduleId]
  );

  const filteredSchedulesBySearch = useMemo(() => {
    if (!scheduleSearchQuery.trim()) return schedules;
    const q = scheduleSearchQuery.toLowerCase();
    return schedules.filter((sch) => {
      const title = sch.test?.title?.toLowerCase() || "";
      const testId = sch.testId?.toLowerCase() || "";
      const schId = sch.id?.toLowerCase() || "";
      const dateStr = sch.startTime
        ? new Date(sch.startTime).toLocaleDateString().toLowerCase()
        : "";
      return (
        title.includes(q) ||
        testId.includes(q) ||
        schId.includes(q) ||
        dateStr.includes(q)
      );
    });
  }, [schedules, scheduleSearchQuery]);

  // Filters sessions for the selected schedule (or all 550+ sessions when ALL_SCHEDULES is selected)
  const filteredSessions = useMemo(
    () => {
      if (!selectedScheduleId || selectedScheduleId === "ALL_SCHEDULES") {
        return sessions;
      }
      return sessions.filter((s) => s.scheduleId === selectedScheduleId);
    },
    [sessions, selectedScheduleId],
  );

  // Search and status filter logic for candidates list
  const searchedAndFilteredSessions = useMemo(() => {
    return filteredSessions.filter((session) => {
      const cand = candidates.find((c) => c.id === session.candidateId);
      const name = cand?.user?.name || "";
      const email = cand?.user?.email || "";
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        session.id.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "ALL" || session.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [filteredSessions, candidates, searchQuery, statusFilter]);

  // Reset to Page 1 when filters or selected schedule change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedScheduleId]);

  // Sort candidate sessions
  const sortedSessions = useMemo(() => {
    return [...searchedAndFilteredSessions].sort((a, b) => {
      const candA = candidates.find((c) => c.id === a.candidateId);
      const candB = candidates.find((c) => c.id === b.candidateId);
      const nameA = candA?.user?.name || "";
      const nameB = candB?.user?.name || "";

      if (sortField === "name") {
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      if (sortField === "startTime") {
        const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "status") {
        return sortOrder === "asc"
          ? (a.status || "").localeCompare(b.status || "")
          : (b.status || "").localeCompare(a.status || "");
      }
      if (sortField === "score") {
        const scoreA = sessionStates[a.id]?.result?.percentage ?? -1;
        const scoreB = sessionStates[b.id]?.result?.percentage ?? -1;
        return sortOrder === "asc" ? scoreA - scoreB : scoreB - scoreA;
      }
      return 0;
    });
  }, [searchedAndFilteredSessions, candidates, sortField, sortOrder, sessionStates]);

  // Paginated Candidate Sessions
  const totalPages = Math.ceil(sortedSessions.length / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedSessions = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return sortedSessions.slice(startIdx, startIdx + pageSize);
  }, [sortedSessions, safePage, pageSize]);

  // Export filtered candidate session data to CSV
  const handleExportCSV = () => {
    if (sortedSessions.length === 0) return;

    const headers = [
      "Candidate Name",
      "Email",
      "Institution",
      "Session ID",
      "Schedule Title",
      "Start Time",
      "Status",
      "Score Percentage",
      "Pass / Fail",
    ];

    const rows = sortedSessions.map((session) => {
      const cand = candidates.find((c) => c.id === session.candidateId);
      const schedule = schedules.find((s) => s.id === session.scheduleId);
      const state = sessionStates[session.id];
      const percentage = state?.result?.percentage ?? "N/A";
      const passedStr = state?.result ? (state.result.passed ? "PASSED" : "FAILED") : "N/A";

      return [
        `"${(cand?.user?.name || "N/A").replace(/"/g, '""')}"`,
        `"${(cand?.user?.email || "N/A").replace(/"/g, '""')}"`,
        `"${(cand?.organisation?.name || "General Group").replace(/"/g, '""')}"`,
        `"${session.id}"`,
        `"${(schedule?.test?.title || "N/A").replace(/"/g, '""')}"`,
        `"${session.startedAt ? new Date(session.startedAt).toLocaleString() : "N/A"}"`,
        `"${session.status || "N/A"}"`,
        `"${percentage !== "N/A" ? `${percentage}%` : "N/A"}"`,
        `"${passedStr}"`,
      ].join(",");
    });

    const csvData = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `candidate_session_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load results once when a schedule is selected, avoiding infinite loops
  useEffect(() => {
    if (!selectedScheduleId || filteredSessions.length === 0) return;

    let cancelled = false;

    // Filter to only trigger load for sessions that are NOT already checked (i.e. no state exists)
    const sessionsToFetch = filteredSessions.filter((session) => {
      return !sessionStates[session.id];
    });

    if (sessionsToFetch.length === 0) return;

    sessionsToFetch.forEach(async (session) => {
      try {
        setSessionStates((prev) => {
          // Guard against overwriting success or polling
          if (
            prev[session.id]?.status === "SUCCESS" ||
            prev[session.id]?.status === "POLLING"
          ) {
            return prev;
          }
          return {
            ...prev,
            [session.id]: {
              status: "POLLING",
              message: "Loading result...",
              result: null,
            },
          };
        });

        const response = await testService.pollResultBySessionId(session.id);
        const statusCode = response.statusCode || response.status;

        if (cancelled) return;

        if (statusCode === 200 && response.data) {
          setSessionStates((prev) => ({
            ...prev,
            [session.id]: {
              status: "SUCCESS",
              message: "Result loaded.",
              result: response.data,
            },
          }));
        } else {
          setSessionStates((prev) => ({
            ...prev,
            [session.id]: {
              status: "IDLE",
              message: "Not graded.",
              result: null,
            },
          }));
        }
      } catch {
        if (cancelled) return;
        setSessionStates((prev) => ({
          ...prev,
          [session.id]: {
            status: "ERROR",
            message: "Result not available.",
            result: null,
          },
        }));
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScheduleId, filteredSessions]);

  const getCandidateForSession = (candidateId: string) => {
    return candidates.find((c) => c.id === candidateId);
  };

  const getSessionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-green-500/10 text-green-500 border-green-500/20",
      STARTED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      SUBMITTED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      EVALUATED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      EXPIRED: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return styles[status] || "bg-gray-500/10 text-gray-500";
  };

  // ==================== REAL ANALYTICS CALCULATIONS ====================

  // Check if we have any successfully loaded real test results
  const realResults = useMemo(() => {
    return Object.values(sessionStates)
      .filter((s) => s.status === "SUCCESS" && s.result)
      .map((s) => s.result!);
  }, [sessionStates]);

  const isUsingRealData = realResults.length > 0;

  // Real Average Score
  const averageScore = useMemo(() => {
    if (!isUsingRealData) return 0;
    const sum = realResults.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(sum / realResults.length);
  }, [realResults, isUsingRealData]);

  // Real Pass Rate
  const passRate = useMemo(() => {
    if (!isUsingRealData) return 0;
    const passedCount = realResults.filter((r) => r.passed).length;
    return Math.round((passedCount / realResults.length) * 100);
  }, [realResults, isUsingRealData]);

  // Real Top Performers
  // Real Top Performers (Top 15 candidates)
  const computedTopPerformers = useMemo(() => {
    if (!isUsingRealData) return [];

    // Sort descending by percentage, tie-breaking by totalScore
    const sortedResults = [...realResults].sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return b.totalScore - a.totalScore;
    });

    return sortedResults.slice(0, 15).map((res, index) => {
      const cand = candidates.find((c) => c.id === res.candidateId);
      const name = cand?.user?.name || "Candidate";
      const college = cand?.organisation?.name || "Institution";

      const session = sessions.find((s) => s.id === res.testSessionId);
      const schedule = schedules.find((s) => s.id === session?.scheduleId);
      const testTitle = schedule?.test?.title || "Assessment";

      return {
        rank: index + 1,
        name,
        college,
        batch: testTitle,
        score: Math.round(res.percentage),
      };
    });
  }, [realResults, candidates, sessions, schedules, isUsingRealData]);

  // Real Batch / Institution Performance
  const computedBatchPerformance = useMemo(() => {
    if (!isUsingRealData) return [];

    const orgGroups: Record<
      string,
      { count: number; totalPercentage: number; passed: number }
    > = {};

    realResults.forEach((res) => {
      const cand = candidates.find((c) => c.id === res.candidateId);
      const orgName = cand?.organisation?.name || "General Group";

      if (!orgGroups[orgName]) {
        orgGroups[orgName] = { count: 0, totalPercentage: 0, passed: 0 };
      }

      orgGroups[orgName].count += 1;
      orgGroups[orgName].totalPercentage += res.percentage;
      if (res.passed) {
        orgGroups[orgName].passed += 1;
      }
    });

    return Object.entries(orgGroups).map(([name, stats]) => ({
      batch: name,
      college: "Institution",
      students: stats.count,
      avgScore: Math.round(stats.totalPercentage / stats.count),
      passRate: Math.round((stats.passed / stats.count) * 100),
    }));
  }, [realResults, candidates, isUsingRealData]);

  // Real Test-Wise Performance (Grouped cleanly by base test title)
  const computedTopicWise = useMemo(() => {
    if (!isUsingRealData) return [];

    const testGroups: Record<
      string,
      { sumScore: number; count: number; difficulty: string; candidateCount: number }
    > = {};

    realResults.forEach((res) => {
      const session = sessions.find((s) => s.id === res.testSessionId);
      const schedule = schedules.find((s) => s.id === session?.scheduleId);
      const testTitle = schedule?.test?.title || "Test Evaluation";
      // Strip (Batch #X) to group cleanly by assessment name
      const cleanTitle = testTitle.replace(/\s*\(Batch\s*#\d+\)/i, "").trim();
      const difficulty = schedule?.test?.difficulty || "MEDIUM";

      if (!testGroups[cleanTitle]) {
        testGroups[cleanTitle] = {
          sumScore: 0,
          count: 0,
          difficulty,
          candidateCount: 0,
        };
      }

      testGroups[cleanTitle].sumScore += res.percentage;
      testGroups[cleanTitle].count += 1;
      testGroups[cleanTitle].candidateCount += 1;
    });

    return Object.entries(testGroups).map(([title, stats]) => ({
      topic: title,
      avgScore: Math.round(stats.sumScore / stats.count),
      difficulty: stats.difficulty.toLowerCase(),
      candidateCount: stats.candidateCount,
    }));
  }, [realResults, sessions, schedules, isUsingRealData]);

  return (
    <div className="p-8 space-y-6 animate-fade-in w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time evaluation insights, performance metrics, and candidate
            inspection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loadingData}
            className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 h-10 px-4"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`}
            />
            Refresh Dashboard Data
          </Button>
        </div>
      </div>

      {errorLoadingData && (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{errorLoadingData}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs Container */}
      <Tabs defaultValue="overview" className="space-y-6 w-full">
        <TabsList className="bg-muted/50 p-1 border border-border/60 rounded-xl max-w-md w-full grid grid-cols-3">
          <TabsTrigger
            value="overview"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="inspector"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Inspector
          </TabsTrigger>
          <TabsTrigger
            value="debug"
            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Advanced Debug
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: OVERVIEW ANALYTICS ==================== */}
        <TabsContent value="overview" className="space-y-6 outline-none">

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Users className="h-16 w-16" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Total Candidates
                </CardDescription>
                <CardTitle className="text-3xl font-bold font-heading">
                  {candidates.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-green-500 font-semibold gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Pool size across all orgs</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Award className="h-16 w-16" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Average Score
                </CardDescription>
                <CardTitle className="text-3xl font-bold font-heading">
                  {isUsingRealData ? `${averageScore}%` : "No data available"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-xs text-muted-foreground font-semibold justify-between">
                  <span>Target Benchmark: 70%</span>
                  {isUsingRealData && (
                    <span
                      className={
                        averageScore >= 70 ? "text-green-500" : "text-yellow-500"
                      }
                    >
                      {averageScore >= 70 ? "On Track" : "Below Target"}
                    </span>
                  )}
                </div>
                <Progress value={isUsingRealData ? averageScore : 0} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Target className="h-16 w-16" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Pass Rate
                </CardDescription>
                <CardTitle className="text-3xl font-bold font-heading">
                  {isUsingRealData ? `${passRate}%` : "No data available"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-xs text-muted-foreground font-semibold justify-between">
                  <span>Target Pass Rate: 75%</span>
                </div>
                <Progress value={isUsingRealData ? passRate : 0} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <BookOpen className="h-16 w-16" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Schedules Active
                </CardDescription>
                <CardTitle className="text-3xl font-bold font-heading">
                  {schedules.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>
                    {schedules.filter((s) => s.status === "LIVE").length}{" "}
                    currently live
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grid Layout for details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Performers */}
            <Card className="border-border/60 shadow-sm lg:col-span-5 bg-card/30 flex flex-col h-[400px]">
              <CardHeader className="pb-4 shrink-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>
                    Highest scoring candidates from graded evaluations
                  </CardDescription>
                </div>
                {computedTopPerformers.length > 0 && (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 shrink-0">
                    Top {computedTopPerformers.length}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 flex flex-col min-h-0">
                <div className="border-t flex-1 overflow-y-auto min-h-0">
                  <Table>
                    <TableHeader className="bg-muted/20 sticky top-0 z-10 backdrop-blur-md">
                      <TableRow>
                        <TableHead className="w-14 text-center">Rank</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead className="text-right pr-6">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedTopPerformers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                            No data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        computedTopPerformers.map((perf) => {
                          const isTop1 = perf.rank === 1;
                          const isTop2 = perf.rank === 2;
                          const isTop3 = perf.rank === 3;
                          return (
                            <TableRow
                              key={perf.rank}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <TableCell className="text-center">
                                <span
                                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs font-mono ${
                                    isTop1
                                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30"
                                      : isTop2
                                      ? "bg-slate-300/30 text-slate-700 dark:text-slate-300 border border-slate-400/30"
                                      : isTop3
                                      ? "bg-amber-700/20 text-amber-700 dark:text-amber-400 border border-amber-600/30"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : perf.rank}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-sm">
                                    {perf.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                                    {perf.college} • {perf.batch}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6 font-bold text-primary font-mono">
                                {perf.score}%
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Institution Performance */}
            <Card className="border-border/60 shadow-sm lg:col-span-7 bg-card/30 flex flex-col h-[400px]">
              <CardHeader className="pb-4 flex flex-row items-center justify-between shrink-0">
                <div>
                  <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Institution Performance
                  </CardTitle>
                  <CardDescription>
                    Average performance tracked across active colleges
                  </CardDescription>
                </div>
                {computedBatchPerformance.length > 0 && (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 shrink-0">
                    {computedBatchPerformance.length} Colleges
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="px-0 pb-0 flex-1 flex flex-col min-h-0">
                <div className="border-t flex-1 overflow-y-auto min-h-0">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead className="text-center">
                          Candidates
                        </TableHead>
                        <TableHead className="text-center">Avg Score</TableHead>
                        <TableHead className="text-right pr-6">Pass Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedBatchPerformance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                            No data available
                          </TableCell>
                        </TableRow>
                      ) : (
                        computedBatchPerformance.map((batch, index) => (
                          <TableRow
                            key={index}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <TableCell className="font-semibold text-sm">
                              {batch.batch}
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold font-mono">
                              {batch.students}
                            </TableCell>
                            <TableCell className="text-center text-sm font-bold text-foreground font-mono">
                              {batch.avgScore}%
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold font-mono">
                                {batch.passRate}% Pass
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assessment-Wise Performance Analysis */}
          <Card className="border-border/60 shadow-sm bg-card/30">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Assessment-Wise Performance Analysis
                </CardTitle>
                <CardDescription>
                  Average score distribution and benchmark metrics mapped across unique assessments
                </CardDescription>
              </div>
              {computedTopicWise.length > 0 && (
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 shrink-0 self-start md:self-auto">
                  {computedTopicWise.length} Assessments Tracked
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {computedTopicWise.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No assessment data available
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto pr-1.5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {computedTopicWise.map((topic, index) => {
                      const isHighPerformance = topic.avgScore >= 70;
                      const isMediumPerformance = topic.avgScore >= 50 && topic.avgScore < 70;
                      return (
                        <div
                          key={index}
                          className="space-y-3 p-4 border border-border/70 rounded-xl bg-background/60 hover:bg-background/90 transition-all shadow-sm flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                                {topic.topic}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-mono font-bold shrink-0 px-1.5 py-0.5"
                              >
                                {topic.difficulty}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                {topic.candidateCount} candidate(s) evaluated
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1 border-t border-border/40">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Average Score:</span>
                              <Badge
                                className={`font-mono font-bold text-xs ${
                                  isHighPerformance
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : isMediumPerformance
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                }`}
                              >
                                {topic.avgScore}%
                              </Badge>
                            </div>
                            <Progress
                              value={topic.avgScore}
                              className={`h-2 bg-muted ${
                                isHighPerformance
                                  ? "[&>div]:bg-green-500"
                                  : isMediumPerformance
                                  ? "[&>div]:bg-amber-500"
                                  : "[&>div]:bg-rose-500"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 2: CANDIDATE INSPECTOR ==================== */}
        <TabsContent value="inspector" className="space-y-6 outline-none">
          <Card className="border-border/60 bg-card/30">
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold font-heading flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Candidate Session Inspector
                  </CardTitle>
                  <CardDescription>
                    Filter by schedule and search candidate profiles to review
                    performance and scorecards.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={sortedSessions.length === 0}
                  className="gap-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shrink-0 self-start md:self-auto"
                >
                  <Download className="h-4 w-4 text-primary" />
                  Export CSV ({sortedSessions.length})
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Controls Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Search Bar */}
                <div className="lg:col-span-4 space-y-1.5">
                  <Label
                    htmlFor="searchBar"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Search Candidate
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="searchBar"
                      placeholder="Search by name, email, or session..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 border-border/80 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                {/* Schedule Selector Combobox (200-300+ Schedules) */}
                <div className="lg:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="scheduleSelect"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Select Test Schedule
                    </Label>
                    {schedules.length > 0 && (
                      <Badge variant="outline" className="text-[10px] font-mono font-semibold px-1.5 py-0">
                        {schedules.length} total
                      </Badge>
                    )}
                  </div>
                  {loadingData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-lg bg-muted/20 h-10">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      Loading schedules...
                    </div>
                  ) : (
                    <Popover open={scheduleComboboxOpen} onOpenChange={setScheduleComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={scheduleComboboxOpen}
                          className="w-full justify-between h-10 px-3 border-border/80 bg-background/50 hover:bg-background/80 focus:ring-2 focus:ring-primary/20 text-left font-normal text-xs md:text-sm"
                        >
                          {selectedScheduleId === "ALL_SCHEDULES" || !selectedScheduleId ? (
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-bold text-primary truncate">
                                ⚡ All Test Schedules ({schedules.length} Total)
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted/80 px-1.5 py-0.5 rounded">
                                {sessions.length} sessions
                              </span>
                            </div>
                          ) : selectedSchedule ? (
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-foreground truncate">
                                {selectedSchedule.test?.title || "Unknown Test"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted/80 px-1 py-0.5 rounded">
                                ID: {selectedSchedule.testId?.slice(0, 8) || "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0 font-mono">
                                ({selectedSchedule.startTime ? new Date(selectedSchedule.startTime).toLocaleDateString() : "No date"})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Search or select schedule from {schedules.length} schedules...
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 bg-card border-border shadow-2xl rounded-xl z-50">
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Type to search schedules..."
                              value={scheduleSearchQuery}
                              onChange={(e) => setScheduleSearchQuery(e.target.value)}
                              className="pl-9 h-9 border-border/70 text-xs bg-background"
                            />
                            {scheduleSearchQuery && (
                              <button
                                onClick={() => setScheduleSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {/* All Schedules option */}
                            <button
                              onClick={() => {
                                setSelectedScheduleId("ALL_SCHEDULES");
                                setScheduleComboboxOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-left transition-colors font-bold ${
                                selectedScheduleId === "ALL_SCHEDULES" || !selectedScheduleId
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "hover:bg-muted/60 text-foreground"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div>⚡ All Test Schedules ({schedules.length} Schedules)</div>
                                <div className="text-[11px] text-muted-foreground font-mono font-normal">
                                  Show all {sessions.length} candidate sessions across all schedules
                                </div>
                              </div>
                              {(selectedScheduleId === "ALL_SCHEDULES" || !selectedScheduleId) && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </button>

                            {filteredSchedulesBySearch.length === 0 ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">
                                No matching schedules found.
                              </div>
                            ) : (
                              filteredSchedulesBySearch.map((sch) => {
                                const isSelected = sch.id === selectedScheduleId;
                                const dateStr = sch.startTime
                                  ? new Date(sch.startTime).toLocaleDateString()
                                  : "No date";
                                const testTitle = sch.test?.title || "Unknown Test";
                                return (
                                  <button
                                    key={sch.id}
                                    onClick={() => {
                                      setSelectedScheduleId(sch.id);
                                      setScheduleComboboxOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-left transition-colors ${
                                      isSelected
                                        ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                        : "hover:bg-muted/60 text-foreground"
                                    }`}
                                  >
                                    <div className="truncate pr-2">
                                      <div className="font-medium truncate">{testTitle}</div>
                                      <div className="text-[11px] text-muted-foreground font-mono">
                                        ID: {sch.testId?.slice(0, 8)} • {dateStr}
                                      </div>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Status Filter */}
                <div className="lg:col-span-3 space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status Filter
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 border-border/80">
                      <SelectValue placeholder="All Sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="STARTED">Started</SelectItem>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="EVALUATED">Evaluated</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sessions Table Container */}
              {selectedScheduleId && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Matching Sessions</span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs px-2 py-0.5"
                      >
                        {searchedAndFilteredSessions.length} of{" "}
                        {filteredSessions.length}
                      </Badge>
                    </h3>
                  </div>                  {searchedAndFilteredSessions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-xl bg-muted/5">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm font-semibold">
                        No candidate sessions match the current filters.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try resetting the search query or schedule selection.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden bg-background/50">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (sortField === "name") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortField("name");
                                    setSortOrder("asc");
                                  }
                                }}
                                className="h-8 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground -ml-1"
                              >
                                Candidate
                                {sortField === "name" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Session ID
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (sortField === "startTime") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortField("startTime");
                                    setSortOrder("asc");
                                  }
                                }}
                                className="h-8 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground -ml-1"
                              >
                                Start Time
                                {sortField === "startTime" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (sortField === "status") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortField("status");
                                    setSortOrder("asc");
                                  }
                                }}
                                className="h-8 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground -ml-1"
                              >
                                Session Status
                                {sortField === "status" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (sortField === "score") {
                                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setSortField("score");
                                    setSortOrder("asc");
                                  }
                                }}
                                className="h-8 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground -ml-1"
                              >
                                Grading / Score
                                {sortField === "score" ? (
                                  sortOrder === "asc" ? (
                                    <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="text-right pr-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSessions.map((session) => {
                            const cand = getCandidateForSession(
                              session.candidateId,
                            );
                            const candName =
                              cand?.user?.name || "Unknown Candidate";
                            const candEmail = cand?.user?.email || "No Email";
                            const state = sessionStates[session.id] || {
                              status: "IDLE",
                              message: "",
                              result: null,
                            };
                            const isSessionActive =
                              (session.status as string) === "ACTIVE" ||
                              (session.status as string) === "STARTED" ||
                              (session.status as string) === "INACTIVE";

                            const formattedStartedAt = session.startedAt
                              ? new Date(session.startedAt).toLocaleString()
                              : "N/A";

                            return (
                              <TableRow
                                key={session.id}
                                className="hover:bg-muted/5 transition-colors"
                              >
                                <TableCell className="py-4">
                                  <div>
                                    <p className="font-semibold text-sm text-foreground">
                                      {candName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {candEmail}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <span>{session.id.substring(0, 8)}...</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      onClick={() => handleCopy(session.id)}
                                      title="Copy Session ID"
                                    >
                                      {copiedId === session.id ? (
                                        <Check className="h-3 w-3 text-green-500 animate-in zoom-in-50" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground">
                                  {formattedStartedAt}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`${getSessionStatusBadge(session.status)} border shadow-none font-semibold text-xs px-2 py-0.5`}
                                  >
                                    {session.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {state.status === "IDLE" && (
                                    <span className="text-xs text-muted-foreground italic">
                                      Not fetched
                                    </span>
                                  )}
                                  {state.status === "POLLING" && (
                                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      Polling...
                                    </div>
                                  )}
                                  {state.status === "ERROR" && (
                                    <div className="text-xs text-red-500 flex items-center gap-1 font-semibold">
                                      <AlertCircle className="h-3.5 w-3.5" />
                                      {state.message || "Error"}
                                    </div>
                                  )}
                                  {state.status === "SUCCESS" &&
                                    state.result && (
                                      <div className="space-y-1">
                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold text-xs px-2 py-0.5">
                                          {state.result.totalScore} /{" "}
                                          {state.result.maxScore} (
                                          {state.result.percentage.toFixed(1)}%)
                                        </Badge>
                                        <p className="text-[10px] text-muted-foreground">
                                          Status:{" "}
                                          <strong
                                            className={
                                              state.result.passed
                                                ? "text-green-500"
                                                : "text-red-500"
                                            }
                                          >
                                            {state.result.passed
                                              ? "PASSED"
                                              : "FAILED"}
                                          </strong>
                                        </p>
                                      </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex items-center justify-end gap-2">
                                    {state.status !== "SUCCESS" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          startPollingSession(session.id)
                                        }
                                        disabled={
                                          state.status === "POLLING" ||
                                          isSessionActive
                                        }
                                        className="h-8 text-xs border-primary/20 hover:bg-primary/5"
                                      >
                                        Fetch Result
                                      </Button>
                                    )}
                                    {state.status === "SUCCESS" &&
                                      state.result && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleViewScorecard(session.id)
                                          }
                                          disabled={
                                            pdfLoadingSessionId === session.id
                                          }
                                          className="h-8 text-xs"
                                        >
                                          <Download className="h-3.5 w-3.5 mr-1" />
                                          PDF
                                        </Button>
                                      )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        navigate(`/superadmin/proctoring/${session.id}`)
                                      }
                                      className="h-8 text-xs border-orange-500/20 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/10"
                                    >
                                      <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                      Proctoring
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleForceGenerate(
                                          session.id,
                                          session.candidateId,
                                        )
                                      }
                                      disabled={
                                        state.status === "POLLING" ||
                                        isSessionActive
                                      }
                                      className="h-8 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5"
                                    >
                                      Force Grade
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* Pagination Controls Bar */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/20">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            Showing <strong className="text-foreground">{sortedSessions.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</strong> to{" "}
                            <strong className="text-foreground">{Math.min(safePage * pageSize, sortedSessions.length)}</strong> of{" "}
                            <strong className="text-foreground">{sortedSessions.length}</strong> candidate session(s)
                          </span>
                          <div className="flex items-center gap-1.5 ml-2 border-l border-border/80 pl-3">
                            <span>Per page:</span>
                            <Select
                              value={String(pageSize)}
                              onValueChange={(val) => {
                                setPageSize(Number(val));
                                setCurrentPage(1);
                              }}
                            >
                              <SelectTrigger className="h-7 w-[70px] text-xs">
                                <SelectValue placeholder={String(pageSize)} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(1)}
                            disabled={safePage === 1}
                            title="First Page"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            title="Previous Page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-xs font-semibold px-2 font-mono">
                            Page {safePage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            title="Next Page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={safePage === totalPages}
                            title="Last Page"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 3: ADVANCED DEBUG ==================== */}
        <TabsContent value="debug" className="space-y-6 outline-none">
          <Card className="border-border/60 bg-card/30">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                Advanced Session debugger
              </CardTitle>
              <CardDescription>
                Directly interact with database results using raw UUID records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="manualSessionId"
                    className="text-sm font-semibold"
                  >
                    Manual Session ID
                  </Label>
                  <Input
                    id="manualSessionId"
                    placeholder="Enter Session UUID..."
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    className="border-border/80 h-10 font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="manualCandidateId"
                    className="text-sm font-semibold"
                  >
                    Manual Candidate ID (For Force Grading)
                  </Label>
                  <Input
                    id="manualCandidateId"
                    placeholder="Enter Candidate UUID..."
                    value={manualCandidateId}
                    onChange={(e) => setManualCandidateId(e.target.value)}
                    className="border-border/80 h-10 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    if (!manualSessionId) return;
                    startPollingSession(manualSessionId);
                  }}
                  disabled={!manualSessionId}
                  className="h-10 px-5"
                >
                  Poll / Fetch Result
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!manualSessionId || !manualCandidateId) return;
                    handleForceGenerate(manualSessionId, manualCandidateId);
                  }}
                  disabled={!manualSessionId || !manualCandidateId}
                  className="h-10 px-5"
                >
                  Force Generate Result
                </Button>
              </div>

              {manualSessionId && sessionStates[manualSessionId] && (
                <div className="mt-4 p-4 border rounded-xl bg-background/50">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Debug Query Response:
                  </p>
                  {stateDisplayAlert(manualSessionId)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Helper alert status rendering for manual debugger
  function stateDisplayAlert(sid: string) {
    const state = sessionStates[sid];
    if (!state) return null;

    if (state.status === "POLLING") {
      return (
        <Alert className="bg-primary/5 border-primary/20">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <AlertTitle className="font-bold text-sm">Processing</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1">
            {state.message}
          </AlertDescription>
        </Alert>
      );
    }

    if (state.status === "ERROR") {
      return (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold text-sm">Error</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {state.message}
          </AlertDescription>
        </Alert>
      );
    }

    if (state.status === "SUCCESS" && state.result) {
      return (
        <Alert className="bg-green-500/10 border-green-500/20 text-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="font-bold text-sm">Result Ready</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1.5 space-y-1">
            <p>
              Score:{" "}
              <strong className="text-foreground">
                {state.result.totalScore} / {state.result.maxScore}
              </strong>{" "}
              ({state.result.percentage.toFixed(1)}%)
            </p>
            <p>
              Status:{" "}
              <strong
                className={
                  state.result.passed
                    ? "text-green-500 font-bold"
                    : "text-red-500 font-bold"
                }
              >
                {state.result.passed ? "PASSED" : "FAILED"}
              </strong>
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }
}
