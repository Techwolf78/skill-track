import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { testService } from "@/lib/test-service";
import type { TestResult, TestScheduleExtended, TestSession } from "@/lib/test-service";
import { candidateService } from "@/lib/candidate-service";
import type { Candidate } from "@/lib/candidate-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Download, TrendingUp, TrendingDown, Users, Target, Award, RefreshCw, AlertCircle, CheckCircle2, Copy, Check } from "lucide-react";

const topPerformers = [
  { rank: 1, name: "Sneha Gupta", college: "Tech College", batch: "CSE 2025", score: 95 },
  { rank: 2, name: "Priya Patel", college: "ABC Engineering", batch: "CSE 2024", score: 92 },
  { rank: 3, name: "Rahul Sharma", college: "ABC Engineering", batch: "CSE 2024", score: 88 },
  { rank: 4, name: "Amit Kumar", college: "XYZ Institute", batch: "IT 2024", score: 85 },
  { rank: 5, name: "Vikram Singh", college: "ABC Engineering", batch: "MCA 2024", score: 82 },
];

const batchPerformance = [
  { batch: "CSE 2024", college: "ABC Engineering", students: 45, avgScore: 78, passRate: 89 },
  { batch: "IT 2024", college: "XYZ Institute", students: 32, avgScore: 72, passRate: 84 },
  { batch: "CSE 2025", college: "Tech College", students: 60, avgScore: 81, passRate: 92 },
  { batch: "MCA 2024", college: "ABC Engineering", students: 28, avgScore: 68, passRate: 75 },
];

const topicWise = [
  { topic: "Data Structures", avgScore: 75, difficulty: "Medium" },
  { topic: "Algorithms", avgScore: 68, difficulty: "Hard" },
  { topic: "Python", avgScore: 82, difficulty: "Easy" },
  { topic: "Java", avgScore: 71, difficulty: "Medium" },
  { topic: "SQL", avgScore: 79, difficulty: "Medium" },
];

const RESULT_POLL_INTERVAL_MS = 3000;
const MAX_RESULT_POLL_ATTEMPTS = 40;

function ManualResultFetcher() {
  const [schedules, setSchedules] = useState<TestScheduleExtended[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");

  const [loadingData, setLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState("");

  // Advanced Manual Mode States
  const [manualSessionId, setManualSessionId] = useState("");
  const [manualCandidateId, setManualCandidateId] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Status mapping for each session ID
  const [sessionStates, setSessionStates] = useState<Record<string, {
    status: "IDLE" | "POLLING" | "SUCCESS" | "ERROR";
    message: string;
    result: TestResult | null;
  }>>({});

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfLoadingSessionId, setPdfLoadingSessionId] = useState<string | null>(null);
  const pollingRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch all initial data
  const loadAllData = async () => {
    try {
      setLoadingData(true);
      setErrorLoadingData("");
      const [schedulesData, candidatesData, sessionsData, testsData] = await Promise.all([
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
    } catch (err: any) {
      console.error("Failed to load reports data:", err);
      setErrorLoadingData(err.message || "Failed to load schedules, candidates, or test sessions.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
    return () => {
      // Clean up all active timers on unmount
      Object.values(pollingRefs.current).forEach(clearTimeout);
    };
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewScorecard = async (sid: string) => {
    try {
      setPdfLoadingSessionId(sid);
      const blob = await testService.downloadScorecard(sid);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      window.alert(error.message || "Scorecard PDF is not available yet.");
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

    setSessionStates(prev => ({
      ...prev,
      [sid]: { status: "POLLING", message: "Fetching / Polling results...", result: null }
    }));

    const poll = async (attempt = 1) => {
      try {
        const response = await testService.pollResultBySessionId(sid);
        const statusCode = response.statusCode || response.status;

        if (statusCode === 202) {
          if (attempt >= MAX_RESULT_POLL_ATTEMPTS) {
            delete pollingRefs.current[sid];
            setSessionStates(prev => ({
              ...prev,
              [sid]: {
                status: "ERROR",
                message: response.message || "Result is still not available after polling. Try Force Grade, then poll again.",
                result: null
              }
            }));
            return;
          }

          pollingRefs.current[sid] = setTimeout(
            () => poll(attempt + 1),
            RESULT_POLL_INTERVAL_MS
          );
        } else if (statusCode === 200) {
          delete pollingRefs.current[sid];
          setSessionStates(prev => ({
            ...prev,
            [sid]: { status: "SUCCESS", message: "Result fetched successfully.", result: response.data }
          }));
        } else {
          delete pollingRefs.current[sid];
          setSessionStates(prev => ({
            ...prev,
            [sid]: { status: "ERROR", message: response.message || "Unknown error", result: null }
          }));
        }
      } catch (error: any) {
        delete pollingRefs.current[sid];
        setSessionStates(prev => ({
          ...prev,
          [sid]: { status: "ERROR", message: error.message || "Failed to fetch results", result: null }
        }));
      }
    };

    poll();
  };

  // Force grade calculation
  const handleForceGenerate = async (sid: string, cid: string) => {
    setSessionStates(prev => ({
      ...prev,
      [sid]: { status: "POLLING", message: "Recalculating results...", result: null }
    }));

    try {
      const response = await testService.calculateResultWithStatus(sid, cid);
      const statusCode = response.statusCode || response.status;
      if (statusCode === 202) {
        startPollingSession(sid);
      } else {
        setSessionStates(prev => ({
          ...prev,
          [sid]: { status: "SUCCESS", message: "Result calculated successfully.", result: response.data }
        }));
      }
    } catch (error: any) {
      const statusCode = error.response?.status;
      const message = error.message || "";
      if (statusCode === 409 || message.toLowerCase().includes("already exists")) {
        try {
          const existingResult = await testService.getResultBySessionId(sid);
          setSessionStates(prev => ({
            ...prev,
            [sid]: { status: "SUCCESS", message: "Existing result loaded.", result: existingResult }
          }));
          return;
        } catch {
          // Fall through to the original error if the existing result cannot be loaded.
        }
      }

      setSessionStates(prev => ({
        ...prev,
        [sid]: { status: "ERROR", message: error.message || "Failed to trigger grading", result: null }
      }));
    }
  };

  // Fetch for manual/advanced fields
  const handleManualFetch = () => {
    if (!manualSessionId) return;
    startPollingSession(manualSessionId);
  };

  const handleManualForceGenerate = () => {
    if (!manualSessionId || !manualCandidateId) return;
    handleForceGenerate(manualSessionId, manualCandidateId);
  };

  // Filters sessions for the selected schedule
  const filteredSessions = useMemo(
    () => sessions.filter(s => s.scheduleId === selectedScheduleId),
    [sessions, selectedScheduleId]
  );

  useEffect(() => {
    if (!selectedScheduleId || filteredSessions.length === 0) return;

    let cancelled = false;

    filteredSessions.forEach(async (session) => {
      const currentState = sessionStates[session.id];
      if (currentState?.status === "SUCCESS" || currentState?.status === "POLLING") {
        return;
      }

      try {
        const response = await testService.pollResultBySessionId(session.id);
        const statusCode = response.statusCode || response.status;
        if (!cancelled && statusCode === 200 && response.data) {
          setSessionStates(prev => ({
            ...prev,
            [session.id]: {
              status: "SUCCESS",
              message: "Result loaded.",
              result: response.data
            }
          }));
        }
      } catch {
        // Existing result hydration is best-effort; manual actions still surface errors.
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedScheduleId, filteredSessions, sessionStates]);

  // Helper to map candidate ID to object
  const getCandidateForSession = (candidateId: string) => {
    return candidates.find(c => c.id === candidateId);
  };

  // Status styling for sessions
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

  const renderSessionStateAlert = (sid: string) => {
    const state = sessionStates[sid];
    if (!state) return null;

    if (state.status === "POLLING") {
      return (
        <Alert className="bg-primary/5 border-primary/20">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <AlertTitle>In Progress</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      );
    }

    if (state.status === "ERROR") {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      );
    }

    if (state.status === "SUCCESS" && state.result) {
      return (
        <Alert className="bg-success/10 border-success/30 text-success-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle>Result Ready</AlertTitle>
          <AlertDescription>
            Score: {state.result.totalScore} / {state.result.maxScore} ({state.result.percentage.toFixed(1)}%) —
            Status: <strong className={state.result.passed ? "text-success" : "text-destructive"}>{state.result.passed ? "PASSED" : "FAILED"}</strong>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card className="mt-8 border-primary/20 bg-card">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-6 gap-4 border-b bg-muted/10">
        <div>
          <CardTitle className="text-xl font-heading font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Schedule-Based Test Results & Session Inspector
          </CardTitle>
          <CardDescription>
            Select a test schedule to view active candidate sessions, check grading status, and poll/force result generation.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loadingData}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showManualInput ? "Hide Advanced" : "Advanced Debug"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {errorLoadingData && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorLoadingData}</AlertDescription>
          </Alert>
        )}

        {/* Schedule Selector */}
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="scheduleSelect" className="text-sm font-semibold">Select Test Schedule</Label>
          {loadingData ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md bg-muted/5">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Loading schedules...
            </div>
          ) : (
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
              <SelectTrigger id="scheduleSelect" className="w-full">
                <SelectValue placeholder="-- Select a Schedule --" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((sch) => {
                  const dateStr = sch.startTime ? new Date(sch.startTime).toLocaleDateString() : "No date";
                  const testTitle = sch.test?.title || "Unknown Test";
                  const testIdAbbrev = sch.testId ? sch.testId.slice(0, 8) : "N/A";
                  return (
                    <SelectItem key={sch.id} value={sch.id}>
                      <span className="font-semibold text-foreground mr-1.5">{testTitle}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/80 px-1 py-0.5 rounded mr-2">ID: {testIdAbbrev}...</span>
                      <span className="text-xs text-muted-foreground">
                        (Starts: {dateStr}) — Status: {sch.status}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Advanced Manual Debugger Fallback */}
        {showManualInput && (
          <div className="p-4 border rounded-lg bg-muted/10 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> Advanced Manual Query
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manualSessionId">Manual Session ID</Label>
                <Input
                  id="manualSessionId"
                  placeholder="Paste UUID session ID"
                  value={manualSessionId}
                  onChange={(e) => setManualSessionId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualCandidateId">Manual Candidate ID (For Force Grading)</Label>
                <Input
                  id="manualCandidateId"
                  placeholder="Paste UUID candidate ID"
                  value={manualCandidateId}
                  onChange={(e) => setManualCandidateId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleManualFetch} disabled={!manualSessionId}>
                Poll / Fetch Result
              </Button>
              <Button size="sm" variant="outline" onClick={handleManualForceGenerate} disabled={!manualSessionId || !manualCandidateId}>
                Force Generate Result
              </Button>
            </div>
            {manualSessionId && sessionStates[manualSessionId] && (
              <div className="mt-3">
                {renderSessionStateAlert(manualSessionId)}
              </div>
            )}
          </div>
        )}

        {/* Selected Schedule Sessions Table */}
        {selectedScheduleId && (
          <div className="space-y-4">
            <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
              Candidate Sessions
              <Badge variant="secondary" className="font-mono">
                {filteredSessions.length}
              </Badge>
            </h3>

            {filteredSessions.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg bg-muted/5">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="text-muted-foreground text-sm font-medium">No candidates have started a session for this schedule yet.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Session Status</TableHead>
                      <TableHead>Grading Status / Results</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => {
                      const cand = getCandidateForSession(session.candidateId);
                      const candName = cand?.user?.name || "Unknown Candidate";
                      const candEmail = cand?.user?.email || "No Email";
                      const state = sessionStates[session.id] || { status: "IDLE", message: "", result: null };

                      return (
                        <TableRow key={session.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground">{candName}</p>
                              <p className="text-xs text-muted-foreground">{candEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-muted-foreground select-all">
                                {session.id.substring(0, 8)}...
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => handleCopy(session.id)}
                              >
                                {copiedId === session.id ? (
                                  <Check className="h-3 w-3 text-success animate-in zoom-in-50" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSessionStatusBadge(session.status)}>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {state.status === "IDLE" && (
                              <span className="text-xs text-muted-foreground italic">Not loaded. Click Fetch.</span>
                            )}
                            {state.status === "POLLING" && (
                              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Polling result...
                              </div>
                            )}
                            {state.status === "ERROR" && (
                              <div className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {state.message || "Failed to fetch"}
                              </div>
                            )}
                            {state.status === "SUCCESS" && state.result && (
                              <div className="space-y-1">
                                <Badge className="bg-success/15 text-success-foreground border-success/30 font-medium">
                                  Grade: {state.result.totalScore} / {state.result.maxScore} ({state.result.percentage.toFixed(1)}%)
                                </Badge>
                                <p className="text-[10px] text-muted-foreground">
                                  Status: <strong className={state.result.passed ? "text-success" : "text-destructive"}>
                                    {state.result.passed ? "PASSED" : "FAILED"}
                                  </strong>
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startPollingSession(session.id)}
                                disabled={state.status === "POLLING"}
                                className="h-8 text-xs"
                              >
                                Fetch / Poll
                              </Button>
                              {state.status === "SUCCESS" && state.result && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewScorecard(session.id)}
                                  disabled={pdfLoadingSessionId === session.id}
                                  className="h-8 text-xs"
                                >
                                  <Download className={`h-3.5 w-3.5 mr-1 ${pdfLoadingSessionId === session.id ? "animate-pulse" : ""}`} />
                                  View PDF
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleForceGenerate(session.id, session.candidateId)}
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
  );
}

export default function Reports() {
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Performance insights and detailed reports
          </p>
        </div>
      </div>

      <ManualResultFetcher />
    </div>
  );
}
