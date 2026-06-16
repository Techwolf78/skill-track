import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert,
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Info,
  Building2,
  Users,
  Camera,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  testService,
  TestScheduleExtended,
  TestSession,
} from "@/lib/test-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import {
  proctoringService,
  ProctoringSummaryResponse,
  ProctoringEventDto,
} from "@/lib/proctoring-service";
import { useAuth } from "@/lib/auth-context";

export default function ProctoringDashboard() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const basePath = user?.role === "ADMIN" ? "/admin" : "/superadmin";

  // Master View States
  const [schedules, setSchedules] = useState<TestScheduleExtended[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Detail View States
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [summary, setSummary] = useState<ProctoringSummaryResponse | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);

  // Selected violation evidence modal
  const [selectedEvent, setSelectedEvent] = useState<ProctoringEventDto | null>(
    null,
  );
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  // Expanded metadata rows in timeline
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Load Master Data
  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
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

      console.log("Proctoring Center Master Data:", {
        schedules: schedulesWithTests,
        sessions: sessionsData,
        candidates: candidatesData,
      });

      setSchedules(schedulesWithTests);
      setCandidates(candidatesData);
      setSessions(sessionsData);

      // Auto-select first schedule if none selected
      setSelectedScheduleId((prev) => prev || schedulesWithTests[0]?.id || "");
    } catch (error) {
      console.error("Failed to load master data for proctoring:", error);
      toast({
        title: "Error",
        description: "Failed to load schedules and session data",
        variant: "destructive",
      });
    } finally {
      setLoadingMaster(false);
    }
  }, [toast]);

  // Load Detail Data (Proctoring summary for a session)
  const loadDetailData = useCallback(
    async (sid: string, page: number) => {
      try {
        setLoadingDetail(true);
        const data = await proctoringService.getProctoringSummary(
          sid,
          page,
          pageSize,
        );
        setSummary(data);
      } catch (error) {
        console.error("Failed to load proctoring summary:", error);
        toast({
          title: "Error",
          description: "Failed to load candidate proctoring data",
          variant: "destructive",
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [pageSize, toast],
  );

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    if (sessionId) {
      loadDetailData(sessionId, currentPage);
    } else {
      setSummary(null);
    }
  }, [sessionId, currentPage, loadDetailData]);

  // Filter sessions for the selected schedule (checking both scheduleId and testScheduleId)
  const filteredSessions = sessions.filter(
    (s) =>
      s.scheduleId === selectedScheduleId ||
      (s as unknown as Record<string, unknown>).testScheduleId ===
        selectedScheduleId,
  );

  // Filter based on search query
  const searchedSessions = filteredSessions.filter((session) => {
    const candidate = candidates.find((c) => c.id === session.candidateId);
    const name = candidate?.user?.name || "";
    const email = candidate?.user?.email || "";
    const sid = session.id || "";
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      sid.toLowerCase().includes(query)
    );
  });

  const getCandidateName = (candidateId: string) => {
    const cand = candidates.find((c) => c.id === candidateId);
    return cand?.user?.name || "Unknown Candidate";
  };

  const getCandidateEmail = (candidateId: string) => {
    const cand = candidates.find((c) => c.id === candidateId);
    return cand?.user?.email || "";
  };

  // Helper for Severity color mapping
  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return <Badge variant="secondary">UNKNOWN</Badge>;
    switch (severity.toUpperCase()) {
      case "LOW":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
            LOW
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">
            MEDIUM
          </Badge>
        );
      case "HIGH":
        return (
          <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">
            HIGH
          </Badge>
        );
      case "CRITICAL":
        return (
          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 animate-pulse">
            CRITICAL
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Helper for Event Type formatting
  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Render detail view if a session is selected
  if (sessionId) {
    const activeSession = sessions.find((s) => s.id === sessionId);
    const candidateName = activeSession
      ? getCandidateName(activeSession.candidateId)
      : "Candidate";
    const candidateEmail = activeSession
      ? getCandidateEmail(activeSession.candidateId)
      : "";
    const trustScore = summary?.trustScore?.score ?? 100;

    // Severity distribution calculations
    const lowCount =
      summary?.events.content.filter((e) => e.severity?.toUpperCase() === "LOW")
        .length || 0;
    const medCount =
      summary?.events.content.filter(
        (e) => e.severity?.toUpperCase() === "MEDIUM",
      ).length || 0;
    const highCount =
      summary?.events.content.filter(
        (e) => e.severity?.toUpperCase() === "HIGH",
      ).length || 0;
    const critCount =
      summary?.events.content.filter(
        (e) => e.severity?.toUpperCase() === "CRITICAL",
      ).length || 0;
    const totalCount = summary?.events.content.length || 0;

    return (
      <div className="p-8 space-y-8 animate-fade-in w-full mx-auto">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-muted"
              onClick={() => {
                setCurrentPage(0);
                navigate(`${basePath}/proctoring`);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-heading font-bold">
                  {candidateName}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-xs text-muted-foreground"
                >
                  Session: {sessionId.slice(0, 8)}...
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{candidateEmail}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2 shrink-0 h-10 hover:bg-orange-50/40 dark:hover:bg-orange-950/10 border-orange-500/20 text-orange-600"
            onClick={() => loadDetailData(sessionId, currentPage)}
            disabled={loadingDetail}
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingDetail ? "animate-spin" : ""}`}
            />
            Refresh Log
          </Button>
        </div>

        {loadingDetail && !summary ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-muted-foreground text-sm font-medium">
              Fetching proctoring metrics...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Trust Assessment and Telemetry Summary */}
            <div className="lg:col-span-4 space-y-6">
              {/* Trust Score Radial Card */}
              <Card className="border-border/60 bg-gradient-to-br from-card to-card/50 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <ShieldAlert className="h-24 w-24 text-orange-500" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Trust Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-4 pb-6">
                  {/* SVG Radial Score dial */}
                  <div className="relative h-36 w-36 flex items-center justify-center">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="stroke-muted"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className={`transition-all duration-1000 ${
                          trustScore >= 90
                            ? "stroke-green-500"
                            : trustScore >= 70
                              ? "stroke-yellow-500"
                              : "stroke-red-500"
                        }`}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * trustScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-bold font-heading">
                        {trustScore}%
                      </span>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Score
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 text-center space-y-2">
                    <Badge
                      className={`font-semibold text-xs px-3 py-1 ${
                        trustScore >= 90
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : trustScore >= 70
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
                      }`}
                    >
                      {trustScore >= 90
                        ? "TRUSTWORTHY"
                        : trustScore >= 70
                          ? "SUSPICIOUS ACTIVITY"
                          : "HIGH MALPRACTICE RISK"}
                    </Badge>

                    {summary?.trustScore?.isMalpractice && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 animate-bounce mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        FLAGGED FOR MALPRACTICE
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Telemetry metadata card */}
              <Card className="border-border/60 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Audit Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">
                      Total Flags Recorded
                    </span>
                    <span className="font-semibold text-sm">
                      {summary?.trustScore?.flagsCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">
                      Audit Status
                    </span>
                    <span className="text-sm">
                      {summary?.trustScore?.reviewedBy ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-bold">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Pending Audit
                        </Badge>
                      )}
                    </span>
                  </div>
                  {summary?.trustScore?.reviewedBy && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">
                          Auditor ID
                        </span>
                        <span className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
                          {summary.trustScore.reviewedBy}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">
                          Reviewed At
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            summary.trustScore.reviewedAt || "",
                          ).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {summary?.trustScore?.updatedAt && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">
                        Last Telemetry Sync
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          summary.trustScore.updatedAt,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card className="border-border/60 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Violation Severity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-500 font-bold">CRITICAL</span>
                      <span className="font-semibold">{critCount}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${totalCount ? (critCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-orange-500 font-bold">HIGH</span>
                      <span className="font-semibold">{highCount}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{
                          width: `${totalCount ? (highCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-yellow-500 font-bold">MEDIUM</span>
                      <span className="font-semibold">{medCount}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${totalCount ? (medCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-500 font-bold">LOW</span>
                      <span className="font-semibold">{lowCount}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${totalCount ? (lowCount / totalCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Paginated Violation Event Log */}
            <div className="lg:col-span-8">
              <Card className="border-border/60 shadow-lg h-full flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-bold font-heading">
                    Violation Event Log
                  </CardTitle>
                  <CardDescription>
                    Granular timelines of proctoring flags, tab-switches,
                    copy-paste events, and face detection telemetry.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {!summary || summary.events.content.length === 0 ? (
                    <div className="text-center py-20 my-auto text-muted-foreground space-y-3">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto opacity-70" />
                      <p className="font-semibold text-sm">
                        No violations detected
                      </p>
                      <p className="text-xs">
                        This candidate has not triggered any proctoring rules.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="w-[40px]"></TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Timestamp</TableHead>
                              <TableHead className="text-right pr-6">
                                Evidence
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.events.content.map((event) => {
                              const isExpanded = expandedEventId === event.id;
                              return (
                                <>
                                  <TableRow
                                    key={event.id}
                                    className="hover:bg-muted/10 transition-colors border-b cursor-pointer"
                                    onClick={() =>
                                      setExpandedEventId(
                                        isExpanded ? null : event.id,
                                      )
                                    }
                                  >
                                    <TableCell className="pl-4">
                                      <Info className="h-4 w-4 text-muted-foreground/60 hover:text-foreground" />
                                    </TableCell>
                                    <TableCell className="font-semibold text-sm">
                                      {formatEventType(event.eventType)}
                                    </TableCell>
                                    <TableCell>
                                      {getSeverityBadge(event.severity)}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                      {new Date(
                                        event.occurredAt,
                                      ).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                      {event.evidence ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs border-orange-500/10 text-orange-600 hover:bg-orange-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEvent(event);
                                            setIsEvidenceOpen(true);
                                          }}
                                        >
                                          <Camera className="h-3.5 w-3.5 mr-1" />
                                          View Frame
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">
                                          None
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-muted/10 border-b">
                                      <TableCell colSpan={5} className="p-4">
                                        <div className="space-y-3">
                                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Event Metadata
                                          </h4>
                                          {event.metadata &&
                                          Object.keys(event.metadata).length >
                                            0 ? (
                                            <pre className="text-xs font-mono bg-background p-3 rounded-lg border max-h-40 overflow-y-auto whitespace-pre-wrap">
                                              {JSON.stringify(
                                                event.metadata,
                                                null,
                                                2,
                                              )}
                                            </pre>
                                          ) : (
                                            <p className="text-xs text-muted-foreground italic">
                                              No extra metadata available for
                                              this event.
                                            </p>
                                          )}
                                          <div className="text-[10px] text-muted-foreground flex gap-4 font-mono">
                                            <span>Event ID: {event.id}</span>
                                            <span>
                                              Synced At:{" "}
                                              {new Date(
                                                event.syncedAt,
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Timeline Pagination footer */}
                      <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                        <div className="text-xs text-muted-foreground font-medium">
                          Showing {currentPage * pageSize + 1} -{" "}
                          {Math.min(
                            (currentPage + 1) * pageSize,
                            summary.events.totalElements,
                          )}{" "}
                          of {summary.events.totalElements} events
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={summary.events.first}
                            onClick={() =>
                              setCurrentPage((p) => Math.max(0, p - 1))
                            }
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={summary.events.last}
                            onClick={() => setCurrentPage((p) => p + 1)}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Evidence Image Dialog Modal */}
        <Dialog open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
          <DialogContent className="max-w-2xl bg-card border-border/80 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Camera className="h-5 w-5 text-orange-500" />
                Evidence Frame Capture
              </DialogTitle>
              <DialogDescription>
                {selectedEvent && (
                  <span className="font-semibold text-foreground">
                    {formatEventType(selectedEvent.eventType)} (Severity:{" "}
                    {selectedEvent.severity})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-2 rounded-xl border bg-black/5 overflow-hidden">
              {selectedEvent?.evidence ? (
                <img
                  src={
                    selectedEvent.evidence.startsWith("data:")
                      ? selectedEvent.evidence
                      : `data:image/jpeg;base64,${selectedEvent.evidence}`
                  }
                  alt="Proctoring violation evidence"
                  className="rounded-lg max-h-[400px] w-auto object-contain border shadow-sm"
                />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Image evidence payload missing or empty.
                </p>
              )}
            </div>
            {selectedEvent?.metadata && (
              <div className="mt-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Captured Parameters
                </Label>
                <div className="text-xs font-mono p-3 bg-muted/40 rounded-lg border max-h-24 overflow-y-auto">
                  {JSON.stringify(selectedEvent.metadata)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Master View (Schedules & Candidates list)
  return (
    <div className="p-8 space-y-8 animate-fade-in w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-orange-500 animate-pulse" />
            Proctoring Security Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor real-time assessments, analyze candidate trust profiles, and
            audit violation telemetry.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadMasterData}
          disabled={loadingMaster}
          className="h-10 hover:bg-orange-50/40 dark:hover:bg-orange-950/10 border-orange-500/20 text-orange-600"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loadingMaster ? "animate-spin" : ""}`}
          />
          Sync Sessions
        </Button>
      </div>

      {/* Select Schedule Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-card/40 p-6 rounded-xl border border-border/60">
        <div className="md:col-span-6 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Select Assessment Schedule
          </Label>
          <Select
            value={selectedScheduleId}
            onValueChange={setSelectedScheduleId}
          >
            <SelectTrigger className="h-11 border-border/80 bg-background/50">
              <SelectValue placeholder="Choose a test schedule..." />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((sch) => (
                <SelectItem
                  key={sch.id}
                  value={sch.id}
                  className="cursor-pointer"
                >
                  <span className="font-semibold">
                    {sch.test?.title || "Unknown Test"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({new Date(sch.startTime).toLocaleDateString()} at {new Date(sch.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-6 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" /> Search Candidate
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate name, email, or session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 border-border/80 bg-background/50 focus-visible:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Candidates table */}
      <Card className="border-border/60 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Candidate Sessions ({searchedSessions.length})
          </CardTitle>
          <CardDescription>
            Candidates registered under this schedule and their assessment
            telemetry audit links.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMaster ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-muted-foreground text-sm font-medium">
                Syncing candidate sessions...
              </p>
            </div>
          ) : searchedSessions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-3">
              <Users className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-sm">
                No active candidate sessions found
              </p>
              <p className="text-xs">
                Either there are no invited candidates or no sessions have
                started yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-6">Candidate Name</TableHead>
                  <TableHead>Session ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">
                    Audit Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedSessions.map((session) => {
                  const candidateName = getCandidateName(session.candidateId);
                  const candidateEmail = getCandidateEmail(session.candidateId);
                  return (
                    <TableRow
                      key={session.id}
                      className="hover:bg-muted/5 transition-colors border-b"
                    >
                      <TableCell className="pl-6 py-4">
                        <div>
                          <p className="font-semibold text-sm">
                            {candidateName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {candidateEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {session.id}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {((session as unknown as Record<string, unknown>)
                          .ipAddress as string) || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-semibold text-xs border shadow-none px-2.5 py-0.5 ${
                            session.status === "STARTED" ||
                            (session.status as string) === "ACTIVE"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : session.status === "SUBMITTED" ||
                                  session.status === "EVALUATED"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                          }`}
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`${basePath}/proctoring/${session.id}`)
                          }
                          className="h-9 text-xs gap-1.5 bg-gradient-primary hover:shadow-primary/20 text-primary-foreground font-semibold"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Audit Telemetry
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
