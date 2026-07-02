import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  Calendar,
  Trophy,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { candidateService } from "@/lib/candidate-service";
import { testService, TestSession, TestResult, Test } from "@/lib/test-service";

interface EnrichedResult {
  session: TestSession;
  test: Test | null;
  result: TestResult;
}

export default function ResultsReports() {
  const [loading, setLoading] = useState(true);
  const [enrichedResults, setEnrichedResults] = useState<EnrichedResult[]>([]);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const userId: string = storedUser?.id || "";

  const loadResults = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const candidate = await candidateService.getCandidateByUserId(userId);
      if (!candidate) {
        toast.error("Could not find your candidate profile.");
        return;
      }

      const [allSessions, allTests] = await Promise.all([
        testService.getAllSessions(),
        testService.getAllTests(),
      ]);

      const mySessions = allSessions.filter((s) => s.candidateId === candidate.id);

      // Load results for each submitted/evaluated session
      const enriched: EnrichedResult[] = [];
      await Promise.all(
        mySessions.map(async (session) => {
          if (session.status !== "SUBMITTED" && session.status !== "EVALUATED") return;
          try {
            const res = await testService.pollResultBySessionId(session.id);
            const statusCode = res.statusCode || res.status;
            if (statusCode === 200 && res.data) {
              const test = allTests.find((t) => t.id === session.testId) || null;
              enriched.push({ session, test, result: res.data });
            }
          } catch {
            // No result yet
          }
        })
      );

      // Sort by most recent first
      const sortedEnriched = [...enriched].sort((a, b) => new Date(b.session.submittedAt || b.session.startedAt).getTime() - new Date(a.session.submittedAt || a.session.startedAt).getTime());
      setEnrichedResults(sortedEnriched);
    } catch (err: unknown) {
      toast.error("Failed to load results: " + ((err as Error).message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadResults(); }, [userId]);

  const handleDownload = async (sessionId: string, title: string) => {
    try {
      setPdfLoadingId(sessionId);
      const { data: blob, filename } = await testService.downloadScorecard(sessionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Scorecard PDF for '${title}' downloaded.`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Scorecard PDF is not available yet.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Derived analytics
  const avgScore =
    enrichedResults.length > 0
      ? enrichedResults.reduce((s, e) => s + e.result.percentage, 0) / enrichedResults.length
      : 0;
  const highestResult = enrichedResults.reduce<EnrichedResult | null>((best, e) =>
    !best || e.result.percentage > best.result.percentage ? e : best, null);
  const passedCount = enrichedResults.filter((e) => e.result.passed).length;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Results & Reports</h2>
          <p className="text-sm text-muted-foreground">
            View your graded test results and download official scorecards.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadResults}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border/60 bg-indigo-500/10 flex-shrink-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-xl bg-indigo-500/10 text-indigo-600 flex-shrink-0">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Average Score</span>
              {loading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-extrabold text-foreground">
                  {enrichedResults.length > 0 ? `${avgScore.toFixed(1)}%` : "N/A"}
                </h3>
              )}
              <p className="text-xs text-indigo-600 font-medium">Across {enrichedResults.length} graded result{enrichedResults.length !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-emerald-500/10 flex-shrink-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 flex-shrink-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Highest Score</span>
              {loading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-extrabold text-foreground">
                  {highestResult ? `${highestResult.result.percentage.toFixed(1)}%` : "N/A"}
                </h3>
              )}
              <p className="text-xs text-emerald-600 font-medium truncate max-w-[150px]">
                {highestResult?.test?.title || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-rose-500/10 flex-shrink-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-xl bg-rose-500/10 text-rose-600 flex-shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Pass / Total</span>
              {loading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <h3 className="text-3xl font-extrabold text-foreground">
                  {passedCount} / {enrichedResults.length}
                </h3>
              )}
              <p className="text-xs text-rose-600 font-medium">Tests passed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card className="border border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold font-heading">Assessment Results</CardTitle>
          <CardDescription>All your graded test results with score details and PDF scorecards.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 flex items-center justify-between gap-4 animate-pulse">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                  <div className="h-8 bg-muted rounded w-24" />
                </div>
              ))}
            </div>
          ) : enrichedResults.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm font-medium">No graded results yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Results appear once your test is graded after submission.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {enrichedResults.map(({ session, test, result }) => (
                <div
                  key={session.id}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors"
                >
                  {/* Title & Info */}
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {result.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-foreground leading-none">
                        {test?.title || "Test (ID: " + session.testId.slice(0, 8) + "...)"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Submitted: {formatDate(session.submittedAt)}
                        </span>
                        <span>Score: {result.totalScore} / {result.maxScore}</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Score Progress</span>
                          <span className={`font-bold ${result.passed ? "text-emerald-600" : "text-red-500"}`}>
                            {result.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={result.percentage}
                          className={`h-1.5 ${result.passed ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge
                      className={result.passed
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-red-100 text-red-700 border-red-200"}
                    >
                      {result.passed ? "PASSED" : "FAILED"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border gap-1 hover:bg-muted text-xs"
                      onClick={() => handleDownload(session.id, test?.title || "Test")}
                      disabled={pdfLoadingId === session.id}
                    >
                      <Download className={`w-3.5 h-3.5 ${pdfLoadingId === session.id ? "animate-pulse" : ""}`} />
                      {pdfLoadingId === session.id ? "Loading..." : "Scorecard"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
