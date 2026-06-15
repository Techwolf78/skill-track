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
  ChevronRight,
  GraduationCap,
  Sparkles,
} from "lucide-react";

// Mock data fallbacks if no real candidate sessions are graded yet
const mockTopPerformers = [
  {
    rank: 1,
    name: "Sneha Gupta",
    college: "Tech College",
    batch: "CSE 2025",
    score: 95,
  },
  {
    rank: 2,
    name: "Priya Patel",
    college: "ABC Engineering",
    batch: "CSE 2024",
    score: 92,
  },
  {
    rank: 3,
    name: "Rahul Sharma",
    college: "ABC Engineering",
    batch: "CSE 2024",
    score: 88,
  },
  {
    rank: 4,
    name: "Amit Kumar",
    college: "XYZ Institute",
    batch: "IT 2024",
    score: 85,
  },
  {
    rank: 5,
    name: "Vikram Singh",
    college: "ABC Engineering",
    batch: "MCA 2024",
    score: 82,
  },
];

const mockBatchPerformance = [
  {
    batch: "CSE 2024",
    college: "ABC Engineering",
    students: 45,
    avgScore: 78,
    passRate: 89,
  },
  {
    batch: "IT 2024",
    college: "XYZ Institute",
    students: 32,
    avgScore: 72,
    passRate: 84,
  },
  {
    batch: "CSE 2025",
    college: "Tech College",
    students: 60,
    avgScore: 81,
    passRate: 92,
  },
  {
    batch: "MCA 2024",
    college: "ABC Engineering",
    students: 28,
    avgScore: 68,
    passRate: 75,
  },
];

const mockTopicWise = [
  { topic: "Data Structures", avgScore: 75, difficulty: "Medium" },
  { topic: "Algorithms", avgScore: 68, difficulty: "Hard" },
  { topic: "Python", avgScore: 82, difficulty: "Easy" },
  { topic: "Java", avgScore: 71, difficulty: "Medium" },
  { topic: "SQL", avgScore: 79, difficulty: "Medium" },
];

const RESULT_POLL_INTERVAL_MS = 3000;
const MAX_RESULT_POLL_ATTEMPTS = 40;

export default function Reports() {
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

  // Fetch all initial data
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
      const { data: blob, filename } = await testService.downloadScorecard(sid);
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
    setSessionStates((prev) => ({
      ...prev,
      [sid]: {
        status: "POLLING",
        message: "Recalculating results...",
        result: null,
      },
    }));

    try {
      const response = await testService.calculateResultWithStatus(sid, cid);
      const statusCode = response.statusCode || response.status;
      if (statusCode === 202) {
        startPollingSession(sid);
      } else {
        setSessionStates((prev) => ({
          ...prev,
          [sid]: {
            status: "SUCCESS",
            message: "Result calculated successfully.",
            result: response.data,
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

  // Filters sessions for the selected schedule
  const filteredSessions = useMemo(
    () => sessions.filter((s) => s.scheduleId === selectedScheduleId),
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

  // Load results once when a schedule is selected, avoiding infinite loops
  useEffect(() => {
    if (!selectedScheduleId || filteredSessions.length === 0) return;

    let cancelled = false;

    // Filter to only trigger load for sessions that are NOT already fetching/fetched
    const sessionsToFetch = filteredSessions.filter((session) => {
      const currentState = sessionStates[session.id];
      return (
        !currentState ||
        (currentState.status !== "SUCCESS" && currentState.status !== "POLLING")
      );
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
    if (!isUsingRealData) return 78; // Fallback to mock
    const sum = realResults.reduce((acc, curr) => acc + curr.percentage, 0);
    return Math.round(sum / realResults.length);
  }, [realResults, isUsingRealData]);

  // Real Pass Rate
  const passRate = useMemo(() => {
    if (!isUsingRealData) return 84; // Fallback to mock
    const passedCount = realResults.filter((r) => r.passed).length;
    return Math.round((passedCount / realResults.length) * 100);
  }, [realResults, isUsingRealData]);

  // Real Top Performers
  const computedTopPerformers = useMemo(() => {
    if (!isUsingRealData) return mockTopPerformers;

    // Sort descending by percentage
    const sortedResults = [...realResults].sort(
      (a, b) => b.percentage - a.percentage,
    );

    return sortedResults.slice(0, 5).map((res, index) => {
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
    if (!isUsingRealData) return mockBatchPerformance;

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

  // Real Test-Wise Performance
  const computedTopicWise = useMemo(() => {
    if (!isUsingRealData) return mockTopicWise;

    const testGroups: Record<
      string,
      { sumScore: number; count: number; difficulty: string }
    > = {};

    realResults.forEach((res) => {
      const session = sessions.find((s) => s.id === res.testSessionId);
      const schedule = schedules.find((s) => s.id === session?.scheduleId);
      const testTitle = schedule?.test?.title || "Test Evaluation";
      const difficulty = schedule?.test?.difficulty || "MEDIUM";

      if (!testGroups[testTitle]) {
        testGroups[testTitle] = { sumScore: 0, count: 0, difficulty };
      }

      testGroups[testTitle].sumScore += res.percentage;
      testGroups[testTitle].count += 1;
    });

    return Object.entries(testGroups).map(([title, stats]) => ({
      topic: title,
      avgScore: Math.round(stats.sumScore / stats.count),
      difficulty: stats.difficulty.toLowerCase(),
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
          {/* Data Source Indicator */}
          <div className="flex items-center justify-between p-3 px-4 rounded-xl border border-primary/20 bg-primary/5 text-xs font-semibold text-primary">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>
                {isUsingRealData
                  ? "Showing Live Production Data compiled from candidate evaluations."
                  : "No completed candidate test results found. Showing demo preview simulation."}
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-extrabold border-primary/30 text-primary"
            >
              {isUsingRealData ? "Live" : "Preview Mode"}
            </Badge>
          </div>

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
                  {averageScore}%
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-xs text-muted-foreground font-semibold justify-between">
                  <span>Target Benchmark: 70%</span>
                  <span
                    className={
                      averageScore >= 70 ? "text-green-500" : "text-yellow-500"
                    }
                  >
                    {averageScore >= 70 ? "On Track" : "Below Target"}
                  </span>
                </div>
                <Progress value={averageScore} className="h-1.5 bg-muted" />
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
                  {passRate}%
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-xs text-muted-foreground font-semibold justify-between">
                  <span>Target Pass Rate: 75%</span>
                </div>
                <Progress value={passRate} className="h-1.5 bg-muted" />
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
            <Card className="border-border/60 shadow-sm lg:col-span-5 bg-card/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Highest scoring candidates from graded evaluations
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="border-t">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="w-12 text-center">Rank</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedTopPerformers.map((perf) => (
                        <TableRow
                          key={perf.rank}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          <TableCell className="text-center font-bold text-muted-foreground">
                            {perf.rank}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">
                                {perf.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {perf.college} • {perf.batch}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {perf.score}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Batch Performance */}
            <Card className="border-border/60 shadow-sm lg:col-span-7 bg-card/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Institution Performance
                </CardTitle>
                <CardDescription>
                  Average performance tracked across active colleges
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="border-t">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead className="text-center">
                          Candidates
                        </TableHead>
                        <TableHead className="text-center">Avg Score</TableHead>
                        <TableHead className="text-right">Pass Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedBatchPerformance.map((batch, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">
                                {batch.batch}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {batch.college}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold">
                            {batch.students}
                          </TableCell>
                          <TableCell className="text-center text-sm font-bold text-foreground">
                            {batch.avgScore}%
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold">
                              {batch.passRate}% Pass
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Topic / Test Strengths */}
          <Card className="border-border/60 shadow-sm bg-card/30">
            <CardHeader>
              <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Assessment-Wise Performance Analysis
              </CardTitle>
              <CardDescription>
                Average score distribution mapped to each test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {computedTopicWise.map((topic, index) => (
                  <div
                    key={index}
                    className="space-y-2 p-4 border rounded-xl bg-background/50 hover:bg-background/80 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-foreground">
                        {topic.topic}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs uppercase font-bold tracking-wider px-2 py-0.5"
                      >
                        {topic.difficulty}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Average Score:</span>
                      <span className="font-bold text-primary">
                        {topic.avgScore}%
                      </span>
                    </div>
                    <Progress value={topic.avgScore} className="h-2 bg-muted" />
                  </div>
                ))}
              </div>
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

                {/* Schedule Selector */}
                <div className="lg:col-span-5 space-y-1.5">
                  <Label
                    htmlFor="scheduleSelect"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Select Test Schedule
                  </Label>
                  {loadingData ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-lg bg-muted/20 h-10">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      Loading schedules...
                    </div>
                  ) : (
                    <Select
                      value={selectedScheduleId}
                      onValueChange={setSelectedScheduleId}
                    >
                      <SelectTrigger
                        id="scheduleSelect"
                        className="h-10 border-border/80"
                      >
                        <SelectValue placeholder="-- Select a Schedule --" />
                      </SelectTrigger>
                      <SelectContent>
                        {schedules.map((sch) => {
                          const dateStr = sch.startTime
                            ? new Date(sch.startTime).toLocaleDateString()
                            : "No date";
                          const testTitle = sch.test?.title || "Unknown Test";
                          const testIdAbbrev = sch.testId
                            ? sch.testId.slice(0, 8)
                            : "N/A";
                          return (
                            <SelectItem key={sch.id} value={sch.id}>
                              <span className="font-semibold text-foreground mr-1.5">
                                {testTitle}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/80 px-1 py-0.5 rounded mr-2">
                                ID: {testIdAbbrev}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({dateStr})
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
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
                  </div>

                  {searchedAndFilteredSessions.length === 0 ? (
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
                            <TableHead>Candidate</TableHead>
                            <TableHead>Session ID</TableHead>
                            <TableHead>Session Status</TableHead>
                            <TableHead>Grading / Score</TableHead>
                            <TableHead className="text-right pr-6">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchedAndFilteredSessions.map((session) => {
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
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        startPollingSession(session.id)
                                      }
                                      disabled={state.status === "POLLING"}
                                      className="h-8 text-xs border-primary/20 hover:bg-primary/5"
                                    >
                                      Fetch Result
                                    </Button>
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
                                      variant="ghost"
                                      onClick={() =>
                                        handleForceGenerate(
                                          session.id,
                                          session.candidateId,
                                        )
                                      }
                                      disabled={state.status === "POLLING"}
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
