import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ShieldAlert,
  Search,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  AlertCircle,
  Info,
  Users,
  Camera,
  Layers,
  Monitor,
  Laptop,
  Check,
  Globe,
  HardDrive,
  Grid,
  Maximize,
  ArrowRight,
  Shield,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

// ==========================================
// 7. TypeScript Types & Enums
// ==========================================
export type ProctoringMode = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CUSTOM";
export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TestStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "TERMINATED";
export type ReviewStatus =
  | "NOT_REVIEWED"
  | "CLEAN"
  | "WARNING_ISSUED"
  | "NEEDS_MANUAL_REVIEW"
  | "DISQUALIFIED";
export type ProctoringEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AssessmentSchedule {
  id: string;
  assessmentName: string;
  scheduledDate: string;
  startTime: string;
  proctoringMode: ProctoringMode;
  totalCandidates?: number;
  activeCandidates?: number;
  submittedCandidates?: number;
  flaggedCandidates?: number;
}

export interface ProctoringCandidate {
  id: string;
  name: string;
  email: string;
  testStatus: TestStatus;
  proctoringMode: ProctoringMode;
  riskLevel: RiskLevel;
  violationsCount: number;
  criticalViolationsCount: number;
  lastActivity: string;
  reviewStatus: ReviewStatus;
}

export interface ProctoringViolation {
  id: string;
  time: string;
  eventType: string;
  severity: ProctoringEventSeverity;
  description: string;
  evidenceAvailable: boolean;
}

export interface EvidenceItem {
  id: string;
  imageUrl?: string;
  eventType: string;
  capturedAt: string;
  severity: ProctoringEventSeverity;
  description?: string;
}

export interface SnapshotItem {
  id: string;
  imageUrl: string;
  capturedAt: string;
}

export interface SystemInfo {
  browser: string;
  os: string;
  ipAddress: string;
  device: string;
  screenResolution: string;
}

export interface CandidateProctoringDetail {
  id: string;
  name: string;
  email: string;
  testStatus: TestStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  violationsCount: number;
  criticalViolationsCount: number;
  startedAt: string;
  submittedAt: string | null;
  violations: ProctoringViolation[];
  evidences: EvidenceItem[];
  snapshots: SnapshotItem[];
  systemInfo: SystemInfo;
  reviewStatus: ReviewStatus;
}

// ==========================================
// Component
// ==========================================
export default function ProctoringDashboard() {
  const { toast } = useToast();
  const { sessionId } = useParams<{ sessionId?: string }>();

  // Core State
  const [schedules, setSchedules] = useState<AssessmentSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [candidates, setCandidates] = useState<ProctoringCandidate[]>([]);

  // Loading and Error States
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorSchedules, setErrorSchedules] = useState<string | null>(null);
  const [errorCandidates, setErrorCandidates] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterReview, setFilterReview] = useState<string>("ALL");

  // Selected Candidate Details / Drawer State
  const [selectedCandidate, setSelectedCandidate] =
    useState<ProctoringCandidate | null>(null);
  const [candidateDetails, setCandidateDetails] =
    useState<CandidateProctoringDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch Schedules API
  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setErrorSchedules(null);
    try {
      const response = await apiClient.get("/api/admin/proctoring/assessment-schedules");
      const data = response.data?.data ?? response.data;
      if (Array.isArray(data) && data.length > 0) {
        setSchedules(data);
        setSelectedScheduleId(data[0].id);
      } else {
        setSchedules([]);
        setSelectedScheduleId("");
      }
    } catch {
      setErrorSchedules("Could not load assessment schedules. Check your connection or try again.");
      setSchedules([]);
      setSelectedScheduleId("");
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch Candidates for Selected Schedule API
  const loadCandidates = useCallback(async (scheduleId: string) => {
    if (!scheduleId) return;
    setLoadingCandidates(true);
    setErrorCandidates(null);
    try {
      const response = await apiClient.get(
        `/api/admin/proctoring/assessment-schedules/${scheduleId}/candidates`,
      );
      const data = response.data?.data ?? response.data;
      const mappedCandidates = Array.isArray(data) ? data.map((cand: { candidateId: string; candidateName: string; email: string; testStatus: string; proctoringMode: ProctoringMode; riskLevel: RiskLevel; violationCount: number; criticalViolationCount: number; lastActivityAt?: string; reviewStatus?: ReviewStatus }) => ({
        id: cand.candidateId,
        name: cand.candidateName,
        email: cand.email,
        testStatus: (cand.testStatus === "ACTIVE" ? "IN_PROGRESS" : cand.testStatus) as TestStatus,
        proctoringMode: cand.proctoringMode,
        riskLevel: cand.riskLevel,
        violationsCount: cand.violationCount,
        criticalViolationsCount: cand.criticalViolationCount,
        lastActivity: cand.lastActivityAt ? new Date(cand.lastActivityAt).toLocaleString() : "No activity",
        reviewStatus: cand.reviewStatus || "NOT_REVIEWED",
      })) : [];
      setCandidates(mappedCandidates);
    } catch {
      setErrorCandidates("Could not load candidates for this schedule.");
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);



  // Fetch Candidate Detailed Info API
  const loadCandidateDetails = async (candidate: ProctoringCandidate) => {
    setSelectedCandidate(candidate);
    setIsDrawerOpen(true);
    setLoadingDetails(true);
    setErrorDetails(null);
    try {
      const response = await apiClient.get(
        `/api/admin/proctoring/candidates/${candidate.id}/details?scheduleId=${selectedScheduleId}`,
      );
      const data = response.data?.data ?? response.data;
      if (data && typeof data === "object") {
        const mappedDetail: CandidateProctoringDetail = {
          id: data.candidate?.candidateId || candidate.id,
          name: data.candidate?.candidateName || candidate.name,
          email: data.candidate?.email || candidate.email,
          testStatus: data.testStatus === "ACTIVE" ? "IN_PROGRESS" : data.testStatus,
          riskScore: Math.round(data.riskScore || 0),
          riskLevel: data.riskLevel || "NONE",
          violationsCount: data.violationCount || 0,
          criticalViolationsCount: data.criticalViolationCount || 0,
          startedAt: data.systemInfo?.startedAt ? new Date(data.systemInfo.startedAt).toLocaleString() : "N/A",
          submittedAt: data.systemInfo?.endedAt ? new Date(data.systemInfo.endedAt).toLocaleString() : null,
          violations: data.violations?.map((v: { eventId?: string; id?: string; occurredAt?: string; eventType?: string; severity?: ProctoringEventSeverity; metadata?: { description?: string } }) => ({
            id: v.eventId || v.id,
            time: v.occurredAt ? new Date(v.occurredAt).toLocaleTimeString() : "N/A",
            eventType: v.eventType,
            severity: v.severity,
            description: v.metadata?.description || `Triggered ${v.eventType?.replace(/_/g, " ") || "violation"}`,
            evidenceAvailable: data.evidence?.some((e: { eventId?: string }) => e.eventId === v.eventId) || false,
          })) || [],
          evidences: data.evidence?.map((e: { id?: string; imageData?: string; s3Key?: string; snapshotType?: string; capturedAt?: string }) => ({
            id: e.id,
            imageUrl: e.imageData || e.s3Key || "",
            eventType: e.snapshotType || "VIOLATION",
            capturedAt: e.capturedAt ? new Date(e.capturedAt).toLocaleString() : "N/A",
            severity: "HIGH" as ProctoringEventSeverity,
            description: e.s3Key || "Attached Frame Capture",
          })) || [],
          snapshots: data.snapshots?.map((s: { id?: string; imageData?: string; s3Key?: string; capturedAt?: string }) => ({
            id: s.id,
            imageUrl: s.imageData || s.s3Key || "",
            capturedAt: s.capturedAt ? new Date(s.capturedAt).toLocaleTimeString() : "N/A",
          })) || [],
          systemInfo: {
            browser: data.systemInfo?.latestEventMetadata?.userAgent || data.systemInfo?.latestEventMetadata?.browser || "Chrome / Safari",
            os: data.systemInfo?.latestEventMetadata?.os || "Windows 11 / macOS",
            ipAddress: data.systemInfo?.ipAddress || "Unknown",
            device: data.systemInfo?.latestEventMetadata?.device || "Desktop",
            screenResolution: data.systemInfo?.latestEventMetadata?.screenResolution || "1920x1080",
          },
          reviewStatus: data.reviewDecision?.reviewStatus || "NOT_REVIEWED",
        };
        setCandidateDetails(mappedDetail);
      } else {
        throw new Error("Invalid response");
      }
    } catch {
      setErrorDetails("Could not load detailed proctoring data for this candidate.");
      setCandidateDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Update Candidate Review status (local state only)
  const handleUpdateReviewStatus = (newStatus: ReviewStatus) => {
    if (!selectedCandidate) return;

    // Update list state
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === selectedCandidate.id ? { ...c, reviewStatus: newStatus } : c,
      ),
    );

    // Update detail states
    setSelectedCandidate((prev) =>
      prev ? { ...prev, reviewStatus: newStatus } : null,
    );
    setCandidateDetails((prev) =>
      prev ? { ...prev, reviewStatus: newStatus } : null,
    );

    toast({
      title: "Review Completed",
      description: `Review status updated to ${newStatus.replace(/_/g, " ")}.`,
    });
  };

  // Retry loading
  const handleRetry = () => {
    loadSchedules();
  };

  // Initial Load
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Load candidates on schedule select
  useEffect(() => {
    if (selectedScheduleId) {
      loadCandidates(selectedScheduleId);
    } else {
      setCandidates([]);
    }
  }, [selectedScheduleId, loadCandidates]);

  // Auto-load candidate proctoring details drawer if sessionId URL param is present
  useEffect(() => {
    const autoLoadSession = async () => {
      if (!sessionId) return;
      try {
        const sessionRes = await apiClient.get(`/test-sessions/${sessionId}`);
        const sessionData = sessionRes.data?.data ?? sessionRes.data;
        if (!sessionData) return;

        const scheduleId = sessionData.scheduleId;
        const candidateId = sessionData.candidateId;

        if (scheduleId && candidateId) {
          setSelectedScheduleId(scheduleId);

          const tempCandidate: ProctoringCandidate = {
            id: candidateId,
            name: "Loading Candidate...",
            email: "",
            testStatus: "SUBMITTED",
            proctoringMode: "NONE",
            riskLevel: "NONE",
            violationsCount: 0,
            criticalViolationsCount: 0,
            lastActivity: "",
            reviewStatus: "NOT_REVIEWED",
          };

          setSelectedCandidate(tempCandidate);
          setIsDrawerOpen(true);
          setLoadingDetails(true);
          setErrorDetails(null);

          try {
            const detailRes = await apiClient.get(
              `/api/admin/proctoring/candidates/${candidateId}/details?scheduleId=${scheduleId}`
            );
            const data = detailRes.data?.data ?? detailRes.data;
            if (data && typeof data === "object") {
              const mappedDetail: CandidateProctoringDetail = {
                id: data.candidate?.candidateId || candidateId,
                name: data.candidate?.candidateName || "Candidate",
                email: data.candidate?.email || "",
                testStatus: data.testStatus === "ACTIVE" ? "IN_PROGRESS" : data.testStatus,
                riskScore: Math.round(data.riskScore || 0),
                riskLevel: data.riskLevel || "NONE",
                violationsCount: data.violationCount || 0,
                criticalViolationsCount: data.criticalViolationCount || 0,
                startedAt: data.systemInfo?.startedAt ? new Date(data.systemInfo.startedAt).toLocaleString() : "N/A",
                submittedAt: data.systemInfo?.endedAt ? new Date(data.systemInfo.endedAt).toLocaleString() : null,
                violations: data.violations?.map((v: { eventId?: string; id?: string; occurredAt?: string; eventType?: string; severity?: ProctoringEventSeverity; metadata?: { description?: string } }) => ({
                  id: v.eventId || v.id,
                  time: v.occurredAt ? new Date(v.occurredAt).toLocaleTimeString() : "N/A",
                  eventType: v.eventType,
                  severity: v.severity,
                  description: v.metadata?.description || `Triggered ${v.eventType?.replace(/_/g, " ") || "violation"}`,
                  evidenceAvailable: data.evidence?.some((e: { eventId?: string }) => e.eventId === v.eventId) || false,
                })) || [],
                evidences: data.evidence?.map((e: { id?: string; imageData?: string; s3Key?: string; snapshotType?: string; capturedAt?: string }) => ({
                  id: e.id,
                  imageUrl: e.imageData || e.s3Key || "",
                  eventType: e.snapshotType || "VIOLATION",
                  capturedAt: e.capturedAt ? new Date(e.capturedAt).toLocaleString() : "N/A",
                  severity: "HIGH" as ProctoringEventSeverity,
                  description: e.s3Key || "Attached Frame Capture",
                })) || [],
                snapshots: data.snapshots?.map((s: { id?: string; imageData?: string; s3Key?: string; capturedAt?: string }) => ({
                  id: s.id,
                  imageUrl: s.imageData || s.s3Key || "",
                  capturedAt: s.capturedAt ? new Date(s.capturedAt).toLocaleTimeString() : "N/A",
                })) || [],
                systemInfo: {
                  browser: data.systemInfo?.latestEventMetadata?.userAgent || data.systemInfo?.latestEventMetadata?.browser || "Chrome / Safari",
                  os: data.systemInfo?.latestEventMetadata?.os || "Windows 11 / macOS",
                  ipAddress: data.systemInfo?.ipAddress || "Unknown",
                  device: data.systemInfo?.latestEventMetadata?.device || "Desktop",
                  screenResolution: data.systemInfo?.latestEventMetadata?.screenResolution || "1920x1080",
                },
                reviewStatus: data.reviewDecision?.reviewStatus || "NOT_REVIEWED",
              };
              setCandidateDetails(mappedDetail);
              setSelectedCandidate((prev) => prev ? {
                ...prev,
                name: mappedDetail.name,
                email: mappedDetail.email,
                testStatus: mappedDetail.testStatus,
                riskLevel: mappedDetail.riskLevel,
                violationsCount: mappedDetail.violationsCount,
                criticalViolationsCount: mappedDetail.criticalViolationsCount,
                reviewStatus: mappedDetail.reviewStatus,
              } : null);
            }
          } catch {
            setErrorDetails("Could not load detailed proctoring data for this candidate.");
            setCandidateDetails(null);
          } finally {
            setLoadingDetails(false);
          }
        }
      } catch (err) {
        console.error("Auto loading session failed:", err);
      }
    };

    if (sessionId && schedules.length > 0) {
      autoLoadSession();
    }
  }, [sessionId, schedules]);

  // Filter candidates client-side
  const filteredCandidates = candidates.filter((cand) => {
    const matchesSearch =
      cand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = filterRisk === "ALL" || cand.riskLevel === filterRisk;
    const matchesStatus =
      filterStatus === "ALL" || cand.testStatus === filterStatus;
    const matchesReview =
      filterReview === "ALL" || cand.reviewStatus === filterReview;

    return matchesSearch && matchesRisk && matchesStatus && matchesReview;
  });

  // Selected schedule info
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  // Computations for summary cards
  const totalCount = candidates.length;
  const activeCount = candidates.filter(
    (c) => c.testStatus === "IN_PROGRESS",
  ).length;
  const submittedCount = candidates.filter(
    (c) => c.testStatus === "SUBMITTED" || c.testStatus === "AUTO_SUBMITTED",
  ).length;
  const flaggedCount = candidates.filter(
    (c) => c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL",
  ).length;
  const proctorMode = selectedSchedule?.proctoringMode || "NONE";

  // Badge Helpers
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case "NONE":
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800"
          >
            NONE
          </Badge>
        );
      case "LOW":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
          >
            LOW
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
          >
            MEDIUM
          </Badge>
        );
      case "HIGH":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
          >
            HIGH
          </Badge>
        );
      case "CRITICAL":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 animate-pulse font-bold"
          >
            CRITICAL
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getTestStatusBadge = (status: TestStatus) => {
    switch (status) {
      case "NOT_STARTED":
        return (
          <Badge
            variant="secondary"
            className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            NOT STARTED
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:text-white border-none">
            IN PROGRESS
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white border-none">
            SUBMITTED
          </Badge>
        );
      case "AUTO_SUBMITTED":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:text-white border-none">
            AUTO SUBMITTED
          </Badge>
        );
      case "TERMINATED":
        return (
          <Badge
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:text-white border-none"
          >
            TERMINATED
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReviewStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case "NOT_REVIEWED":
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800"
          >
            NOT REVIEWED
          </Badge>
        );
      case "CLEAN":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
          >
            CLEAN
          </Badge>
        );
      case "WARNING_ISSUED":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
          >
            WARNING ISSUED
          </Badge>
        );
      case "NEEDS_MANUAL_REVIEW":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
          >
            NEEDS REVIEW
          </Badge>
        );
      case "DISQUALIFIED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 font-bold"
          >
            DISQUALIFIED
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Camera screenshot overlay visual block
  const CameraFeedPlaceholder = ({
    eventType,
    isEvidence,
    imageUrl,
  }: {
    eventType: string;
    isEvidence: boolean;
    imageUrl?: string;
  }) => {
    if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("data:"))) {
      return (
        <div className="relative w-full h-36 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-850">
          <img src={imageUrl} alt="Proctoring feed capture" className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 text-[8px] font-mono text-white bg-slate-950/60 px-1 rounded uppercase tracking-wider">
            {isEvidence ? "VIOLATION FRAME" : "PERIODIC AUDIT"}
          </div>
          {isEvidence && (
            <div className="absolute border border-rose-500/50 bg-rose-500/5 w-28 h-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded flex flex-col justify-between p-1">
              <span className="text-[8px] font-mono text-rose-500 font-bold tracking-tight">
                FLAGGED
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative w-full h-36 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-850">
        {/* Scanner line overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_95%,rgba(244,63,94,0.2)_98%,rgba(244,63,94,0.2)_100%)] bg-[length:100%_40px] animate-[pulse_2s_infinite] pointer-events-none opacity-40"></div>

        {/* Webcam pixel grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

        <div className="text-center z-10 p-2">
          <Camera className="h-7 w-7 text-slate-500 mx-auto mb-1.5" />
          <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-widest">
            {isEvidence ? "VIOLATION FRAME" : "WEBCAM FEED"}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
            {eventType.replace(/_/g, " ")}
          </span>
        </div>

        {/* Bounding box representation if it's evidence */}
        {isEvidence && (
          <div className="absolute border border-rose-500/50 bg-rose-500/5 w-28 h-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded flex flex-col justify-between p-1">
            <span className="text-[8px] font-mono text-rose-500 font-bold tracking-tight">
              FLAGGED
            </span>
            <span className="text-[8px] font-mono text-rose-400/80 text-right">
              98.2%
            </span>
          </div>
        )}

        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-500 bg-slate-900/60 px-1 rounded">
          PROCTOR FEED
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in w-full">
      {/* API Error Banner for Schedules */}
      {errorSchedules && (
        <div className="flex items-center justify-between gap-4 p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs md:text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorSchedules}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedules}
            className="h-8 border-red-500/20 hover:bg-red-500/10 text-red-600 dark:text-red-400 flex gap-1 items-center shrink-0"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-600 animate-pulse shrink-0" />
            Proctoring Security Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Track student activities, view system configuration, check camera
            captures, and manage violations.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">

          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={loadingSchedules || loadingCandidates}
            className="h-10 hover:bg-rose-50/40 dark:hover:bg-rose-950/10 border-rose-500/20 text-rose-600"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loadingSchedules || loadingCandidates ? "animate-spin" : ""}`}
            />
            Sync Feed
          </Button>
        </div>
      </div>

      {/* 1. Assessment Schedule Dropdown selection */}
      <div className="grid grid-cols-1 gap-6 items-end bg-card p-5 md:p-6 rounded-xl border border-border/60 shadow-sm backdrop-blur-md">
        <div className="space-y-2.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" /> Select Assessment
            Schedule
          </Label>
          <Select
            value={selectedScheduleId}
            onValueChange={setSelectedScheduleId}
            disabled={loadingSchedules}
          >
            <SelectTrigger className="h-11 border-border/80 bg-background/50 focus:ring-primary/20">
              <SelectValue placeholder="Choose an assessment schedule to audit..." />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((sch) => (
                <SelectItem
                  key={sch.id}
                  value={sch.id}
                  className="cursor-pointer"
                >
                  <span className="font-semibold text-foreground">
                    {sch.assessmentName}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2.5">
                    — {sch.scheduledDate} ({sch.startTime})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Panel Content */}
      {loadingSchedules ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-rose-500" />
          <p className="text-muted-foreground text-sm font-medium">Loading assessment schedules...</p>
        </div>
      ) : !errorSchedules && schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-card/10 text-center gap-3">
          <Shield className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-base font-semibold text-muted-foreground">No assessment schedules found.</p>
          <p className="text-sm text-muted-foreground/70">Create a scheduled test first to begin proctoring.</p>
        </div>
      ) : !selectedScheduleId ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-card/10 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base font-semibold text-muted-foreground">
            Select an assessment schedule to view proctoring activity.
          </p>
        </div>
      ) : loadingCandidates ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-rose-500" />
          <p className="text-muted-foreground text-sm font-medium">Fetching proctoring metrics and candidate telemetry...</p>
        </div>
      ) : errorCandidates ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-card/10 text-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-400/60" />
          <p className="text-base font-semibold text-muted-foreground">{errorCandidates}</p>
          <Button variant="outline" size="sm" onClick={() => loadCandidates(selectedScheduleId)} className="mt-1">
            <RefreshCw className="h-3.5 w-3.5 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Candidates
                  </span>
                  <Users className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{totalCount}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Invited to assessment
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Active Candidates
                  </span>
                  <Clock className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-450">
                    {activeCount}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Currently taking test
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted
                  </span>
                  <CheckCircle className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-purple-600 dark:text-purple-450">
                    {submittedCount}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tests completed
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-500/20 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50 relative overflow-hidden">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Flagged Candidates
                  </span>
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 animate-bounce" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                    {flaggedCount}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    High/Critical risk levels
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50 col-span-2 md:col-span-1">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Proctoring Mode
                  </span>
                  <Camera className="h-4.5 w-4.5 text-orange-650 dark:text-orange-400" />
                </div>
                <div className="mt-4">
                  <span className="text-xl md:text-2xl font-bold text-orange-650 dark:text-orange-400 uppercase">
                    {proctorMode}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Assigned security level
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-border/80 bg-background/50 focus-visible:ring-primary/20 text-sm"
              />
            </div>

            <div>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="h-10 bg-background/50 text-xs md:text-sm">
                  <SelectValue placeholder="Filter by Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Risk Levels</SelectItem>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 bg-background/50 text-xs md:text-sm">
                  <SelectValue placeholder="Filter by Test Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Test Statuses</SelectItem>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="AUTO_SUBMITTED">Auto Submitted</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterReview} onValueChange={setFilterReview}>
                <SelectTrigger className="h-10 bg-background/50 text-xs md:text-sm">
                  <SelectValue placeholder="Filter by Review Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Review Statuses</SelectItem>
                  <SelectItem value="NOT_REVIEWED">Not Reviewed</SelectItem>
                  <SelectItem value="CLEAN">Clean</SelectItem>
                  <SelectItem value="WARNING_ISSUED">Warning Issued</SelectItem>
                  <SelectItem value="NEEDS_MANUAL_REVIEW">
                    Needs Review
                  </SelectItem>
                  <SelectItem value="DISQUALIFIED">Disqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Candidate List UI */}
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-xl bg-card/10 space-y-3">
              <Users className="h-12 w-12 text-muted-foreground/35 mx-auto" />
              <p className="font-semibold text-muted-foreground text-sm">
                No candidates found for this schedule.
              </p>
              <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
                No telemetry details match your search terms or filter
                configurations.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block border rounded-xl bg-card shadow-sm overflow-hidden border-border/60">
                <Table>
                  <TableHeader className="bg-muted/40 font-heading">
                    <TableRow>
                      <TableHead className="pl-6 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Candidate
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Test Status
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Proctor Mode
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Risk Level
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground tracking-wider text-center">
                        Violations (Crit)
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Last Activity
                      </TableHead>
                      <TableHead className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Review Status
                      </TableHead>
                      <TableHead className="text-right pr-6 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((cand) => (
                      <TableRow
                        key={cand.id}
                        className="hover:bg-muted/5 transition-colors border-b"
                      >
                        <TableCell className="pl-6 py-4">
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {cand.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cand.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTestStatusBadge(cand.testStatus)}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold uppercase">
                          {cand.proctoringMode}
                        </TableCell>
                        <TableCell>{getRiskBadge(cand.riskLevel)}</TableCell>
                        <TableCell className="text-center font-mono font-medium">
                          <span
                            className={
                              cand.violationsCount > 0
                                ? "text-rose-600 font-bold"
                                : "text-slate-500"
                            }
                          >
                            {cand.violationsCount}
                          </span>
                          <span className="text-muted-foreground/60 text-xs">
                            {" "}
                            (
                            <span
                              className={
                                cand.criticalViolationsCount > 0
                                  ? "text-red-700 font-extrabold"
                                  : ""
                              }
                            >
                              {cand.criticalViolationsCount}
                            </span>
                            )
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {cand.lastActivity}
                        </TableCell>
                        <TableCell>
                          {getReviewStatusBadge(cand.reviewStatus)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadCandidateDetails(cand)}
                            className="h-8 text-xs border-border/80 hover:border-rose-500/30 text-foreground hover:bg-rose-500/5 transition-colors gap-1.5 font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card-Based List View */}
              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {filteredCandidates.map((cand) => (
                  <Card key={cand.id} className="border-border/60 hover:shadow">
                    <CardContent className="p-4 space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm">{cand.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {cand.email}
                          </p>
                        </div>
                        {getRiskBadge(cand.riskLevel)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Status
                          </span>
                          <div className="mt-0.5">
                            {getTestStatusBadge(cand.testStatus)}
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Violations (Crit)
                          </span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-350">
                            {cand.violationsCount} ({cand.criticalViolationsCount}
                            )
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Proctor Mode
                          </span>
                          <span className="font-mono uppercase font-semibold">
                            {cand.proctoringMode}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Review Decision
                          </span>
                          <div className="mt-0.5">
                            {getReviewStatusBadge(cand.reviewStatus)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground font-mono">
                        <span>Last active: {cand.lastActivity}</span>
                        <Button
                          size="sm"
                          onClick={() => loadCandidateDetails(cand)}
                          className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold flex gap-1 items-center"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. Candidate Details Drawer / Modal Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl h-full p-0 flex flex-col bg-card border-l border-border/80">
          <SheetHeader className="p-5 border-b border-border/50 shrink-0 text-left bg-gradient-to-r from-card to-muted/20">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <SheetTitle className="text-xl font-heading font-bold flex items-center gap-2">
                  <User className="h-5.5 w-5.5 text-rose-500" />
                  Candidate Audit
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Session diagnostics, screenshots timeline, and malpractice decision.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {loadingDetails ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <RefreshCw className="h-9 w-9 animate-spin text-rose-500" />
              <p className="text-sm text-muted-foreground font-medium">
                Fetching candidate timeline and telemetry details...
              </p>
            </div>
          ) : (
            candidateDetails && (
              <div className="flex-1 overflow-y-auto flex flex-col p-5 space-y-6">
                {/* Header Summary Profile card */}
                <div className="p-4 rounded-xl border bg-card/60 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold">{candidateDetails.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {candidateDetails.email}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getTestStatusBadge(candidateDetails.testStatus)}
                        {getRiskBadge(candidateDetails.riskLevel)}
                        {getReviewStatusBadge(candidateDetails.reviewStatus)}
                      </div>
                    </div>

                    {/* Radial Risk Score Gauge */}
                    <div className="relative h-24 w-24 flex items-center justify-center self-center sm:self-auto shrink-0 bg-background rounded-full border border-border shadow-sm">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                            candidateDetails.riskScore >= 75
                              ? "stroke-red-500"
                              : candidateDetails.riskScore >= 40
                                ? "stroke-amber-500"
                                : "stroke-emerald-500"
                          }`}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * candidateDetails.riskScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center flex flex-col items-center justify-center">
                        <span className="text-lg font-bold font-mono">
                          {candidateDetails.riskScore}%
                        </span>
                        <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-wider">
                          Risk Score
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs inside drawer */}
                <Tabs defaultValue="overview" className="w-full flex-1 flex flex-col">
                  {/* Radix tab selector styled beautifully */}
                  <TabsList className="flex overflow-x-auto whitespace-nowrap bg-muted p-1 rounded-md shrink-0 scrollbar-none justify-start w-full">
                    <TabsTrigger value="overview" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Info className="h-3.5 w-3.5" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="violations" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Violations ({candidateDetails.violationsCount})
                    </TabsTrigger>
                    <TabsTrigger value="evidence" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <FileText className="h-3.5 w-3.5" /> Evidence
                    </TabsTrigger>
                    <TabsTrigger value="snapshots" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Grid className="h-3.5 w-3.5" /> Snapshots
                    </TabsTrigger>
                    <TabsTrigger value="system" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Laptop className="h-3.5 w-3.5" /> System Info
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Check className="h-3.5 w-3.5" /> Review
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab Content */}
                  <TabsContent value="overview" className="space-y-4 pt-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Violations Recorded
                        </span>
                        <span className="text-xl font-bold font-mono text-rose-500">
                          {candidateDetails.violationsCount}
                        </span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Critical Flags
                        </span>
                        <span className="text-xl font-bold font-mono text-red-600">
                          {candidateDetails.criticalViolationsCount}
                        </span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Started At
                        </span>
                        <span className="text-sm font-semibold font-mono">
                          {candidateDetails.startedAt}
                        </span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Submitted At
                        </span>
                        <span className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-350">
                          {candidateDetails.submittedAt || "In Progress"}
                        </span>
                      </div>
                    </div>

                    <Card className="border-border/50">
                      <CardHeader className="py-3 px-4 border-b">
                        <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Shield className="h-4 w-4" /> Proctor Rules Applied
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">Webcam Image Proctoring</span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px]">ACTIVE</Badge>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">Tab Switch Protection</span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px]">ACTIVE</Badge>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">Object Recognition AI</span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px]">ACTIVE</Badge>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground">Browser DevTools Detection</span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px]">ACTIVE</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Violations Timeline Tab Content */}
                  <TabsContent value="violations" className="space-y-4 pt-4 flex-1">
                    {candidateDetails.violations.length === 0 ? (
                      <div className="text-center py-14 space-y-2 border border-dashed rounded-lg bg-emerald-500/5 border-emerald-500/20">
                        <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto opacity-70" />
                        <h4 className="font-semibold text-emerald-600 text-sm">No Malpractice Detected</h4>
                        <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
                          Candidate has maintained a clean record and triggered no warnings.
                        </p>
                      </div>
                    ) : (
                      <div className="relative border-l border-border pl-4 ml-2 space-y-5 py-2">
                        {candidateDetails.violations.map((viol) => (
                          <div key={viol.id} className="relative space-y-1">
                            {/* Dot indicator */}
                            <span className={`absolute -left-[22.5px] top-1 h-3 w-3 rounded-full border bg-background ${
                              viol.severity === "CRITICAL"
                                ? "border-red-500 ring-2 ring-red-500/20"
                                : viol.severity === "HIGH"
                                  ? "border-orange-500"
                                  : "border-yellow-500"
                            }`} />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {viol.time}
                              </span>
                              <Badge className={`text-[9px] px-1.5 py-0 border-none ${
                                viol.severity === "CRITICAL"
                                  ? "bg-red-500 text-white"
                                  : viol.severity === "HIGH"
                                    ? "bg-orange-500 text-white"
                                    : "bg-yellow-500 text-slate-900"
                              }`}>
                                {viol.severity}
                              </Badge>
                            </div>
                            <h5 className="font-bold text-xs text-foreground uppercase tracking-wide mt-1">
                              {viol.eventType.replace(/_/g, " ")}
                            </h5>
                            <p className="text-xs text-muted-foreground">
                              {viol.description}
                            </p>
                            {viol.evidenceAvailable && (
                              <div className="flex items-center gap-1 text-[9px] text-rose-500 font-semibold mt-1 font-mono uppercase">
                                <Camera className="h-3 w-3" /> Image capture attached
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Evidence Tab Content */}
                  <TabsContent value="evidence" className="space-y-4 pt-4 flex-1">
                    {candidateDetails.evidences.length === 0 ? (
                      <div className="text-center py-16 space-y-2 border border-dashed rounded-lg bg-card/10">
                        <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                        <h4 className="font-semibold text-muted-foreground text-sm">No Recorded Frame Captures</h4>
                        <p className="text-xs text-muted-foreground/80">
                          There is no image capture evidence required for review.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {candidateDetails.evidences.map((ev) => (
                          <div key={ev.id} className="bg-card border border-border/60 rounded-xl p-3.5 space-y-3 shadow-sm hover:shadow transition-shadow">
                            <CameraFeedPlaceholder eventType={ev.eventType} isEvidence={true} imageUrl={ev.imageUrl} />
                            
                            <div className="space-y-1">
                              <div className="flex justify-between items-center gap-1.5">
                                <span className="text-xs font-bold text-foreground truncate uppercase max-w-[120px]">
                                  {ev.eventType.replace(/_/g, " ")}
                                </span>
                                <Badge className={`text-[9px] px-1.5 py-0 border-none ${
                                  ev.severity === "CRITICAL"
                                    ? "bg-red-500 text-white animate-pulse"
                                    : ev.severity === "HIGH"
                                      ? "bg-orange-500 text-white"
                                      : "bg-yellow-500 text-slate-900"
                                }`}>
                                  {ev.severity}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                Capt: {ev.capturedAt}
                              </p>
                              {ev.description && (
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 italic line-clamp-2">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Snapshots Grid Tab Content */}
                  <TabsContent value="snapshots" className="space-y-4 pt-4 flex-1">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Periodic Webcam Audits</span>
                        <span className="text-slate-500 font-mono">Total Feed Frames: {candidateDetails.snapshots.length}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {candidateDetails.snapshots.map((snap, idx) => (
                          <div key={snap.id} className="bg-slate-950/5 border border-border/60 p-2 rounded-lg flex flex-col space-y-2">
                            <CameraFeedPlaceholder eventType="AUDIT_SNAP" isEvidence={false} imageUrl={snap.imageUrl} />
                            <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground">
                              <span>SNAP #{idx + 1}</span>
                              <span>{snap.capturedAt}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* System Info Tab Content */}
                  <TabsContent value="system" className="space-y-4 pt-4 flex-1">
                    <div className="bg-card border rounded-xl divide-y divide-border/50 overflow-hidden shadow-sm">
                      <div className="flex justify-between items-center p-3 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Globe className="h-4 w-4 text-slate-500" /> Browser Client
                        </span>
                        <span className="font-mono text-foreground font-semibold">{candidateDetails.systemInfo.browser}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Monitor className="h-4 w-4 text-slate-500" /> Operating System
                        </span>
                        <span className="font-mono text-foreground font-semibold">{candidateDetails.systemInfo.os}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Info className="h-4 w-4 text-slate-500" /> IP Address
                        </span>
                        <span className="font-mono text-foreground font-semibold">{candidateDetails.systemInfo.ipAddress}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Laptop className="h-4 w-4 text-slate-500" /> Device Type
                        </span>
                        <span className="font-mono text-foreground font-semibold">{candidateDetails.systemInfo.device}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Maximize className="h-4 w-4 text-slate-500" /> Screen Resolution
                        </span>
                        <span className="font-mono text-foreground font-semibold">{candidateDetails.systemInfo.screenResolution}</span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Review Tab Content */}
                  <TabsContent value="review" className="space-y-4 pt-4 flex-1">
                    <Card className="border-border/50">
                      <CardHeader className="py-3 px-4 border-b bg-muted/10">
                        <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-emerald-500" /> Admin Decision Audit
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 text-xs">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-foreground">Update Candidate Audit Ruling</Label>
                          <Select
                            value={candidateDetails.reviewStatus}
                            onValueChange={(val) => handleUpdateReviewStatus(val as ReviewStatus)}
                          >
                            <SelectTrigger className="w-full h-10 border-border/80 bg-background/50">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOT_REVIEWED">Not Reviewed</SelectItem>
                              <SelectItem value="CLEAN">Clean (Approved)</SelectItem>
                              <SelectItem value="WARNING_ISSUED">Warning Issued</SelectItem>
                              <SelectItem value="NEEDS_MANUAL_REVIEW">Needs Review</SelectItem>
                              <SelectItem value="DISQUALIFIED">Disqualified</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                          Note: Updates are simulated. Changing candidate review status will update the list and details view dynamically.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
