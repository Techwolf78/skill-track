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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  UserCheck,
  FileText,
  Download,
  ExternalLink,
  Columns,
  ZoomIn,
  X,
  ChevronsUpDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { TestSession } from "@/lib/test-service";
import { TestPhotoUploadModal } from "@/proctoring/components/TestPhotoUploadModal";
import { ExtendTimeModal, ExtendTimeCandidateSession } from "@/components/admin/ExtendTimeModal";

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
  sessionId?: string;
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
  sessionId?: string;
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
  candidatePhoto?: { imageUrl: string; capturedAt: string } | null;
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

  // Schedule Search Combobox State
  const [scheduleComboboxOpen, setScheduleComboboxOpen] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("");

  // Table Sorting State
  type SortField =
    | "name"
    | "testStatus"
    | "proctoringMode"
    | "riskLevel"
    | "violationsCount"
    | "lastActivity"
    | "reviewStatus";
  const [sortField, setSortField] = useState<SortField>("riskLevel");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Table Pagination & View Mode State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isCompact, setIsCompact] = useState(false);

  // Selected Candidate Details / Drawer State
  const [selectedCandidate, setSelectedCandidate] =
    useState<ProctoringCandidate | null>(null);
  const [candidateDetails, setCandidateDetails] =
    useState<CandidateProctoringDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSavingReview, setIsSavingReview] = useState(false);

  // Evidence UI Enhancements State
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    capturedAt?: string;
    eventType?: string;
  } | null>(null);
  const [compareWithBaseline, setCompareWithBaseline] = useState<string | null>(null); // frame ID being compared
  const [activeViolationId, setActiveViolationId] = useState<string | null>(null);

  // Test Photo Upload Modal State
  const [showTestUploadModal, setShowTestUploadModal] = useState(false);

  // Time Extension Modal State
  const [isExtendTimeModalOpen, setIsExtendTimeModalOpen] = useState(false);
  const [selectedCandidateForExtension, setSelectedCandidateForExtension] = useState<ExtendTimeCandidateSession | null>(null);

  const handleOpenExtendTimeModal = (candidate: ProctoringCandidate | CandidateProctoringDetail) => {
    const currentSchedule = schedules.find((s) => s.id === selectedScheduleId);
    const resolvedSessionId = candidate.sessionId || candidates.find((c) => c.id === candidate.id)?.sessionId;

    if (!resolvedSessionId) {
      toast({
        title: "Session Not Active",
        description: "No active test session found for this candidate yet.",
        variant: "destructive",
      });
      return;
    }

    const sessionData: ExtendTimeCandidateSession = {
      id: resolvedSessionId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      testTitle: currentSchedule?.assessmentName || "Active Assessment",
      formattedRemaining: "Active",
    };
    setSelectedCandidateForExtension(sessionData);
    setIsExtendTimeModalOpen(true);
  };

  const handleExtendTimeSuccess = (_updatedSession: TestSession) => {
    toast({
      title: "Time Extended",
      description: `Successfully granted extra time for candidate.`,
    });
    if (selectedScheduleId) {
      loadCandidates(selectedScheduleId);
    }
  };

  // Fetch Schedules API
  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setErrorSchedules(null);
    try {
      const response = await apiClient.get("/admin/proctoring/assessment-schedules");
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
        `/admin/proctoring/assessment-schedules/${scheduleId}/candidates`,
      );
      const data = response.data?.data ?? response.data;
      const mappedCandidates = Array.isArray(data) ? data.map((cand: { candidateId: string; sessionId?: string; candidateName: string; email: string; testStatus: string; proctoringMode: ProctoringMode; riskLevel: RiskLevel; violationCount: number; criticalViolationCount: number; lastActivityAt?: string; reviewStatus?: ReviewStatus }) => ({
        id: cand.candidateId,
        sessionId: cand.sessionId,
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
        `/admin/proctoring/candidates/${candidate.id}/details?scheduleId=${selectedScheduleId}`,
      );
      const data = response.data?.data ?? response.data;
      console.log(`[Proctoring Dashboard] loadCandidateDetails response:`, data);
      console.log(`[Proctoring Dashboard] raw candidatePhoto:`, data?.candidatePhoto);
      console.log(`[Proctoring Dashboard] raw evidence list:`, data?.evidence);
      console.log(`[Proctoring Dashboard] raw snapshots list:`, data?.snapshots);

      if (data && typeof data === "object") {
        const mappedDetail: CandidateProctoringDetail = {
          id: data.candidate?.candidateId || candidate.id,
          sessionId: data.systemInfo?.sessionId || candidate.sessionId,
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
          evidences: data.evidence?.map((e: { id?: string; imageData?: string; s3Key?: string; snapshotType?: string; capturedAt?: string }) => {
            const key = e.imageData || e.s3Key || "";
            const fullUrl = key && !key.startsWith("http") && !key.startsWith("data:")
              ? `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${key}`
              : key;
            return {
              id: e.id,
              imageUrl: fullUrl,
              eventType: e.snapshotType || "VIOLATION",
              capturedAt: e.capturedAt ? new Date(e.capturedAt).toLocaleString() : "N/A",
              severity: "HIGH" as ProctoringEventSeverity,
              description: e.s3Key || "Attached Frame Capture",
            };
          }) || [],
          snapshots: data.snapshots?.map((s: { id?: string; imageData?: string; s3Key?: string; capturedAt?: string }) => {
            const key = s.imageData || s.s3Key || "";
            const fullUrl = key && !key.startsWith("http") && !key.startsWith("data:")
              ? `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${key}`
              : key;
            return {
              id: s.id,
              imageUrl: fullUrl,
              capturedAt: s.capturedAt ? new Date(s.capturedAt).toLocaleTimeString() : "N/A",
            };
          }) || [],
          candidatePhoto: data.candidatePhoto ? {
            imageUrl: data.candidatePhoto.imageData
              ? (data.candidatePhoto.imageData.startsWith("data:") ? data.candidatePhoto.imageData : `data:image/jpeg;base64,${data.candidatePhoto.imageData}`)
              : (data.candidatePhoto.s3Key ? (data.candidatePhoto.s3Key.startsWith("http") ? data.candidatePhoto.s3Key : `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${data.candidatePhoto.s3Key}`) : ""),
            capturedAt: data.candidatePhoto.capturedAt ? new Date(data.candidatePhoto.capturedAt).toLocaleString() : "N/A",
          } : (() => {
            const photoEvidence = data.evidence?.find((e: { snapshotType?: string }) => e.snapshotType === "CANDIDATE_PHOTO");
            return photoEvidence ? {
              imageUrl: photoEvidence.imageData
                ? (photoEvidence.imageData.startsWith("data:") ? photoEvidence.imageData : `data:image/jpeg;base64,${photoEvidence.imageData}`)
                : (photoEvidence.s3Key ? (photoEvidence.s3Key.startsWith("http") ? photoEvidence.s3Key : `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${photoEvidence.s3Key}`) : ""),
              capturedAt: photoEvidence.capturedAt ? new Date(photoEvidence.capturedAt).toLocaleString() : "N/A",
            } : null;
          })(),
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

  // Update Candidate Review status (persisted to DB)
  const handleUpdateReviewStatus = async (newStatus: ReviewStatus) => {
    if (!selectedCandidate) return;

    setIsSavingReview(true);
    try {
      await apiClient.patch(
        `/admin/proctoring/candidates/${selectedCandidate.id}/review-status`,
        {
          scheduleId: selectedScheduleId,
          reviewStatus: newStatus,
        },
      );

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
        title: "Review Decision Saved",
        description: `Review status updated to ${newStatus.replace(/_/g, " ")} and saved to database.`,
      });
    } catch (err) {
      console.error("Failed to update candidate review status:", err);
      toast({
        title: "Update Failed",
        description: "Could not save candidate review status to database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingReview(false);
    }
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
            console.log(`[Proctoring Dashboard] Candidate Details Raw Response from Backend:`, data);
            console.log(`[Proctoring Dashboard] candidatePhoto payload:`, data?.candidatePhoto);
            console.log(`[Proctoring Dashboard] evidence list payload:`, data?.evidence);
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
                evidences: data.evidence?.map((e: { id?: string; imageData?: string; s3Key?: string; snapshotType?: string; capturedAt?: string }) => {
                  const key = e.imageData || e.s3Key || "";
                  const fullUrl = key && !key.startsWith("http") && !key.startsWith("data:")
                    ? `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${key}`
                    : key;
                  return {
                    id: e.id,
                    imageUrl: fullUrl,
                    eventType: e.snapshotType || "VIOLATION",
                    capturedAt: e.capturedAt ? new Date(e.capturedAt).toLocaleString() : "N/A",
                    severity: "HIGH" as ProctoringEventSeverity,
                    description: e.s3Key || "Attached Frame Capture",
                  };
                }) || [],
                snapshots: data.snapshots?.map((s: { id?: string; imageData?: string; s3Key?: string; capturedAt?: string }) => {
                  const key = s.imageData || s.s3Key || "";
                  const fullUrl = key && !key.startsWith("http") && !key.startsWith("data:")
                    ? `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${key}`
                    : key;
                  return {
                    id: s.id,
                    imageUrl: fullUrl,
                    capturedAt: s.capturedAt ? new Date(s.capturedAt).toLocaleTimeString() : "N/A",
                  };
                }) || [],
                candidatePhoto: data.candidatePhoto ? {
                  imageUrl: data.candidatePhoto.imageData
                    ? (data.candidatePhoto.imageData.startsWith("data:") ? data.candidatePhoto.imageData : `data:image/jpeg;base64,${data.candidatePhoto.imageData}`)
                    : (data.candidatePhoto.s3Key ? (data.candidatePhoto.s3Key.startsWith("http") ? data.candidatePhoto.s3Key : `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${data.candidatePhoto.s3Key}`) : ""),
                  capturedAt: data.candidatePhoto.capturedAt ? new Date(data.candidatePhoto.capturedAt).toLocaleString() : "N/A",
                } : (() => {
                  const photoEvidence = data.evidence?.find((e: { snapshotType?: string }) => e.snapshotType === "CANDIDATE_PHOTO");
                  return photoEvidence ? {
                    imageUrl: photoEvidence.imageData
                      ? (photoEvidence.imageData.startsWith("data:") ? photoEvidence.imageData : `data:image/jpeg;base64,${photoEvidence.imageData}`)
                      : (photoEvidence.s3Key ? (photoEvidence.s3Key.startsWith("http") ? photoEvidence.s3Key : `https://bcugndjwwyckvwctfdus.supabase.co/storage/v1/object/public/proctoring-evidence/${photoEvidence.s3Key}`) : ""),
                    capturedAt: photoEvidence.capturedAt ? new Date(photoEvidence.capturedAt).toLocaleString() : "N/A",
                  } : null;
                })(),
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

  // Auto-reset page when filters, sorting, or selected schedule changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterRisk,
    filterStatus,
    filterReview,
    selectedScheduleId,
    pageSize,
    sortField,
    sortOrder,
  ]);

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

  // Sort candidates
  const riskWeight: Record<RiskLevel, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    NONE: 0,
  };

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    let result = 0;
    switch (sortField) {
      case "name":
        result = a.name.localeCompare(b.name);
        break;
      case "testStatus":
        result = a.testStatus.localeCompare(b.testStatus);
        break;
      case "proctoringMode":
        result = a.proctoringMode.localeCompare(b.proctoringMode);
        break;
      case "riskLevel":
        result =
          (riskWeight[a.riskLevel] || 0) - (riskWeight[b.riskLevel] || 0);
        break;
      case "violationsCount":
        result = a.violationsCount - b.violationsCount;
        break;
      case "lastActivity":
        result = a.lastActivity.localeCompare(b.lastActivity);
        break;
      case "reviewStatus":
        result = a.reviewStatus.localeCompare(b.reviewStatus);
        break;
      default:
        result = 0;
    }
    return sortOrder === "asc" ? result : -result;
  });

  // Pagination computations
  const totalFilteredCount = sortedCandidates.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCandidates = sortedCandidates.slice(
    startIndex,
    startIndex + pageSize,
  );

  // Column sort toggler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Sort header icon renderer
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 ml-1 inline" />
      );
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-rose-500 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-rose-500 ml-1 inline" />
    );
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredCandidates.length === 0) {
      toast({
        title: "Export Empty",
        description: "No candidate records match the current filter set.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Candidate Name",
      "Email",
      "Test Status",
      "Proctor Mode",
      "Risk Level",
      "Violations Count",
      "Critical Violations",
      "Last Activity",
      "Review Status",
    ];

    const rows = filteredCandidates.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      c.testStatus,
      c.proctoringMode,
      c.riskLevel,
      c.violationsCount,
      c.criticalViolationsCount,
      `"${c.lastActivity}"`,
      c.reviewStatus,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeName =
      selectedSchedule?.assessmentName.replace(/[^a-zA-Z0-9]/g, "_") ||
      "Schedule";
    link.setAttribute(
      "download",
      `Proctoring_Audit_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredCandidates.length} candidate record(s) to CSV.`,
    });
  };

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
    <div className="p-3 md:p-5 space-y-4 animate-fade-in w-full">
      {/* API Error Banner for Schedules */}
      {errorSchedules && (
        <div className="flex items-center justify-between gap-3 p-2.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorSchedules}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedules}
            className="h-7 border-red-500/20 hover:bg-red-500/10 text-red-600 dark:text-red-400 flex gap-1 items-center shrink-0 text-xs"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-rose-600 animate-pulse shrink-0" />
            Proctoring Security Center
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">
            Track student activities, view system configuration, check camera
            captures, and manage violations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">

          <Button
            variant="default"
            onClick={() => setShowTestUploadModal(true)}
            className="h-8.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3"
          >
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Test Photo Upload
          </Button>

          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={loadingSchedules || loadingCandidates}
            className="h-8.5 text-xs hover:bg-rose-50/40 dark:hover:bg-rose-950/10 border-rose-500/20 text-rose-600 px-3"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${loadingSchedules || loadingCandidates ? "animate-spin" : ""}`}
            />
            Sync Feed
          </Button>
        </div>
      </div>

      {/* 1. Assessment Schedule Dropdown selection */}
      <div className="bg-card p-3 md:p-4 rounded-lg border border-border/60 shadow-sm backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-rose-500" /> Select Assessment Schedule
          </Label>
          {schedules.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono font-semibold border-border/80 text-muted-foreground px-1.5 py-0">
              {schedules.length} Schedules
            </Badge>
          )}
        </div>

        <Popover open={scheduleComboboxOpen} onOpenChange={setScheduleComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={scheduleComboboxOpen}
              disabled={loadingSchedules}
              className="w-full justify-between h-9 px-3 border-border/80 bg-background/50 hover:bg-background/80 focus:ring-2 focus:ring-primary/20 text-left font-normal text-xs md:text-sm"
            >
              {selectedSchedule ? (
                <div className="flex items-center gap-3 truncate">
                  <span className="font-semibold text-foreground truncate">
                    {selectedSchedule.assessmentName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    — {selectedSchedule.scheduledDate} ({selectedSchedule.startTime})
                  </span>
                  {selectedSchedule.proctoringMode && (
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono shrink-0 hidden sm:inline-flex">
                      {selectedSchedule.proctoringMode} MODE
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {loadingSchedules ? "Loading schedules..." : "Search or choose an assessment schedule..."}
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
                {schedules.filter(
                  (sch) =>
                    sch.assessmentName
                      .toLowerCase()
                      .includes(scheduleSearchQuery.toLowerCase()) ||
                    sch.scheduledDate
                      .toLowerCase()
                      .includes(scheduleSearchQuery.toLowerCase()),
                ).length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching schedules found.
                  </div>
                ) : (
                  schedules
                    .filter(
                      (sch) =>
                        sch.assessmentName
                          .toLowerCase()
                          .includes(scheduleSearchQuery.toLowerCase()) ||
                        sch.scheduledDate
                          .toLowerCase()
                          .includes(scheduleSearchQuery.toLowerCase()),
                    )
                    .map((sch) => {
                      const isSelected = sch.id === selectedScheduleId;
                      return (
                        <button
                          key={sch.id}
                          onClick={() => {
                            setSelectedScheduleId(sch.id);
                            setScheduleComboboxOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-left transition-colors ${
                            isSelected
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20"
                              : "hover:bg-muted/60 text-foreground"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-medium truncate">
                              {sch.assessmentName}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {sch.scheduledDate} ({sch.startTime})
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sch.proctoringMode && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono uppercase px-1.5 py-0"
                              >
                                {sch.proctoringMode}
                              </Badge>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 text-rose-500 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
        <div className="space-y-4 animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-3 md:p-3.5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Candidates
                  </span>
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl md:text-3xl font-bold">{totalCount}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Invited to assessment
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-3 md:p-3.5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Active Candidates
                  </span>
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-450">
                    {activeCount}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Currently taking test
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-3 md:p-3.5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted
                  </span>
                  <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-450">
                    {submittedCount}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Tests completed
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-500/20 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50 relative overflow-hidden">
              <CardContent className="p-3 md:p-3.5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Flagged Candidates
                  </span>
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-bounce" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl md:text-3xl font-bold text-rose-600 dark:text-rose-400">
                    {flaggedCount}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    High/Critical risk levels
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/50 col-span-2 md:col-span-1">
              <CardContent className="p-3 md:p-3.5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Proctoring Mode
                  </span>
                  <Camera className="h-4 w-4 text-orange-650 dark:text-orange-400" />
                </div>
                <div className="mt-2">
                  <span className="text-lg md:text-xl font-bold text-orange-650 dark:text-orange-400 uppercase">
                    {proctorMode}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Assigned security level
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Control Toolbar */}
          <div className="flex flex-col space-y-2 bg-card p-3 rounded-lg border border-border/60 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 h-8.5 border-border/80 bg-background/50 focus-visible:ring-primary/20 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div>
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="h-8.5 bg-background/50 text-xs">
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
                  <SelectTrigger className="h-8.5 bg-background/50 text-xs">
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
                  <SelectTrigger className="h-8.5 bg-background/50 text-xs">
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

            {/* Utility row: results count, clear filters, density toggle, CSV export */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">
                  Showing <strong className="text-foreground">{totalFilteredCount}</strong> of{" "}
                  <strong className="text-foreground">{candidates.length}</strong> candidates
                </span>
                {(searchQuery ||
                  filterRisk !== "ALL" ||
                  filterStatus !== "ALL" ||
                  filterReview !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterRisk("ALL");
                      setFilterStatus("ALL");
                      setFilterReview("ALL");
                    }}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-2 gap-1"
                  >
                    <FilterX className="h-3 w-3" /> Clear Filters
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block cursor-not-allowed">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={totalFilteredCount === 0}
                          onClick={() => setIsCompact(!isCompact)}
                          className={`h-8 text-xs gap-1.5 ${isCompact ? "bg-muted font-semibold" : ""}`}
                        >
                          <Columns className="h-3.5 w-3.5" />
                          {isCompact ? "Standard View" : "Compact View"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {totalFilteredCount === 0 && (
                      <TooltipContent side="top" className="text-xs">
                        No candidate data available to toggle view
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block cursor-not-allowed">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={totalFilteredCount === 0}
                          onClick={handleExportCSV}
                          className="h-8 text-xs border-border/80 hover:bg-muted gap-1.5 font-medium disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5 text-rose-500" /> Export CSV
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {totalFilteredCount === 0 && (
                      <TooltipContent side="top" className="text-xs">
                        No candidate data available to export
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Candidate List UI */}
          {totalFilteredCount === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-xl bg-card/10 space-y-3">
              <Users className="h-12 w-12 text-muted-foreground/35 mx-auto" />
              <p className="font-semibold text-muted-foreground text-sm">
                No candidates found for this schedule.
              </p>
              <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">
                No telemetry details match your search terms or filter configurations.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block border rounded-xl bg-card shadow-sm overflow-hidden border-border/60">
                <Table>
                  <TableHeader className="bg-muted/40 font-heading">
                    <TableRow>
                      <TableHead
                        onClick={() => handleSort("name")}
                        className="pl-6 text-xs font-bold uppercase text-muted-foreground tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Candidate {renderSortIcon("name")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("testStatus")}
                        className="text-xs font-bold uppercase text-muted-foreground tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Test Status {renderSortIcon("testStatus")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("proctoringMode")}
                        className="text-xs font-bold uppercase text-muted-foreground tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Proctor Mode {renderSortIcon("proctoringMode")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("riskLevel")}
                        className="text-xs font-bold uppercase text-muted-foreground tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Risk Level {renderSortIcon("riskLevel")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("violationsCount")}
                        className="text-xs font-bold uppercase text-muted-foreground tracking-wider text-center cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Violations (Crit) {renderSortIcon("violationsCount")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("lastActivity")}
                        className="text-xs font-bold uppercase text-muted-foreground tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Last Activity {renderSortIcon("lastActivity")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("reviewStatus")}
                        className="text-xs font-bold uppercase text-muted-foreground tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                      >
                        Review Status {renderSortIcon("reviewStatus")}
                      </TableHead>
                      <TableHead className="text-right pr-6 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCandidates.map((cand) => (
                      <TableRow
                        key={cand.id}
                        className="hover:bg-muted/5 transition-colors border-b"
                      >
                        <TableCell className={`pl-6 ${isCompact ? "py-2" : "py-3.5"}`}>
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {cand.name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {cand.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className={isCompact ? "py-2" : "py-3.5"}>
                          {getTestStatusBadge(cand.testStatus)}
                        </TableCell>
                        <TableCell className={`font-mono text-xs font-semibold uppercase ${isCompact ? "py-2" : "py-3.5"}`}>
                          {cand.proctoringMode}
                        </TableCell>
                        <TableCell className={isCompact ? "py-2" : "py-3.5"}>
                          {getRiskBadge(cand.riskLevel)}
                        </TableCell>
                        <TableCell className={`text-center font-mono font-medium ${isCompact ? "py-2" : "py-3.5"}`}>
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
                        <TableCell className={`font-mono text-xs text-muted-foreground ${isCompact ? "py-2" : "py-3.5"}`}>
                          {cand.lastActivity}
                        </TableCell>
                        <TableCell className={isCompact ? "py-2" : "py-3.5"}>
                          {getReviewStatusBadge(cand.reviewStatus)}
                        </TableCell>
                        <TableCell className={`text-right pr-6 ${isCompact ? "py-2" : "py-3.5"}`}>
                          <div className="flex items-center justify-end gap-2">
                            {cand.testStatus === "IN_PROGRESS" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenExtendTimeModal(cand)}
                                className="h-8 text-xs text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 transition-colors gap-1.5 font-semibold"
                                title="Extend Time"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                <span>+ Time</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadCandidateDetails(cand)}
                              className="h-8 text-xs border-border/80 hover:border-rose-500/30 text-foreground hover:bg-rose-500/5 transition-colors gap-1.5 font-semibold"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card-Based List View */}
              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {paginatedCandidates.map((cand) => (
                  <Card key={cand.id} className="border-border/60 hover:shadow">
                    <CardContent className="p-4 space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm">{cand.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">
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
                            {cand.violationsCount} ({cand.criticalViolationsCount})
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
                        <div className="flex items-center gap-2">
                          {cand.testStatus === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenExtendTimeModal(cand)}
                              className="h-8 text-xs text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-white font-semibold flex gap-1 items-center"
                            >
                              <Clock className="h-3.5 w-3.5" /> + Time
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => loadCandidateDetails(cand)}
                            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold flex gap-1 items-center"
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    Showing <strong className="text-foreground font-semibold">{totalFilteredCount > 0 ? startIndex + 1 : 0}</strong> to{" "}
                    <strong className="text-foreground font-semibold">{Math.min(startIndex + pageSize, totalFilteredCount)}</strong> of{" "}
                    <strong className="text-foreground font-semibold">{totalFilteredCount}</strong> records
                  </span>

                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="hidden sm:inline text-muted-foreground">Rows per page:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => setPageSize(Number(val))}
                    >
                      <SelectTrigger className="h-8 w-16 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
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
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    className="h-8 w-8 p-0"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 w-8 p-0"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 font-mono font-medium text-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 p-0"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8 p-0"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. Candidate Details Drawer / Modal Sheet */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-3xl lg:max-w-4xl h-full p-0 flex flex-col bg-card border-l border-border/80">
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
                <div className="p-4 rounded-xl border bg-card/60 relative shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold">{candidateDetails.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {candidateDetails.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {getTestStatusBadge(candidateDetails.testStatus)}
                        {getRiskBadge(candidateDetails.riskLevel)}
                        {getReviewStatusBadge(candidateDetails.reviewStatus)}
                        {candidateDetails.testStatus === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenExtendTimeModal(candidateDetails)}
                            className="h-6 text-xs text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300 font-semibold gap-1 px-2.5 ml-2"
                          >
                            <Clock className="h-3 w-3 text-amber-400" />
                            Add Extra Time
                          </Button>
                        )}
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                  {/* Radix tab selector styled beautifully */}
                  <TabsList className="flex flex-wrap h-auto bg-muted/80 p-1.5 rounded-lg shrink-0 justify-start gap-1 w-full border border-border/40">
                    <TabsTrigger value="overview" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Info className="h-3.5 w-3.5" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="violations" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Violations ({candidateDetails.violationsCount})
                    </TabsTrigger>
                    <TabsTrigger value="evidence" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <FileText className="h-3.5 w-3.5" /> Evidence ({candidateDetails.evidences.length})
                    </TabsTrigger>
                    <TabsTrigger value="snapshots" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Grid className="h-3.5 w-3.5" /> Snapshots ({candidateDetails.snapshots.length})
                    </TabsTrigger>
                    <TabsTrigger value="system" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Laptop className="h-3.5 w-3.5" /> System Info
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-xs px-2.5 py-1.5 flex gap-1">
                      <Check className="h-3.5 w-3.5" /> Review
                    </TabsTrigger>
                    <TabsTrigger value="identity_pic" className="text-xs px-2.5 py-1.5 flex gap-1 font-semibold text-rose-500">
                      <UserCheck className="h-3.5 w-3.5" /> Identity Pic
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
                        {candidateDetails.violations.map((viol) => {
                          const isHighlighted = activeViolationId === viol.id;
                          return (
                            <div
                              key={viol.id}
                              id={`violation-item-${viol.id}`}
                              className={`relative space-y-1 p-2 rounded-lg transition-all ${
                                isHighlighted ? "bg-rose-500/10 border border-rose-500/30 ring-1 ring-rose-500/30" : ""
                              }`}
                            >
                              {/* Dot indicator */}
                              <span className={`absolute -left-[22.5px] top-3 h-3 w-3 rounded-full border bg-background ${
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setActiveTab("evidence")}
                                  className="h-6 px-2 text-[9px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-semibold font-mono uppercase flex gap-1 items-center mt-1"
                                >
                                  <Camera className="h-3 w-3" /> View Frame Evidence
                                </Button>
                              )}
                            </div>
                          );
                        })}
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
                        {candidateDetails.evidences.map((ev) => {
                          const isComparing = compareWithBaseline === ev.id;
                          return (
                            <div key={ev.id} className="bg-card border border-border/60 rounded-xl p-3.5 space-y-3 shadow-sm hover:shadow transition-shadow">
                              {/* Side-by-side identity comparison OR standard image view */}
                              {isComparing && candidateDetails.candidatePhoto?.imageUrl ? (
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                  <div className="relative h-32 rounded overflow-hidden border border-emerald-500/40">
                                    <img src={candidateDetails.candidatePhoto.imageUrl} alt="Baseline Identity" className="w-full h-full object-cover" />
                                    <span className="absolute top-1 left-1 text-[7px] font-mono text-emerald-400 bg-slate-950/80 px-1 rounded uppercase font-bold">
                                      BASELINE IDENTITY
                                    </span>
                                  </div>
                                  <div className="relative h-32 rounded overflow-hidden border border-rose-500/40">
                                    <img src={ev.imageUrl} alt="Captured Evidence" className="w-full h-full object-cover" />
                                    <span className="absolute top-1 left-1 text-[7px] font-mono text-rose-400 bg-slate-950/80 px-1 rounded uppercase font-bold">
                                      VIOLATION FRAME
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative group cursor-pointer" onClick={() => ev.imageUrl && setLightboxImage({ url: ev.imageUrl, title: `Evidence Frame: ${ev.eventType.replace(/_/g, " ")}`, capturedAt: ev.capturedAt, eventType: ev.eventType })}>
                                  <CameraFeedPlaceholder eventType={ev.eventType} isEvidence={true} imageUrl={ev.imageUrl} />
                                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                    <Badge className="bg-white/90 text-slate-900 font-semibold text-[10px] flex gap-1 items-center">
                                      <ZoomIn className="h-3 w-3" /> Zoom Frame
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-2">
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

                                {/* Action Buttons Toolbar */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                                  {ev.imageUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setLightboxImage({ url: ev.imageUrl!, title: `Evidence Frame: ${ev.eventType.replace(/_/g, " ")}`, capturedAt: ev.capturedAt, eventType: ev.eventType })}
                                      className="h-7 text-[10px] px-2 flex gap-1 items-center"
                                    >
                                      <ZoomIn className="h-3 w-3" /> Inspect
                                    </Button>
                                  )}

                                  {candidateDetails.candidatePhoto?.imageUrl && (
                                    <Button
                                      size="sm"
                                      variant={isComparing ? "secondary" : "outline"}
                                      onClick={() => setCompareWithBaseline(isComparing ? null : ev.id)}
                                      className="h-7 text-[10px] px-2 flex gap-1 items-center text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
                                    >
                                      <Columns className="h-3 w-3" /> {isComparing ? "Close Split" : "Compare ID"}
                                    </Button>
                                  )}

                                  {ev.imageUrl && (
                                    <a
                                      href={ev.imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={`evidence-${ev.id}.jpg`}
                                      className="h-7 px-2 text-[10px] font-medium border border-border rounded flex items-center gap-1 hover:bg-muted transition-colors text-muted-foreground ml-auto"
                                    >
                                      <Download className="h-3 w-3" /> Save
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                          <div key={snap.id} className="bg-slate-950/5 border border-border/60 p-2 rounded-lg flex flex-col space-y-2 group">
                            <div className="relative cursor-pointer" onClick={() => snap.imageUrl && setLightboxImage({ url: snap.imageUrl, title: `Periodic Snapshot #${idx + 1}`, capturedAt: snap.capturedAt, eventType: "PERIODIC_AUDIT" })}>
                              <CameraFeedPlaceholder eventType="AUDIT_SNAP" isEvidence={false} imageUrl={snap.imageUrl} />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <ZoomIn className="h-5 w-5 text-white" />
                              </div>
                            </div>
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
                            disabled={isSavingReview}
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
                          Review status decisions are saved directly to candidate audit records in the database.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Identity Pic Tab Content */}
                  <TabsContent value="identity_pic" className="space-y-4 pt-4 flex-1">
                    <Card className="border-border/50">
                      <CardHeader className="py-3 px-4 border-b bg-muted/10">
                        <CardTitle className="text-xs uppercase font-bold tracking-wider text-rose-500 flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4" /> Candidate Identity Verification Photo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {candidateDetails.candidatePhoto?.imageUrl ? (
                          <div
                            className="relative w-full h-64 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 shadow-md group cursor-pointer"
                            onClick={() => setLightboxImage({ url: candidateDetails.candidatePhoto!.imageUrl, title: "Verified Identity Baseline Photo", capturedAt: candidateDetails.candidatePhoto?.capturedAt, eventType: "IDENTITY_VERIFICATION" })}
                          >
                            <img
                              src={candidateDetails.candidatePhoto.imageUrl}
                              alt="Candidate Verification Identity Capture"
                              className="w-full h-full object-contain bg-slate-950"
                              onError={(e) => {
                                console.error("Identity photo failed to load URL:", candidateDetails.candidatePhoto?.imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider font-semibold">
                              VERIFIED IDENTITY PHOTO
                            </div>
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Badge className="bg-white/90 text-slate-900 font-semibold text-xs flex gap-1 items-center">
                                <ZoomIn className="h-3.5 w-3.5" /> Fullscreen View
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <CameraFeedPlaceholder
                            eventType="IDENTITY_VERIFICATION"
                            isEvidence={false}
                            imageUrl=""
                          />
                        )}
                        <div className="flex justify-between items-center text-xs font-mono bg-muted/30 p-2.5 rounded-lg border border-border/40">
                          <span className="text-muted-foreground font-semibold">Captured At:</span>
                          <span className="font-bold text-foreground">
                            {candidateDetails.candidatePhoto?.capturedAt || candidateDetails.startedAt || "Identity Verification Stage"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )
          )}
        </SheetContent>
      </Sheet>

      {/* 5. Fullscreen Image Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl w-[95vw] bg-slate-950 border border-slate-800 text-white p-4">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-rose-500" />
                {lightboxImage?.title}
              </DialogTitle>
              {lightboxImage?.capturedAt && (
                <span className="text-xs font-mono text-slate-400 block mt-0.5">
                  Captured: {lightboxImage.capturedAt}
                </span>
              )}
            </div>
          </DialogHeader>

          <div className="relative w-full h-[70vh] max-h-[650px] bg-black rounded-lg overflow-hidden flex items-center justify-center my-2">
            {lightboxImage?.url && (
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-xs">
            <span className="font-mono text-slate-400 text-[11px]">
              {lightboxImage?.eventType ? `Type: ${lightboxImage.eventType}` : "Proctor Telemetry Image"}
            </span>
            {lightboxImage?.url && (
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                download="proctoring-frame.jpg"
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded flex items-center gap-1.5 text-xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download High-Res
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Photo Upload & Supabase Diagnostics Modal */}
      {showTestUploadModal && (
        <TestPhotoUploadModal
          isOpen={showTestUploadModal}
          onClose={() => setShowTestUploadModal(false)}
          sessionId={selectedCandidate?.sessionId || candidates[0]?.sessionId || candidates[0]?.id || "375840ee-0c05-4ba5-8db9-1299021c7508"}
        />
      )}

      {/* ExtendTimeModal */}
      <ExtendTimeModal
        isOpen={isExtendTimeModalOpen}
        session={selectedCandidateForExtension}
        onClose={() => {
          setIsExtendTimeModalOpen(false);
          setSelectedCandidateForExtension(null);
        }}
        onSuccess={handleExtendTimeSuccess}
      />
    </div>
  );
}
