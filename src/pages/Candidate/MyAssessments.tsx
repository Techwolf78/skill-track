import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Clock,
  BookOpen,
  Calendar,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { candidateService } from "@/lib/candidate-service";
import { testService, TestSession, TestResult, Test } from "@/lib/test-service";

interface EnrichedSession {
  session: TestSession;
  test: Test | null;
  result: TestResult | null;
}

export default function MyAssessments() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrichedSessions, setEnrichedSessions] = useState<EnrichedSession[]>([]);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const userId: string = storedUser?.id || "";

  const loadAssessments = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const candidate = await candidateService.getCandidateByUserId(userId);
      if (!candidate) {
        toast.error("Candidate profile not found.");
        return;
      }

      const [allSessions, allTests] = await Promise.all([
        testService.getAllSessions(),
        testService.getAllTests(),
      ]);

      const mySessions = allSessions.filter((s) => s.candidateId === candidate.id);

      const enriched: EnrichedSession[] = await Promise.all(
        mySessions.map(async (session) => {
          const test = allTests.find((t) => t.id === session.testId) || null;
          let result: TestResult | null = null;
          try {
            const res = await testService.pollResultBySessionId(session.id);
            const statusCode = res.statusCode || res.status;
            if (statusCode === 200 && res.data) result = res.data;
          } catch { /* no result yet */ }
          return { session, test, result };
        })
      );

      setEnrichedSessions(enriched);
    } catch (err: unknown) {
      toast.error("Failed to load assessments: " + ((err as Error).message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAssessments(); }, [userId]);

  const handleDownloadScorecard = async (sessionId: string, title: string) => {
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

  const formatDuration = (mins?: number) => mins ? `${mins} Mins` : "—";

  // Classify sessions into tabs
  const activeTab = enrichedSessions.filter((e) =>
    e.session.status === "STARTED"
  );
  const submittedTab = enrichedSessions.filter((e) =>
    e.session.status === "SUBMITTED" || e.session.status === "EVALUATED"
  );
  const expiredTab = enrichedSessions.filter((e) =>
    e.session.status === "EXPIRED"
  );

  const filter = (list: EnrichedSession[]) =>
    list.filter((e) => {
      const title = e.test?.title?.toLowerCase() || "";
      return !searchTerm || title.includes(searchTerm.toLowerCase());
    });

  const EmptyState = ({ label }: { label: string }) => (
    <div className="col-span-full py-12 text-center text-muted-foreground">
      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );

  const LoadingSkeleton = () => (
    <>
      {[1, 2].map((i) => (
        <Card key={i} className="border border-border/60 animate-pulse">
          <CardHeader className="space-y-2">
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </CardHeader>
          <CardFooter className="border-t p-6">
            <div className="h-9 bg-muted rounded w-full" />
          </CardFooter>
        </Card>
      ))}
    </>
  );

  const SessionCard = ({ enriched }: { enriched: EnrichedSession }) => {
    const { session, test, result } = enriched;
    const isActive = session.status === "STARTED";
    const isSubmitted = session.status === "SUBMITTED" || session.status === "EVALUATED";
    const isExpired = session.status === "EXPIRED";

    return (
      <Card className={`border border-border/60 flex flex-col justify-between hover:shadow-lg card-hover ${isExpired ? "opacity-60 bg-muted/20" : ""}`}>
        <CardHeader className="space-y-2">
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isActive ? "bg-blue-100 text-blue-700" :
              isSubmitted ? "bg-yellow-100 text-yellow-700" :
              "bg-rose-100 text-rose-700"
            }`}>
              {session.status}
            </span>
            {result && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                result.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {result.passed ? "PASSED" : "FAILED"}
              </span>
            )}
          </div>
          <CardTitle className="text-lg font-bold font-heading line-clamp-2">
            {test?.title || "Test (ID: " + session.testId.slice(0, 8) + "...)"}
          </CardTitle>
          {test?.description && (
            <CardDescription className="text-sm text-muted-foreground line-clamp-2">
              {test.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {test?.durationMins && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(test.durationMins)}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Started: {formatDate(session.startedAt)}</span>
          </div>
          {session.submittedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Submitted: {formatDate(session.submittedAt)}
            </div>
          )}
          {isExpired && (
            <div className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Session expired on: {formatDate(session.expiresAt)}</span>
            </div>
          )}
          {result && (
            <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Score</span>
                <span className={result.passed ? "text-emerald-600" : "text-red-500"}>
                  {result.totalScore} / {result.maxScore} ({result.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 border-t border-border/40 p-6 flex gap-3">
          {isActive && (
            <Button
              className="flex-1 bg-gradient-primary text-white hover:opacity-95 shadow-primary"
              onClick={() => navigate(`/candidate/flow?testId=${session.testId}`)}
            >
              Continue Test
            </Button>
          )}
          {isSubmitted && !result && (
            <Button disabled variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Grading...
            </Button>
          )}
          {result && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleDownloadScorecard(session.id, test?.title || "Test")}
              disabled={pdfLoadingId === session.id}
            >
              <Download className={`w-4 h-4 ${pdfLoadingId === session.id ? "animate-pulse" : ""}`} />
              {pdfLoadingId === session.id ? "Loading..." : "Scorecard PDF"}
            </Button>
          )}
          {isExpired && (
            <Button disabled variant="secondary" className="flex-1 text-muted-foreground">
              <Lock className="w-4 h-4 mr-2" /> Session Expired
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">My Assessments</h2>
          <p className="text-sm text-muted-foreground">Your active, submitted, and expired test sessions.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by test name..."
              className="pl-10 h-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={loadAssessments} disabled={loading} className="h-10 w-10 flex-shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 mb-6">
          <TabsTrigger value="active" className="text-sm font-semibold">
            Active ({filter(activeTab).length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="text-sm font-semibold">
            Submitted ({filter(submittedTab).length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="text-sm font-semibold">
            Expired ({filter(expiredTab).length})
          </TabsTrigger>
        </TabsList>

        {/* ACTIVE */}
        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? <LoadingSkeleton /> : filter(activeTab).length === 0 ? (
              <EmptyState label="No active test sessions. Your trainer will invite you to an assessment." />
            ) : filter(activeTab).map((e) => <SessionCard key={e.session.id} enriched={e} />)}
          </div>
        </TabsContent>

        {/* SUBMITTED */}
        <TabsContent value="submitted" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? <LoadingSkeleton /> : filter(submittedTab).length === 0 ? (
              <EmptyState label="No submitted assessments found." />
            ) : filter(submittedTab).map((e) => <SessionCard key={e.session.id} enriched={e} />)}
          </div>
        </TabsContent>

        {/* EXPIRED */}
        <TabsContent value="expired" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? <LoadingSkeleton /> : filter(expiredTab).length === 0 ? (
              <EmptyState label="No expired sessions found." />
            ) : filter(expiredTab).map((e) => <SessionCard key={e.session.id} enriched={e} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
