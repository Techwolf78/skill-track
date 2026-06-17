import { useState, useEffect, useCallback } from "react";
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
// Fallback Dummy Data
// ==========================================
const DUMMY_SCHEDULES: AssessmentSchedule[] = [
  {
    id: "sch-1",
    assessmentName: "Java Full Stack Hiring Test",
    scheduledDate: "18 June 2026",
    startTime: "10:00 AM",
    proctoringMode: "HIGH",
  },
  {
    id: "sch-2",
    assessmentName: "Frontend Engineer Assessment",
    scheduledDate: "19 June 2026",
    startTime: "02:00 PM",
    proctoringMode: "MEDIUM",
  },
  {
    id: "sch-3",
    assessmentName: "Python Data Science Quiz",
    scheduledDate: "20 June 2026",
    startTime: "11:30 AM",
    proctoringMode: "LOW",
  },
];

const DUMMY_CANDIDATES: Record<string, ProctoringCandidate[]> = {
  "sch-1": [
    {
      id: "cand-101",
      name: "John Doe",
      email: "john.doe@example.com",
      testStatus: "IN_PROGRESS",
      proctoringMode: "HIGH",
      riskLevel: "HIGH",
      violationsCount: 4,
      criticalViolationsCount: 1,
      lastActivity: "10:15 AM",
      reviewStatus: "NEEDS_MANUAL_REVIEW",
    },
    {
      id: "cand-102",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      testStatus: "SUBMITTED",
      proctoringMode: "HIGH",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "10:45 AM",
      reviewStatus: "CLEAN",
    },
    {
      id: "cand-103",
      name: "Alice Johnson",
      email: "alice.j@example.com",
      testStatus: "TERMINATED",
      proctoringMode: "HIGH",
      riskLevel: "CRITICAL",
      violationsCount: 7,
      criticalViolationsCount: 3,
      lastActivity: "10:20 AM",
      reviewStatus: "DISQUALIFIED",
    },
    {
      id: "cand-104",
      name: "Bob Brown",
      email: "bob.brown@example.com",
      testStatus: "NOT_STARTED",
      proctoringMode: "HIGH",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "N/A",
      reviewStatus: "NOT_REVIEWED",
    },
    {
      id: "cand-105",
      name: "Charlie Green",
      email: "charlie@example.com",
      testStatus: "AUTO_SUBMITTED",
      proctoringMode: "HIGH",
      riskLevel: "MEDIUM",
      violationsCount: 2,
      criticalViolationsCount: 0,
      lastActivity: "10:30 AM",
      reviewStatus: "WARNING_ISSUED",
    },
  ],
  "sch-2": [
    {
      id: "cand-201",
      name: "Daniel White",
      email: "daniel.w@example.com",
      testStatus: "IN_PROGRESS",
      proctoringMode: "MEDIUM",
      riskLevel: "LOW",
      violationsCount: 1,
      criticalViolationsCount: 0,
      lastActivity: "02:10 PM",
      reviewStatus: "NOT_REVIEWED",
    },
    {
      id: "cand-202",
      name: "Eva Black",
      email: "eva.b@example.com",
      testStatus: "SUBMITTED",
      proctoringMode: "MEDIUM",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "02:45 PM",
      reviewStatus: "CLEAN",
    },
    {
      id: "cand-203",
      name: "Frank Miller",
      email: "frank.m@example.com",
      testStatus: "TERMINATED",
      proctoringMode: "MEDIUM",
      riskLevel: "HIGH",
      violationsCount: 5,
      criticalViolationsCount: 2,
      lastActivity: "02:22 PM",
      reviewStatus: "DISQUALIFIED",
    },
  ],
  "sch-3": [
    {
      id: "cand-301",
      name: "Grace Hopper",
      email: "grace@example.com",
      testStatus: "SUBMITTED",
      proctoringMode: "LOW",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "11:55 AM",
      reviewStatus: "CLEAN",
    },
    {
      id: "cand-302",
      name: "Henry Cavill",
      email: "henry@example.com",
      testStatus: "SUBMITTED",
      proctoringMode: "LOW",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "12:15 PM",
      reviewStatus: "CLEAN",
    },
    {
      id: "cand-303",
      name: "Ivy League",
      email: "ivy@example.com",
      testStatus: "SUBMITTED",
      proctoringMode: "LOW",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "12:05 PM",
      reviewStatus: "CLEAN",
    },
    {
      id: "cand-304",
      name: "Jack Sparrow",
      email: "jack@example.com",
      testStatus: "NOT_STARTED",
      proctoringMode: "LOW",
      riskLevel: "NONE",
      violationsCount: 0,
      criticalViolationsCount: 0,
      lastActivity: "N/A",
      reviewStatus: "NOT_REVIEWED",
    },
  ],
};

const DUMMY_CANDIDATE_DETAILS: Record<string, CandidateProctoringDetail> = {
  "cand-101": {
    id: "cand-101",
    name: "John Doe",
    email: "john.doe@example.com",
    testStatus: "IN_PROGRESS",
    riskScore: 78,
    riskLevel: "HIGH",
    violationsCount: 4,
    criticalViolationsCount: 1,
    startedAt: "10:00 AM",
    submittedAt: null,
    systemInfo: {
      browser: "Chrome 125.0.0",
      os: "macOS Sonoma",
      ipAddress: "192.168.1.45",
      device: "Desktop (MacBook Pro)",
      screenResolution: "3024 x 1964",
    },
    reviewStatus: "NEEDS_MANUAL_REVIEW",
    violations: [
      {
        id: "viol-1",
        time: "10:03 AM",
        eventType: "TAB_SWITCH",
        severity: "MEDIUM",
        description: "Candidate switched browser tab/window",
        evidenceAvailable: false,
      },
      {
        id: "viol-2",
        time: "10:08 AM",
        eventType: "MULTIPLE_FACES",
        severity: "HIGH",
        description: "Additional face detected in camera frame",
        evidenceAvailable: true,
      },
      {
        id: "viol-3",
        time: "10:12 AM",
        eventType: "LOOKING_AWAY",
        severity: "LOW",
        description: "Candidate looking away from screen persistently",
        evidenceAvailable: false,
      },
      {
        id: "viol-4",
        time: "10:15 AM",
        eventType: "UNAUTHORIZED_OBJECT",
        severity: "CRITICAL",
        description: "Mobile phone detected in frame",
        evidenceAvailable: true,
      },
    ],
    evidences: [
      {
        id: "ev-1",
        eventType: "MULTIPLE_FACES",
        capturedAt: "10:08 AM",
        severity: "HIGH",
        description: "Webcam screenshot showing a second face in the background.",
      },
      {
        id: "ev-2",
        eventType: "UNAUTHORIZED_OBJECT",
        capturedAt: "10:15 AM",
        severity: "CRITICAL",
        description: "Webcam screenshot showing mobile phone usage.",
      },
    ],
    snapshots: [
      { id: "snap-1", imageUrl: "", capturedAt: "10:02 AM" },
      { id: "snap-2", imageUrl: "", capturedAt: "10:05 AM" },
      { id: "snap-3", imageUrl: "", capturedAt: "10:08 AM" },
      { id: "snap-4", imageUrl: "", capturedAt: "10:12 AM" },
      { id: "snap-5", imageUrl: "", capturedAt: "10:15 AM" },
    ],
  },
  "cand-103": {
    id: "cand-103",
    name: "Alice Johnson",
    email: "alice.j@example.com",
    testStatus: "TERMINATED",
    riskScore: 96,
    riskLevel: "CRITICAL",
    violationsCount: 7,
    criticalViolationsCount: 3,
    startedAt: "10:00 AM",
    submittedAt: "10:20 AM",
    systemInfo: {
      browser: "Edge 124.0.0",
      os: "Windows 11",
      ipAddress: "103.45.210.12",
      device: "Desktop PC",
      screenResolution: "1920 x 1080",
    },
    reviewStatus: "DISQUALIFIED",
    violations: [
      {
        id: "viol-11",
        time: "10:01 AM",
        eventType: "FULLSCREEN_EXIT",
        severity: "MEDIUM",
        description: "Candidate exited full screen mode",
        evidenceAvailable: false,
      },
      {
        id: "viol-12",
        time: "10:04 AM",
        eventType: "TAB_SWITCH",
        severity: "MEDIUM",
        description: "Candidate switched browser tab",
        evidenceAvailable: false,
      },
      {
        id: "viol-13",
        time: "10:06 AM",
        eventType: "FACE_MISSING",
        severity: "CRITICAL",
        description: "No face detected in webcam frame for 15+ seconds",
        evidenceAvailable: true,
      },
      {
        id: "viol-14",
        time: "10:10 AM",
        eventType: "SPEECH_DETECTED",
        severity: "HIGH",
        description: "Continuous human speech audio detected",
        evidenceAvailable: false,
      },
      {
        id: "viol-15",
        time: "10:14 AM",
        eventType: "UNAUTHORIZED_OBJECT",
        severity: "CRITICAL",
        description: "Secondary screen / tablet detected in frame",
        evidenceAvailable: true,
      },
      {
        id: "viol-16",
        time: "10:18 AM",
        eventType: "TAB_SWITCH",
        severity: "CRITICAL",
        description: "Multiple tab switches; threshold exceeded",
        evidenceAvailable: false,
      },
      {
        id: "viol-17",
        time: "10:20 AM",
        eventType: "TEST_TERMINATED",
        severity: "CRITICAL",
        description: "Test auto-terminated due to maximum violation limit",
        evidenceAvailable: false,
      },
    ],
    evidences: [
      {
        id: "ev-11",
        eventType: "FACE_MISSING",
        capturedAt: "10:06 AM",
        severity: "CRITICAL",
        description: "Webcam screenshot showing empty desk/chair.",
      },
      {
        id: "ev-12",
        eventType: "UNAUTHORIZED_OBJECT",
        capturedAt: "10:14 AM",
        severity: "CRITICAL",
        description: "Webcam screenshot showing tablet device on desk.",
      },
    ],
    snapshots: [
      { id: "snap-11", imageUrl: "", capturedAt: "10:02 AM" },
      { id: "snap-12", imageUrl: "", capturedAt: "10:06 AM" },
      { id: "snap-13", imageUrl: "", capturedAt: "10:10 AM" },
      { id: "snap-14", imageUrl: "", capturedAt: "10:14 AM" },
      { id: "snap-15", imageUrl: "", capturedAt: "10:18 AM" },
    ],
  },
};

const generateDummyDetails = (
  candidate: ProctoringCandidate,
): CandidateProctoringDetail => {
  const hasViolations = candidate.violationsCount > 0;
  const violations: ProctoringViolation[] = [];
  const evidences: EvidenceItem[] = [];
  const snapshots: SnapshotItem[] = [];

  if (hasViolations) {
    for (let i = 0; i < candidate.violationsCount; i++) {
      const isCritical = i < candidate.criticalViolationsCount;
      const severity = isCritical
        ? "CRITICAL"
        : i % 2 === 0
          ? "HIGH"
          : "MEDIUM";
      const eventType = isCritical
        ? "UNAUTHORIZED_OBJECT"
        : i % 2 === 0
          ? "TAB_SWITCH"
          : "LOOKING_AWAY";
      const description =
        eventType === "UNAUTHORIZED_OBJECT"
          ? "Mobile device detected in candidate camera view"
          : eventType === "TAB_SWITCH"
            ? "Candidate switched to an external window"
            : "Gaze deviation detected";

      violations.push({
        id: `gen-viol-${candidate.id}-${i}`,
        time: `10:${10 + i * 5} AM`,
        eventType,
        severity: severity as ProctoringEventSeverity,
        description,
        evidenceAvailable: isCritical || i % 2 === 0,
      });

      if (isCritical || i % 2 === 0) {
        evidences.push({
          id: `gen-ev-${candidate.id}-${i}`,
          eventType,
          capturedAt: `10:${10 + i * 5} AM`,
          severity: severity as ProctoringEventSeverity,
          description: `Captured screenshot of violation: ${description}`,
        });
      }
    }
  }

  // Generate snapshots
  const snapCount = Math.max(3, candidate.violationsCount + 1);
  for (let i = 0; i < snapCount; i++) {
    snapshots.push({
      id: `gen-snap-${candidate.id}-${i}`,
      imageUrl: "",
      capturedAt: `10:${5 + i * 8} AM`,
    });
  }

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    testStatus: candidate.testStatus,
    riskScore:
      candidate.riskLevel === "CRITICAL"
        ? 95
        : candidate.riskLevel === "HIGH"
          ? 75
          : candidate.riskLevel === "MEDIUM"
            ? 45
            : candidate.riskLevel === "LOW"
              ? 20
              : 5,
    riskLevel: candidate.riskLevel,
    violationsCount: candidate.violationsCount,
    criticalViolationsCount: candidate.criticalViolationsCount,
    startedAt: "10:00 AM",
    submittedAt:
      candidate.testStatus === "SUBMITTED" ||
      candidate.testStatus === "AUTO_SUBMITTED" ||
      candidate.testStatus === "TERMINATED"
        ? "10:50 AM"
        : null,
    systemInfo: {
      browser: "Chrome 125.0.0",
      os: "Windows 11",
      ipAddress: "192.168.1.18",
      device: "Laptop (Asus Zenbook)",
      screenResolution: "2880 x 1800",
    },
    reviewStatus: candidate.reviewStatus,
    violations,
    evidences,
    snapshots,
  };
};

export default function ProctoringDashboard() {
  const { toast } = useToast();

  // Core State
  const [schedules, setSchedules] = useState<AssessmentSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [candidates, setCandidates] = useState<ProctoringCandidate[]>([]);

  // Loading and Error States
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMockActive, setIsMockActive] = useState(false);

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
    setErrorMsg(null);
    try {
      const response = await apiClient.get(
        "/admin/proctoring/assessment-schedules",
      );
      const data = response.data?.data || response.data;
      if (Array.isArray(data) && data.length > 0) {
        setSchedules(data);
        setIsMockActive(false);
        // Auto-select the first schedule
        setSelectedScheduleId(data[0].id);
      } else {
        throw new Error("No assessment schedules found");
      }
    } catch (err) {
      console.warn(
        "Failed to load schedules from API, falling back to dummy schedules:",
        err,
      );
      setSchedules(DUMMY_SCHEDULES);
      setIsMockActive(true);
      if (DUMMY_SCHEDULES.length > 0) {
        setSelectedScheduleId(DUMMY_SCHEDULES[0].id);
      }
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch Candidates for Selected Schedule API
  const loadCandidates = useCallback(async (scheduleId: string) => {
    if (!scheduleId) return;
    setLoadingCandidates(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.get(
        `/admin/proctoring/assessment-schedules/${scheduleId}/candidates`,
      );
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        setCandidates(data);
      } else {
        throw new Error("No candidates list returned");
      }
    } catch (err) {
      console.warn(
        `Failed to load candidates for schedule ${scheduleId} from API, falling back to dummy candidates:`,
        err,
      );
      setCandidates(DUMMY_CANDIDATES[scheduleId] || []);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  // Fetch Candidate Detailed Info API
  const loadCandidateDetails = async (candidate: ProctoringCandidate) => {
    setSelectedCandidate(candidate);
    setIsDrawerOpen(true);
    setLoadingDetails(true);
    try {
      const response = await apiClient.get(
        `/admin/proctoring/candidates/${candidate.id}/details`,
      );
      const data = response.data?.data || response.data;
      if (data && typeof data === "object") {
        setCandidateDetails(data);
      } else {
        throw new Error("Invalid candidate details data");
      }
    } catch (err) {
      console.warn(
        `Failed to load candidate details for ${candidate.id} from API, falling back to dummy details:`,
        err,
      );
      const fallback =
        DUMMY_CANDIDATE_DETAILS[candidate.id] ||
        generateDummyDetails(candidate);
      setCandidateDetails(fallback);
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
  }: {
    eventType: string;
    isEvidence: boolean;
  }) => {
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
      {/* Top Banner Notice for Mock mode */}
      {isMockActive && (
        <div className="flex items-center justify-between gap-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs md:text-sm shadow-sm transition-all duration-300">
          <div className="flex items-center gap-2">
            <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
            <span>
              <strong>Demo Environment Active:</strong> Backend proctoring API is
              offline/unreachable. Displaying simulated data.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedules}
            className="h-8 border-amber-500/20 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex gap-1 items-center shrink-0"
          >
            <RefreshCw className="h-3 w-3" /> Retry API
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
      {loadingSchedules || loadingCandidates ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-rose-500" />
          <p className="text-muted-foreground text-sm font-medium">
            Fetching proctoring metrics and candidate telemetry...
          </p>
        </div>
      ) : !selectedScheduleId ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-card/10 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base font-semibold text-muted-foreground">
            Select an assessment schedule to view proctoring activity.
          </p>
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
                            <CameraFeedPlaceholder eventType={ev.eventType} isEvidence={true} />
                            
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
                            <CameraFeedPlaceholder eventType="AUDIT_SNAP" isEvidence={false} />
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
