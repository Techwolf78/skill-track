import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Clock,
  CheckCircle2,
  Percent,
  BookOpen,
  ArrowRight,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Download,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { candidateService } from "@/lib/candidate-service";
import { testService, TestSession, TestResult, Test } from "@/lib/test-service";
import { toast } from "sonner";

interface EnrichedSession {
  session: TestSession;
  test: Test | null;
  result: TestResult | null;
}

export default function CandidateDashboard() {
  const navigate = useNavigate();

  // Read logged-in user
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const candidateName: string = storedUser?.name || "Candidate";
  const userId: string = storedUser?.id || "";

  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string>("");
  const [enrichedSessions, setEnrichedSessions] = useState<EnrichedSession[]>([]);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Resolve candidate record from userId
      const candidate = await candidateService.getCandidateByUserId(userId);
      if (!candidate) {
        toast.error("Candidate profile not found for your account.");
        setLoading(false);
        return;
      }
      setCandidateId(candidate.id);

      // 2. Load all sessions, tests
      const [allSessions, allTests] = await Promise.all([
        testService.getAllSessions(),
        testService.getAllTests(),
      ]);

      // Filter sessions belonging to this candidate
      const mySessions = allSessions.filter((s) => s.candidateId === candidate.id);

      // 3. Enrich: pair sessions with test info and try to load results
      const enriched: EnrichedSession[] = await Promise.all(
        mySessions.map(async (session) => {
          const test = allTests.find((t) => t.id === session.testId) || null;
          let result: TestResult | null = null;
          try {
            const res = await testService.pollResultBySessionId(session.id);
            const statusCode = res.statusCode || res.status;
            if (statusCode === 200 && res.data) {
              result = res.data;
            }
          } catch {
            // No result yet — that's fine
          }
          return { session, test, result };
        })
      );

      setEnrichedSessions(enriched);
    } catch (err: unknown) {
      toast.error("Failed to load dashboard data: " + ((err as Error).message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadDashboard();
  }, [userId]);

  // Derived KPIs
  const totalAssessments = enrichedSessions.length;
  const completedSessions = enrichedSessions.filter(
    (e) => e.session.status === "SUBMITTED" || e.session.status === "EVALUATED"
  );
  const pendingSessions = enrichedSessions.filter(
    (e) => e.session.status === "STARTED"
  );
  const activeSessions = enrichedSessions.filter(
    (e) => e.session.status === "STARTED"
  );
  const gradedResults = enrichedSessions.filter((e) => e.result !== null).map((e) => e.result!);
  const avgScore =
    gradedResults.length > 0
      ? gradedResults.reduce((sum, r) => sum + r.percentage, 0) / gradedResults.length
      : 0;
  const passedCount = gradedResults.filter((r) => r.passed).length;

  const kpis = [
    { title: "Total Sessions", value: String(totalAssessments), icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Active / Pending", value: String(activeSessions.length), icon: Clock, color: "text-amber-500", bg: "bg-amber-50", highlight: activeSessions.length > 0 },
    { title: "Submitted", value: String(completedSessions.length), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Avg Score", value: gradedResults.length > 0 ? `${avgScore.toFixed(1)}%` : "N/A", icon: Percent, color: "text-indigo-500", bg: "bg-indigo-50" },
    { title: "Passed", value: String(passedCount), icon: Trophy, color: "text-rose-500", bg: "bg-rose-50" },
  ];

  const handleDownloadScorecard = async (sessionId: string) => {
    try {
      setPdfLoadingId(sessionId);
      const blob = await testService.downloadScorecard(sessionId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Scorecard PDF not available yet.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-5 left-1/3 w-64 h-64 bg-accent rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="bg-primary/20 text-primary-foreground border border-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Candidate Workspace
            </span>
            <h2 className="text-3xl font-bold font-heading">
              Welcome back, {candidateName}!
            </h2>
            <p className="text-white/80 max-w-xl text-sm leading-relaxed">
              {loading
                ? "Loading your assessment data..."
                : totalAssessments === 0
                ? "You don't have any test sessions yet. Your trainer will invite you to assessments."
                : `You have ${totalAssessments} test session${totalAssessments !== 1 ? "s" : ""} in total. ${passedCount} passed, ${completedSessions.length} submitted.`}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {gradedResults.length > 0 && (
              <div className="bg-white/10 border border-white/20 backdrop-blur-md px-6 py-4 rounded-xl text-center min-w-[160px]">
                <span className="text-xs text-white/60 block font-medium uppercase tracking-wide">Avg Score</span>
                <span className="text-3xl font-extrabold block text-gradient-primary my-1">{avgScore.toFixed(1)}%</span>
                <Progress value={avgScore} className="h-1.5 bg-white/20 [&>div]:bg-gradient-primary mt-2" />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
              disabled={loading}
              className="border-white/30 text-white hover:bg-white/10 gap-1.5 bg-transparent"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className={`border border-border/60 card-hover relative overflow-hidden ${kpi.highlight ? "ring-2 ring-primary/50" : ""}`}>
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{kpi.title}</span>
                  <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <span className="text-3xl font-extrabold text-foreground tracking-tight">{kpi.value}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Active / Submitted Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">My Test Sessions</h3>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary-hover gap-1">
              <Link to="/candidate/results">
                View Results <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="border border-border/60">
                  <div className="p-6 space-y-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded w-32" />
                  </div>
                </Card>
              ))}
            </div>
          ) : enrichedSessions.length === 0 ? (
            <Card className="border border-border/60">
              <CardContent className="p-10 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm font-medium">No test sessions found.</p>
                <p className="text-xs text-muted-foreground mt-1">Your trainer will invite you to assessments via invitation link.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {enrichedSessions.map(({ session, test, result }) => {
                const statusColor: Record<string, string> = {
                  STARTED: "bg-blue-100 text-blue-700",
                  SUBMITTED: "bg-yellow-100 text-yellow-700",
                  EVALUATED: "bg-purple-100 text-purple-700",
                  EXPIRED: "bg-red-100 text-red-600",
                };
                return (
                  <Card key={session.id} className="border border-border/60 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColor[session.status] || "bg-muted text-muted-foreground"}`}>
                            {session.status}
                          </span>
                          {result && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${result.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {result.passed ? "PASSED" : "FAILED"}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-foreground leading-snug truncate">
                          {test?.title || "Test (ID: " + session.testId.slice(0, 8) + "...)"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          {test?.durationMins && (
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.durationMins} Mins</span>
                          )}
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Started: {formatDate(session.startedAt)}</span>
                          {session.submittedAt && (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Submitted: {formatDate(session.submittedAt)}</span>
                          )}
                        </div>
                        {result && (
                          <div className="text-xs font-semibold text-foreground">
                            Score: <span className={result.passed ? "text-emerald-600" : "text-red-600"}>{result.totalScore} / {result.maxScore} ({result.percentage.toFixed(1)}%)</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {session.status === "STARTED" && (
                          <Button
                            className="bg-gradient-primary text-white hover:opacity-95 shadow-primary text-sm"
                            onClick={() => navigate(`/candidate/flow?testId=${session.testId}`)}
                          >
                            Continue Test
                          </Button>
                        )}
                        {result && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadScorecard(session.id)}
                            disabled={pdfLoadingId === session.id}
                            className="gap-1.5 text-xs"
                          >
                            <Download className={`h-3.5 w-3.5 ${pdfLoadingId === session.id ? "animate-pulse" : ""}`} />
                            {pdfLoadingId === session.id ? "Loading..." : "Scorecard PDF"}
                          </Button>
                        )}
                        {!result && session.status === "SUBMITTED" && (
                          <span className="text-xs text-muted-foreground italic text-center">Grading in progress...</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Results Summary */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-foreground">Recent Results</h3>
          <Card className="border border-border/60">
            <CardContent className="p-0 divide-y divide-border">
              {loading ? (
                <div className="p-4 space-y-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="space-y-1.5">
                        <div className="h-3 bg-muted rounded w-32" />
                        <div className="h-2.5 bg-muted rounded w-20" />
                      </div>
                      <div className="h-4 bg-muted rounded w-10" />
                    </div>
                  ))}
                </div>
              ) : gradedResults.length === 0 ? (
                <div className="p-6 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-xs text-muted-foreground">No graded results yet.</p>
                </div>
              ) : (
                enrichedSessions
                  .filter((e) => e.result !== null)
                  .slice(0, 5)
                  .map(({ session, test, result }) => (
                    <div key={session.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1 pr-3">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {test?.title || "Test"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> {formatDate(session.submittedAt || session.startedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold block ${result!.passed ? "text-emerald-600" : "text-red-500"}`}>
                          {result!.percentage.toFixed(1)}%
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${result!.passed ? "text-emerald-500" : "text-red-500"}`}>
                          {result!.passed ? "PASSED" : "FAILED"}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Quick info panel */}
          <Card className="border border-border/60 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Session Info</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Candidate ID</span>
                  <span className="font-mono text-foreground">{candidateId ? candidateId.slice(0, 12) + "..." : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Sessions</span>
                  <span className="font-semibold text-foreground">{totalAssessments}</span>
                </div>
                <div className="flex justify-between">
                  <span>Results Available</span>
                  <span className="font-semibold text-foreground">{gradedResults.length}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full mt-2 text-xs border-primary/30 text-primary hover:bg-primary/10">
                <Link to="/candidate/results">View Full Report →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
