import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CustomFieldsSection,
  CustomFieldItem,
} from "@/components/candidates/CustomFieldsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  Plus,
  FileQuestion,
  Clock,
  Target,
  AlertCircle,
  X,
  Send,
  CheckCircle2,
  XCircle,
  Link2,
  Check,
  Search,
  Calendar,
  Download,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Eye,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  testService,
  Test,
  CreateTestRequest,
  TestQuestion,
  Question,
  ProctoringMode,
  TestScheduleExtended,
} from "@/lib/test-service";
import { candidateService, Candidate, CandidateInvitation } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { InvitedCandidatesTable } from "@/components/invite/InvitedCandidatesTable";
import { AddCandidatesModal } from "@/components/invite/AddCandidatesModal";
import { BulkInviteModal } from "@/components/invite/BulkInviteModal";
import { TestCandidatePreviewModal } from "@/components/admin/TestCandidatePreviewModal";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// jspdf-autotable attaches lastAutoTable at runtime; augment jsPDF here
type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  MaterialDatePickerDialog,
  MaterialTimePickerDialog,
} from "@/components/ui/material-pickers";

// Report data shapes
interface ReportCandidate {
  candidateId: string;
  candidateName: string;
  email: string;
  testStatus?: string;
  violationCount?: number;
  scheduleId?: string;
  riskLevel?: string;
  [key: string]: unknown;
}

interface CandidateResult {
  totalScore?: number;
  maxScore?: number;
  passed?: boolean;
  id?: string;
  [key: string]: unknown;
}

interface CandidateResultEntry {
  sessionId?: string;
  detail?: ReportCandidateDetails;
  scheduleId?: string;
  result?: CandidateResult | null;
}

interface ReportCandidateDetails {
  riskLevel?: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  fullscreenViolations?: number;
  violations?: ReportViolation[];
  evidence?: ReportEvidence[];
  sessionInfo?: Record<string, unknown>;
  systemInfo?: {
    sessionId?: string;
    ipAddress?: string;
    browser?: string;
    os?: string;
    fullscreenViolations?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ReportViolation {
  id?: string;
  eventType?: string;
  severity?: string;
  occurredAt?: string;
  time?: string;
  metadata?: { description?: string };
  description?: string;
  createdAt?: string;
  [key: string]: unknown;
}

interface ReportEvidence {
  id?: string;
  imageData?: string;
  imageUrl?: string;
  snapshotType?: string;
  capturedAt: string;
}

interface EnrichedTestQuestion extends TestQuestion {
  question?: Question & {
    type?: string;
    avgTimeSeconds?: number;
    avg_time_seconds?: number;
    options?: unknown[];
  };
}

const getProctoringPreset = (mode: ProctoringMode) => {
  const defaults = {
    enableTabSwitchTracking: false,
    blockCopyPaste: false,
    blockRightClick: false,
    warnOnFullscreenExit: false,
    maxWarnings: 0,
    requireWebcam: false,
    detectFaceNotVisible: false,
    detectMultipleFaces: false,
    detectSuspiciousAudio: false,
    detectObjects: false,
    periodicSnapshots: false,
    evidenceCapture: false,
    requireMicrophone: false,
    requireScreenShare: false,
    detectDevTools: false,
    detectScreenShareStop: false,
    enableLiveProctoring: false,
    autoSubmitOnCriticalViolations: false,
    maxCriticalViolations: 0,
  };

  if (mode === "LOW") {
    return {
      ...defaults,
      enableTabSwitchTracking: true,
      blockCopyPaste: true,
      blockRightClick: true,
      warnOnFullscreenExit: true,
      maxWarnings: 5,
    };
  }
  if (mode === "MEDIUM") {
    return {
      ...defaults,
      enableTabSwitchTracking: true,
      blockCopyPaste: true,
      blockRightClick: true,
      warnOnFullscreenExit: true,
      maxWarnings: 3,
      requireWebcam: true,
      detectFaceNotVisible: true,
      detectMultipleFaces: true,
      detectSuspiciousAudio: true,
      detectObjects: true,
      periodicSnapshots: true,
      evidenceCapture: true,
    };
  }
  if (mode === "HIGH") {
    return {
      ...defaults,
      enableTabSwitchTracking: true,
      blockCopyPaste: true,
      blockRightClick: true,
      warnOnFullscreenExit: true,
      maxWarnings: 3,
      requireWebcam: true,
      detectFaceNotVisible: true,
      detectMultipleFaces: true,
      detectSuspiciousAudio: true,
      detectObjects: true,
      periodicSnapshots: true,
      evidenceCapture: true,
      requireMicrophone: true,
      requireScreenShare: true,
      detectDevTools: true,
      detectScreenShareStop: true,
      enableLiveProctoring: true,
      autoSubmitOnCriticalViolations: true,
      maxCriticalViolations: 1,
    };
  }
  return defaults;
};

const DEFAULT_TEST_INSTRUCTIONS = `1. This is an online test.
2. Please make sure that you are using the latest version of the browser. We recommend using Google Chrome.
3. It's mandatory to disable all the browser extensions and enabled Add-ons or open the assessment in incognito mode.
4. If you are solving a coding problem, you will either be required to choose a programming language from the options that have been enabled by the administrator or choose your preferred programming language in case no options have been enabled by the administrator. Note: In case you're solving coding problems: All inputs are from STDIN and output to STDOUT.
5. If test mandates you to use the webcam, please provide the required permissions and access.
6. To know the results, please contact the administrator.
7. To refer to the FAQ document, you can click on the HELP button which is present in the top right corner of the test environment.

Best wishes for your assessment!`;

export default function AdminTestsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const userExtra = user as {
    organisationId?: string;
    organisationName?: string;
  } | null;
  const orgId = user?.organisationData?.id || userExtra?.organisationId;
  const adminOrgName =
    user?.organisationData?.name ||
    userExtra?.organisationName ||
    "Your Organisation";

  const formatDuration = (secs: unknown) => {
    const s = Number(secs);
    if (isNaN(s) || s <= 0) return "N/A";
    if (s % 60 === 0) {
      const mins = s / 60;
      return `${mins} min${mins > 1 ? "s" : ""}`;
    }
    const mins = Math.floor(s / 60);
    const remainingSecs = s % 60;
    if (mins === 0) return `${remainingSecs} sec`;
    return `${mins} min ${remainingSecs} sec`;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteQuestionDialogOpen, setDeleteQuestionDialogOpen] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [questionsData, setQuestionsData] = useState<EnrichedTestQuestion[]>(
    [],
  );
  const [selectedQuestion, setSelectedQuestion] =
    useState<EnrichedTestQuestion | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || location.state?.activeTab || "details";
  const isPreviewOpen = searchParams.get("preview") === "true";

  const setIsPreviewOpen = useCallback(
    (open: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (open) {
            next.set("preview", "true");
          } else {
            next.delete("preview");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const changeTab = useCallback(
    (newTab: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", newTab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Invitation & schedule states
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [selectedScheduleData, setSelectedScheduleData] =
    useState<TestScheduleExtended | null>(null);
  const [isAddCandidatesOpen, setIsAddCandidatesOpen] = useState(false);
  const [isBulkInviteOpen, setIsBulkInviteOpen] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");

  const alreadyInvitedCandidateIds = useMemo(() => {
    return new Set(invitations.map((i) => i.candidateId));
  }, [invitations]);
  const [formData, setFormData] = useState<Partial<CreateTestRequest>>({
    title: "",
    description: "",
    durationMins: 60,
    difficulty: "MEDIUM",
    passMark: 40,
    status: "PUBLISHED",
    instructions: {},
    proctoringMode: "NONE",
    enableTabSwitchTracking: false,
    blockCopyPaste: false,
    blockRightClick: false,
    warnOnFullscreenExit: false,
    maxWarnings: 0,
    requireWebcam: false,
    detectFaceNotVisible: false,
    detectMultipleFaces: false,
    detectSuspiciousAudio: false,
    detectObjects: false,
    periodicSnapshots: false,
    evidenceCapture: false,
    requireMicrophone: false,
    requireScreenShare: false,
    detectDevTools: false,
    detectScreenShareStop: false,
    enableLiveProctoring: false,
    autoSubmitOnCriticalViolations: false,
    maxCriticalViolations: 0,
  });
  const [initialFormData, setInitialFormData] =
    useState<Partial<CreateTestRequest> | null>(null);

  // Form state
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] =
    useState(false);
  const [unsavedScheduleDialogOpen, setUnsavedScheduleDialogOpen] =
    useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Picker States
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  // Reports States
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportScheduleId, setReportScheduleId] = useState<string>("all");
  const [reportCandidates, setReportCandidates] = useState<ReportCandidate[]>(
    [],
  );
  const [reportSchedules, setReportSchedules] = useState<
    TestScheduleExtended[]
  >([]);
  const [candidateResults, setCandidateResults] = useState<
    Record<string, CandidateResultEntry>
  >({});
  const [selectedReportCandidate, setSelectedReportCandidate] =
    useState<ReportCandidate | null>(null);
  const [reportCandidateDetails, setReportCandidateDetails] =
    useState<ReportCandidateDetails | null>(null);
  const [loadingAdvancedDetails, setLoadingAdvancedDetails] = useState(false);
  const [candidatePaperSubmissions, setCandidatePaperSubmissions] = useState<
    Record<string, unknown>[]
  >([]);
  const [isAdvancedReportOpen, setIsAdvancedReportOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const displayedCandidates = useMemo(() => {
    // Only show candidates who actually appeared (status is not NOT_STARTED)
    const appeared = reportCandidates.filter(
      (c) => c.testStatus && c.testStatus !== "NOT_STARTED",
    );

    if (!reportScheduleId || reportScheduleId === "all") {
      return appeared;
    }
    return appeared.filter((c) => c.scheduleId === reportScheduleId);
  }, [reportCandidates, reportScheduleId]);

  const getReportCandidateKey = (
    candidate: Pick<ReportCandidate, "candidateId" | "scheduleId">,
  ) => `${candidate.scheduleId || "no-schedule"}:${candidate.candidateId}`;

  const totalTestMarks = useMemo(() => {
    const mappedQuestions =
      questionsData.length > 0
        ? questionsData
        : test?.testQuestions || test?.questions || [];

    return mappedQuestions.reduce(
      (sum, question) => sum + (Number(question.marks) || 0),
      0,
    );
  }, [questionsData, test]);

  const isScheduleDirty = useMemo(() => {
    if (!test) return false;

    const getLocalISOTime = (isoString?: string) => {
      if (!isoString) return "";
      return isoString.slice(0, 16);
    };

    const testSchedules = test.testSchedules || [];
    const activeOrFirst =
      testSchedules.find(
        (s) => s.status === "SCHEDULED" || s.status === "LIVE",
      ) || testSchedules[0];
    const originalStart = getLocalISOTime(activeOrFirst?.startTime);
    const originalEnd = getLocalISOTime(activeOrFirst?.endTime);

    // Fall back to selectedScheduleData if available
    const currentOrigStart = selectedScheduleData?.startTime
      ? getLocalISOTime(selectedScheduleData.startTime)
      : originalStart;
    const currentOrigEnd = selectedScheduleData?.endTime
      ? getLocalISOTime(selectedScheduleData.endTime)
      : originalEnd;

    return (
      scheduleStartTime !== currentOrigStart ||
      scheduleEndTime !== currentOrigEnd
    );
  }, [test, selectedScheduleData, scheduleStartTime, scheduleEndTime]);

  const isFormDirty = useMemo(() => {
    if (!test || !initialFormData) return false;
    if (formData.title !== initialFormData.title) return true;
    if ((formData.description || "") !== (initialFormData.description || ""))
      return true;
    if (formData.durationMins !== initialFormData.durationMins) return true;
    if (formData.difficulty !== initialFormData.difficulty) return true;
    if (formData.passMark !== initialFormData.passMark) return true;
    if (formData.status !== initialFormData.status) return true;
    if (
      (formData.proctoringMode || "NONE") !==
      (initialFormData.proctoringMode || "NONE")
    )
      return true;

    // Check instructions general text
    const currentGeneral =
      (formData.instructions as Record<string, unknown> | undefined)?.general ||
      "";
    const originalGeneral =
      (initialFormData.instructions as Record<string, unknown> | undefined)
        ?.general || "";
    if (currentGeneral !== originalGeneral) return true;

    // Check schedule times
    if (isScheduleDirty) return true;

    // Proctoring settings
    if (
      (formData.enableTabSwitchTracking || false) !==
      (initialFormData.enableTabSwitchTracking || false)
    )
      return true;
    if (
      (formData.blockCopyPaste || false) !==
      (initialFormData.blockCopyPaste || false)
    )
      return true;
    if (
      (formData.blockRightClick || false) !==
      (initialFormData.blockRightClick || false)
    )
      return true;
    if (
      (formData.warnOnFullscreenExit || false) !==
      (initialFormData.warnOnFullscreenExit || false)
    )
      return true;
    if (
      (formData.maxWarnings || 0) !== (initialFormData.maxWarnings || 0)
    )
      return true;
    if (
      (formData.requireWebcam || false) !==
      (initialFormData.requireWebcam || false)
    )
      return true;
    if (
      (formData.detectFaceNotVisible || false) !==
      (initialFormData.detectFaceNotVisible || false)
    )
      return true;
    if (
      (formData.detectMultipleFaces || false) !==
      (initialFormData.detectMultipleFaces || false)
    )
      return true;
    if (
      (formData.detectSuspiciousAudio || false) !==
      (initialFormData.detectSuspiciousAudio || false)
    )
      return true;
    if (
      (formData.detectObjects || false) !==
      (initialFormData.detectObjects || false)
    )
      return true;
    if (
      (formData.periodicSnapshots || false) !==
      (initialFormData.periodicSnapshots || false)
    )
      return true;
    if (
      (formData.evidenceCapture || false) !==
      (initialFormData.evidenceCapture || false)
    )
      return true;
    if (
      (formData.requireMicrophone || false) !==
      (initialFormData.requireMicrophone || false)
    )
      return true;
    if (
      (formData.requireScreenShare || false) !==
      (initialFormData.requireScreenShare || false)
    )
      return true;
    if (
      (formData.detectDevTools || false) !==
      (initialFormData.detectDevTools || false)
    )
      return true;
    if (
      (formData.detectScreenShareStop || false) !==
      (initialFormData.detectScreenShareStop || false)
    )
      return true;
    if (
      (formData.enableLiveProctoring || false) !==
      (initialFormData.enableLiveProctoring || false)
    )
      return true;
    if (
      (formData.autoSubmitOnCriticalViolations || false) !==
      (initialFormData.autoSubmitOnCriticalViolations || false)
    )
      return true;
    if (
      (formData.maxCriticalViolations || 0) !==
      (initialFormData.maxCriticalViolations || 0)
    )
      return true;

    return false;
  }, [formData, initialFormData, test, isScheduleDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFormDirty]);

  const handleBackClick = () => {
    if (isFormDirty) {
      setUnsavedChangesDialogOpen(true);
    } else {
      navigate("/admin/tests");
    }
  };

  const fetchTest = useCallback(async () => {
    try {
      setLoading(true);
      const data = await testService.getTestById(id!);
      setTest(data);

      // Fetch test questions directly from the mapping table to avoid cached stale relationship on the test object
      try {
        const testQuestions = await testService.getTestQuestions(id!);

        if (testQuestions && testQuestions.length > 0) {
          const allQuestions = await testService.getAllQuestions();
          const enrichedQuestions = testQuestions.map((tq) => ({
            ...tq,
            question: allQuestions.find((q) => q.id === tq.questionId),
          }));
          setQuestionsData(enrichedQuestions);
        } else {
          setQuestionsData([]);
        }
      } catch (err) {
        console.error("Failed to fetch detailed questions:", err);
        setQuestionsData([]);
      }

      // Populate schedule state with active or first schedule
      const testSchedules = data.testSchedules || [];
      const activeOrFirst =
        testSchedules.find(
          (s) => s.status === "SCHEDULED" || s.status === "LIVE",
        ) || testSchedules[0];

      if (activeOrFirst) {
        setSelectedScheduleData(activeOrFirst);
        if (activeOrFirst.startTime) {
          setScheduleStartTime(activeOrFirst.startTime.slice(0, 16));
        }
        if (activeOrFirst.endTime) {
          setScheduleEndTime(activeOrFirst.endTime.slice(0, 16));
        }
      }

      // Populate form with test data
      const initialForm: Partial<CreateTestRequest> = {
        title: data.title,
        description: data.description || "",
        durationMins: data.durationMins,
        difficulty: data.difficulty,
        passMark: data.passMark,
        status: data.status,
        instructions: (() => {
          const general = ((data.instructions?.general as string) || "").trim();
          const oldDefaultTrimmed = `This is an online test.
Please make sure that you are using the latest version of the browser. We recommend using Google Chrome.
It's mandatory to disable all the browser extensions and enabled Add-ons or open the assessment in incognito mode.
If you are solving a coding problem, you will either be required to choose a programming language from the options that have been enabled by the administrator or choose your preferred programming language in case no options have been enabled by the administrator. Note: In case you're solving coding problems: All inputs are from STDIN and output to STDOUT.
 If test mandates you to use the webcam, please provide the required permissions and access.
To know the results, please contact the administrator.
To refer to the FAQ document, you can click on the HELP button which is present in the top right corner of the test environment.`.trim();

          if (!general || general === oldDefaultTrimmed) {
            return { general: DEFAULT_TEST_INSTRUCTIONS };
          }
          return data.instructions;
        })(),
        proctoringMode: data.proctoringMode || "NONE",
        enableTabSwitchTracking:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.enableTabSwitchTracking || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .enableTabSwitchTracking,
        blockCopyPaste:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.blockCopyPaste || false
            : getProctoringPreset(data.proctoringMode || "NONE").blockCopyPaste,
        blockRightClick:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.blockRightClick || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .blockRightClick,
        warnOnFullscreenExit:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.warnOnFullscreenExit || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .warnOnFullscreenExit,
        maxWarnings:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.maxWarnings || 0
            : getProctoringPreset(data.proctoringMode || "NONE").maxWarnings,
        requireWebcam:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.requireWebcam || false
            : getProctoringPreset(data.proctoringMode || "NONE").requireWebcam,
        detectFaceNotVisible:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.detectFaceNotVisible || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .detectFaceNotVisible,
        detectMultipleFaces:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.detectMultipleFaces || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .detectMultipleFaces,
        detectSuspiciousAudio:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.detectSuspiciousAudio || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .detectSuspiciousAudio,
        detectObjects:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.detectObjects || false
            : getProctoringPreset(data.proctoringMode || "NONE").detectObjects,
        periodicSnapshots:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.periodicSnapshots || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .periodicSnapshots,
        evidenceCapture:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.evidenceCapture || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .evidenceCapture,
        requireMicrophone:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.requireMicrophone || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .requireMicrophone,
        requireScreenShare:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.requireScreenShare || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .requireScreenShare,
        detectDevTools:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.detectDevTools || false
            : getProctoringPreset(data.proctoringMode || "NONE").detectDevTools,
        detectScreenShareStop:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.detectScreenShareStop || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .detectScreenShareStop,
        enableLiveProctoring:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.enableLiveProctoring || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .enableLiveProctoring,
        autoSubmitOnCriticalViolations:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.autoSubmitOnCriticalViolations || false
            : getProctoringPreset(data.proctoringMode || "NONE")
                .autoSubmitOnCriticalViolations,
        maxCriticalViolations:
          (data.proctoringMode || "NONE") === "CUSTOM"
            ? data.maxCriticalViolations || 0
            : getProctoringPreset(data.proctoringMode || "NONE")
                .maxCriticalViolations,
      };

      setFormData(initialForm);
      setInitialFormData(initialForm);
    } catch (error: unknown) {
      console.error("Failed to fetch test:", error);
      navigate("/admin/tests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      fetchTest();
    } else {
      navigate("/admin/tests");
    }
  }, [id, fetchTest, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (name: string, value: string) => {
    const numValue = parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "durationMins" || name === "passMark"
          ? parseInt(value, 10)
          : value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleProctoringModeChange = (value: string) => {
    const mode = value as ProctoringMode;
    const presets = getProctoringPreset(mode);
    setFormData((prev) => ({
      ...prev,
      proctoringMode: mode,
      ...presets,
    }));
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      console.error("Validation Error: Test title is required.");
      return;
    }

    if (formData.durationMins && formData.durationMins <= 0) {
      console.error(
        "Validation Error: Duration must be greater than 0 minutes.",
      );
      return;
    }

    if (
      formData.passMark &&
      (formData.passMark < 0 || formData.passMark > 100)
    ) {
      console.error(
        "Validation Error: Passing mark must be between 0 and 100.",
      );
      return;
    }

    if (scheduleStartTime && scheduleEndTime) {
      const startDate = new Date(scheduleStartTime);
      const endDate = new Date(scheduleEndTime);
      if (endDate <= startDate) {
        console.error(
          "Validation Error: Schedule end time must be after start time.",
        );
        return;
      }
    }

    try {
      setSaving(true);
      await testService.updateTest(id!, {
        title: formData.title,
        description: formData.description,
        durationMins: formData.durationMins,
        difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
        passMark: formData.passMark,
        status: "PUBLISHED",
        instructions: formData.instructions,
        proctoringMode: formData.proctoringMode || "NONE",
        enableTabSwitchTracking: formData.enableTabSwitchTracking || false,
        blockCopyPaste: formData.blockCopyPaste || false,
        blockRightClick: formData.blockRightClick || false,
        warnOnFullscreenExit: formData.warnOnFullscreenExit || false,
        maxWarnings: formData.maxWarnings || 0,
        requireWebcam: formData.requireWebcam || false,
        detectFaceNotVisible: formData.detectFaceNotVisible || false,
        detectMultipleFaces: formData.detectMultipleFaces || false,
        detectSuspiciousAudio: formData.detectSuspiciousAudio || false,
        detectObjects: formData.detectObjects || false,
        periodicSnapshots: formData.periodicSnapshots || false,
        evidenceCapture: formData.evidenceCapture || false,
        requireMicrophone: formData.requireMicrophone || false,
        requireScreenShare: formData.requireScreenShare || false,
        detectDevTools: formData.detectDevTools || false,
        detectScreenShareStop: formData.detectScreenShareStop || false,
        enableLiveProctoring: formData.enableLiveProctoring || false,
        autoSubmitOnCriticalViolations:
          formData.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: formData.maxCriticalViolations || 0,
      });

      // Save schedule
      if (scheduleStartTime && scheduleEndTime) {
        const startISO = new Date(scheduleStartTime).toISOString();
        const endISO = new Date(scheduleEndTime).toISOString();
        if (selectedSchedule) {
          // Update existing schedule
          await apiClient.patch(`/test-schedules/${selectedSchedule}`, {
            startTime: startISO,
            endTime: endISO,
          });
        } else {
          // Create new schedule
          await apiClient.post("/test-schedules", {
            testId: id,
            startTime: startISO,
            endTime: endISO,
            maxCandidates: 100,
          });
        }
      }

      toast({
        title: "Success",
        description: "Test has been updated successfully.",
      });
      navigate("/admin/tests");
    } catch (error: unknown) {
      console.error("Failed to update test:", error);
    } finally {
      setSaving(false);
    }
  };

  // Save only basic info fields (title, description, duration, difficulty, passMark, status, instructions) — stays on page
  const handleSaveBasicInfo = async () => {
    if (!formData.title?.trim()) {
      console.error("Validation Error: Test title is required.");
      return;
    }
    if (formData.durationMins && formData.durationMins <= 0) {
      console.error(
        "Validation Error: Duration must be greater than 0 minutes.",
      );
      return;
    }
    if (
      formData.passMark &&
      (formData.passMark < 0 || formData.passMark > 100)
    ) {
      console.error(
        "Validation Error: Passing mark must be between 0 and 100.",
      );
      return;
    }
    try {
      setSaving(true);
      await testService.updateTest(id!, {
        title: formData.title,
        description: formData.description,
        durationMins: formData.durationMins,
        difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
        passMark: formData.passMark,
        status: "PUBLISHED",
        instructions: formData.instructions,
        proctoringMode: formData.proctoringMode || "NONE",
        enableTabSwitchTracking: formData.enableTabSwitchTracking || false,
        blockCopyPaste: formData.blockCopyPaste || false,
        blockRightClick: formData.blockRightClick || false,
        warnOnFullscreenExit: formData.warnOnFullscreenExit || false,
        maxWarnings: formData.maxWarnings || 0,
        requireWebcam: formData.requireWebcam || false,
        detectFaceNotVisible: formData.detectFaceNotVisible || false,
        detectMultipleFaces: formData.detectMultipleFaces || false,
        detectSuspiciousAudio: formData.detectSuspiciousAudio || false,
        detectObjects: formData.detectObjects || false,
        periodicSnapshots: formData.periodicSnapshots || false,
        evidenceCapture: formData.evidenceCapture || false,
        requireMicrophone: formData.requireMicrophone || false,
        requireScreenShare: formData.requireScreenShare || false,
        detectDevTools: formData.detectDevTools || false,
        detectScreenShareStop: formData.detectScreenShareStop || false,
        enableLiveProctoring: formData.enableLiveProctoring || false,
        autoSubmitOnCriticalViolations:
          formData.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: formData.maxCriticalViolations || 0,
      });
      // Sync local test state so dirty-check resets
      setTest((prev) =>
        prev
          ? {
              ...prev,
              title: formData.title!,
              description: formData.description,
              durationMins: formData.durationMins!,
              difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
              passMark: formData.passMark!,
              status: formData.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
              instructions: formData.instructions,
            }
          : prev,
      );
      setInitialFormData({ ...formData });
      toast({
        title: "Saved",
        description: "Basic information saved successfully.",
      });
    } catch (error: unknown) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  // Save only proctoring settings — stays on page
  const handleSaveProctoring = async () => {
    try {
      setSaving(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        durationMins: formData.durationMins,
        difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
        passMark: formData.passMark,
        status: "PUBLISHED" as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        instructions: formData.instructions,
        proctoringMode: formData.proctoringMode || "NONE",
        enableTabSwitchTracking: formData.enableTabSwitchTracking || false,
        blockCopyPaste: formData.blockCopyPaste || false,
        blockRightClick: formData.blockRightClick || false,
        warnOnFullscreenExit: formData.warnOnFullscreenExit || false,
        maxWarnings: formData.maxWarnings || 0,
        requireWebcam: formData.requireWebcam || false,
        detectFaceNotVisible: formData.detectFaceNotVisible || false,
        detectMultipleFaces: formData.detectMultipleFaces || false,
        detectSuspiciousAudio: formData.detectSuspiciousAudio || false,
        detectObjects: formData.detectObjects || false,
        periodicSnapshots: formData.periodicSnapshots || false,
        evidenceCapture: formData.evidenceCapture || false,
        requireMicrophone: formData.requireMicrophone || false,
        requireScreenShare: formData.requireScreenShare || false,
        detectDevTools: formData.detectDevTools || false,
        detectScreenShareStop: formData.detectScreenShareStop || false,
        enableLiveProctoring: formData.enableLiveProctoring || false,
        autoSubmitOnCriticalViolations:
          formData.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: formData.maxCriticalViolations || 0,
      };

      console.log(
        "[Admin/TestsEdit] Saving proctoring settings. Payload:",
        payload,
      );
      const res = await testService.updateTest(id!, payload);
      console.log("[Admin/TestsEdit] Save proctoring response:", res);

      // Sync local test state so dirty-check resets
      setTest((prev) =>
        prev
          ? {
              ...prev,
              proctoringMode: formData.proctoringMode as ProctoringMode,
              enableTabSwitchTracking: formData.enableTabSwitchTracking,
              blockCopyPaste: formData.blockCopyPaste,
              blockRightClick: formData.blockRightClick,
              warnOnFullscreenExit: formData.warnOnFullscreenExit,
              maxWarnings: formData.maxWarnings,
              requireWebcam: formData.requireWebcam,
              detectFaceNotVisible: formData.detectFaceNotVisible,
              detectMultipleFaces: formData.detectMultipleFaces,
              detectSuspiciousAudio: formData.detectSuspiciousAudio,
              detectObjects: formData.detectObjects,
              periodicSnapshots: formData.periodicSnapshots,
              evidenceCapture: formData.evidenceCapture,
              requireMicrophone: formData.requireMicrophone,
              requireScreenShare: formData.requireScreenShare,
              detectDevTools: formData.detectDevTools,
              detectScreenShareStop: formData.detectScreenShareStop,
              enableLiveProctoring: formData.enableLiveProctoring,
              autoSubmitOnCriticalViolations:
                formData.autoSubmitOnCriticalViolations,
              maxCriticalViolations: formData.maxCriticalViolations,
            }
          : prev,
      );
      setInitialFormData({ ...formData });
      toast({
        title: "Saved",
        description: "Proctoring settings saved successfully.",
      });
    } catch (error: unknown) {
      console.error("[Admin/TestsEdit] Failed to save proctoring:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleStartTime || !scheduleEndTime) {
      console.error(
        "Validation Error: Both start time and end time are required.",
      );
      return false;
    }

    const startDate = new Date(scheduleStartTime);
    const endDate = new Date(scheduleEndTime);
    if (endDate <= startDate) {
      console.error(
        "Validation Error: Schedule end time must be after start time.",
      );
      return false;
    }

    try {
      setSavingSchedule(true);
      const startISO = scheduleStartTime;
      const endISO = scheduleEndTime;

      if (selectedSchedule) {
        // Update existing schedule
        await apiClient.patch(`/test-schedules/${selectedSchedule}`, {
          startTime: startISO,
          endTime: endISO,
        });
      } else {
        // Create new schedule
        await apiClient.post("/test-schedules", {
          testId: id,
          startTime: startISO,
          endTime: endISO,
          maxCandidates: 100,
        });
      }

      toast({
        title: "Success",
        description: "Test schedule has been saved successfully.",
      });

      // Update the test state in memory with the new schedule times
      setTest((prev) => {
        if (!prev) return prev;
        const testSchedules = prev.testSchedules || [];
        const activeOrFirst =
          testSchedules.find(
            (s) => s.status === "SCHEDULED" || s.status === "LIVE",
          ) || testSchedules[0];

        let newSchedules;
        if (activeOrFirst) {
          newSchedules = testSchedules.map((s) =>
            s.id === activeOrFirst.id
              ? { ...s, startTime: startISO, endTime: endISO }
              : s,
          );
        } else {
          newSchedules = [
            ...testSchedules,
            {
              id: selectedSchedule || "new-id",
              startTime: startISO,
              endTime: endISO,
            } as unknown as TestScheduleExtended,
          ];
        }

        return {
          ...prev,
          testSchedules: newSchedules,
        };
      });

      // Refresh invitation/schedule data (does not trigger full screen loader)
      await fetchScheduleData();
      return true;
    } catch (error: unknown) {
      console.error("Failed to save schedule:", error);
      return false;
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (isScheduleDirty) {
      setPendingTab(value);
      setUnsavedScheduleDialogOpen(true);
    } else {
      changeTab(value);
    }
  };

  const handleDiscardScheduleChanges = () => {
    if (selectedScheduleData) {
      if (selectedScheduleData.startTime) {
        setScheduleStartTime(selectedScheduleData.startTime.slice(0, 16));
      } else {
        setScheduleStartTime("");
      }
      if (selectedScheduleData.endTime) {
        setScheduleEndTime(selectedScheduleData.endTime.slice(0, 16));
      } else {
        setScheduleEndTime("");
      }
    } else {
      setScheduleStartTime("");
      setScheduleEndTime("");
    }
    if (pendingTab) {
      changeTab(pendingTab);
      setPendingTab(null);
    }
    setUnsavedScheduleDialogOpen(false);
  };

  const handleSaveAndSwitch = async () => {
    const success = await handleSaveSchedule();
    if (success && pendingTab) {
      changeTab(pendingTab);
      setPendingTab(null);
      setUnsavedScheduleDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await testService.deleteTest(id!);
      toast({
        title: "Success",
        description: `"${test?.title}" has been deleted successfully.`,
      });
      navigate("/admin/tests");
    } catch (error: unknown) {
      console.error("Failed to delete test:", error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return;

    try {
      setDeletingQuestion(true);
      console.log(
        "[Admin/TestsEdit] Initiating API call to remove question with mapping ID:",
        selectedQuestion.id,
      );
      // Call API to remove question from test
      await testService.removeQuestionFromTest(selectedQuestion.id);
      console.log(
        "[Admin/TestsEdit] API call succeeded. Question with ID:",
        selectedQuestion.id,
        "successfully removed from backend.",
      );

      // Optimistically remove from local state immediately (no full reload)
      const removedId = selectedQuestion.id;
      setQuestionsData((prev) => prev.filter((q) => q.id !== removedId));

      // Also update test.questions count in memory
      setTest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: (prev.questions || []).filter(
            (q) => q.questionId !== selectedQuestion.questionId,
          ),
          testQuestions: (prev.testQuestions || []).filter(
            (q) => q.id !== removedId,
          ),
        };
      });

      toast({
        title: "Success",
        description: `Question has been removed from the test.`,
      });

      // Silently re-sync questions from backend without triggering full loading
      try {
        const testQuestions = await testService.getTestQuestions(id!);
        if (testQuestions && testQuestions.length > 0) {
          const allQuestions = await testService.getAllQuestions();
          const enrichedQuestions = testQuestions.map((tq) => ({
            ...tq,
            question: allQuestions.find((q) => q.id === tq.questionId),
          }));
          setQuestionsData(enrichedQuestions);
        } else {
          setQuestionsData([]);
        }
      } catch (_) {
        // silently ignore; optimistic update already applied
      }
    } catch (error: unknown) {
      console.error("Failed to remove question:", error);
    } finally {
      setDeletingQuestion(false);
      setDeleteQuestionDialogOpen(false);
      setSelectedQuestion(null);
    }
  };

  const fetchScheduleData = useCallback(async () => {
    try {
      const schedulesData = await testService.getAllTestSchedules();
      const testSchedules = schedulesData.filter((s) => s.testId === id);

      if (testSchedules.length > 0) {
        const activeOrFirst =
          testSchedules.find(
            (s) => s.status === "SCHEDULED" || s.status === "LIVE",
          ) || testSchedules[0];
        setSelectedSchedule((prev) => prev || activeOrFirst.id);
        setSelectedScheduleData((prev) => prev || activeOrFirst);
        if (activeOrFirst.startTime) setScheduleStartTime(activeOrFirst.startTime.slice(0, 16));
        if (activeOrFirst.endTime) setScheduleEndTime(activeOrFirst.endTime.slice(0, 16));
      }
    } catch (error) {
      console.error("Failed to fetch schedule data:", error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchScheduleData();
    }
  }, [id, fetchScheduleData]);

  const loadReportData = useCallback(async () => {
    if (!id) return;
    setLoadingReports(true);
    try {
      // Fetch all test schedules and filter to those belonging to this test
      const schedulesData = await testService.getAllTestSchedules();
      const schedules = schedulesData.filter((s) => s.testId === id);
      setReportSchedules(schedules);

      if (schedules.length === 0) {
        setReportCandidates([]);
        setLoadingReports(false);
        return;
      }

      // Fetch candidates for all schedules in parallel
      const candidatesLists = await Promise.all(
        schedules.map(async (s) => {
          try {
            const res = await apiClient.get(
              `/api/admin/proctoring/assessment-schedules/${s.id}/candidates`,
            );
            const list = res.data?.data || res.data || [];
            return list.map((c: ReportCandidate) => ({
              ...c,
              scheduleId: s.id,
            }));
          } catch {
            return [];
          }
        }),
      );

      const candidatesList = candidatesLists.flat();
      setReportCandidates(candidatesList);

      const resultsMap: Record<string, CandidateResultEntry> = {};
      await Promise.allSettled(
        candidatesList.map(async (c: ReportCandidate) => {
          try {
            const detailRes = await apiClient.get(
              `/api/admin/proctoring/candidates/${c.candidateId}/details?scheduleId=${c.scheduleId}`,
            );
            const detail = detailRes.data?.data || detailRes.data;
            const sessionId = detail?.systemInfo?.sessionId;

            if (sessionId) {
              const resultRes = await apiClient.get(
                `/test-results/session/${sessionId}`,
              );
              const result = resultRes.data?.data || resultRes.data;
              resultsMap[getReportCandidateKey(c)] = {
                sessionId,
                detail,
                scheduleId: c.scheduleId,
                result: result && result.id ? result : null,
              };
            } else {
              resultsMap[getReportCandidateKey(c)] = {
                detail,
                scheduleId: c.scheduleId,
                result: null,
              };
            }
          } catch (err) {
            console.warn(
              `Failed to load details/result for candidate ${c.candidateId}:`,
              err,
            );
          }
        }),
      );
      setCandidateResults(resultsMap);
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoadingReports(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === "reports" && id) {
      loadReportData();
    }
  }, [activeTab, id, loadReportData]);

  const handleOpenAdvancedReport = async (candidate: ReportCandidate) => {
    setSelectedReportCandidate(candidate);
    setIsAdvancedReportOpen(true);
    const candidateData = candidateResults[getReportCandidateKey(candidate)];
    if (!candidateData) return;

    setLoadingAdvancedDetails(true);
    setReportCandidateDetails(candidateData.detail);
    setCandidatePaperSubmissions([]);

    try {
      const sessionId = candidateData.sessionId;
      if (sessionId) {
        const [paperRes, resumeRes] = await Promise.all([
          apiClient.get(`/test-sessions/${sessionId}/paper`),
          apiClient.get(`/test-sessions/${sessionId}/resume`),
        ]);

        const paperData = paperRes.data?.data || paperRes.data;
        const resumeData = resumeRes.data?.data || resumeRes.data;

        const questionsList = paperData?.paper?.questions || [];
        const submissionsList = resumeData?.submissions || [];

        const mappedSubmissions = questionsList.map(
          (q: Record<string, unknown>) => {
            const questionId = (q.sourceQuestionId || q.id) as string;
            const submission = submissionsList.find(
              (s: Record<string, unknown>) => s.questionId === questionId,
            );

            const normalizedQuestion = {
              id: questionId,
              prompt: q.prompt,
              title:
                (q.coding as { title?: string } | undefined)?.title ||
                (q.prompt as string | undefined) ||
                "Question",
              questionType: q.type,
              type: q.type,
              mcqOptions: q.options || q.mcqOptions || [],
            };

            return {
              question: normalizedQuestion,
              submission: submission || null,
            };
          },
        );
        setCandidatePaperSubmissions(mappedSubmissions);
      }
    } catch (err) {
      console.error("Failed to load advanced report details:", err);
    } finally {
      setLoadingAdvancedDetails(false);
    }
  };

  const downloadScorecard = async (
    sessionId: string,
    candidateName: string,
  ) => {
    try {
      toast({
        title: "Downloading Scorecard",
        description: "Please wait while we generate the PDF scorecard...",
      });
      const response = await apiClient.get(
        `/test-results/session/${sessionId}/scorecard`,
        {
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Scorecard_${candidateName.replace(/\s+/g, "_")}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download scorecard:", err);
    }
  };

  const escapeHtml = (unsafe: string) => {
    return (unsafe || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const downloadAdvancedReport = async (candidate: {
    candidateId: string;
    candidateName: string;
    email: string;
    testStatus?: string;
    violationCount?: number;
    scheduleId?: string;
  }) => {
    try {
      toast({
        title: "Generating Advanced PDF",
        description: "Compiling telemetry into a premium PDF report...",
      });

      const scoreData = candidateResults[getReportCandidateKey(candidate)];
      if (!scoreData?.sessionId) {
        console.error(
          "Download Failed: No active session found to build advanced report.",
        );
        return;
      }

      const detailRes = await apiClient.get(
        `/api/admin/proctoring/candidates/${candidate.candidateId}/details?scheduleId=${candidate.scheduleId || reportScheduleId}`,
      );
      const detailData = detailRes.data?.data ?? detailRes.data;

      const [paperRes, resumeRes, timingsRes] = await Promise.all([
        apiClient.get(`/test-sessions/${scoreData.sessionId}/paper`),
        apiClient.get(`/test-sessions/${scoreData.sessionId}/resume`),
        apiClient.get(`/test-sessions/${scoreData.sessionId}/question-timings`),
      ]);

      const paperData = paperRes.data?.data || paperRes.data;
      const resumeData = resumeRes.data?.data || resumeRes.data;
      const timingsList = timingsRes.data?.data || timingsRes.data || [];

      const questionsList = paperData?.paper?.questions || [];
      const submissionsList = resumeData?.submissions || [];

      const scoreText =
        scoreData?.result?.totalScore !== undefined
          ? `${scoreData.result.totalScore} / ${scoreData.result.maxScore}`
          : "N/A";
      const passText =
        scoreData?.result?.passed !== undefined
          ? scoreData.result.passed
            ? "PASSED"
            : "FAILED"
          : "N/A";

      // Initialize jsPDF document
      const doc = new jsPDF();

      // Premium Header Banner
      doc.setFillColor(15, 23, 42); // Obsidian background
      doc.rect(0, 0, 210, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("CANDIDATE SESSION AUDIT", 14, 18);

      doc.setTextColor(52, 211, 153); // Matrix Green
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("SECURE ADVANCED PROCTORING TELEMETRY REPORT", 14, 25);

      // Metadata Table
      autoTable(doc, {
        startY: 36,
        margin: { left: 14, right: 14 },
        head: [
          [
            {
              content: "CANDIDATE METADATA & SESSION INFORMATION",
              colSpan: 4,
              styles: {
                halign: "left",
                fillColor: [30, 41, 59],
                fontStyle: "bold",
              },
            },
          ],
        ],
        body: [
          [
            {
              content: "Candidate Name:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            candidate.candidateName,
            {
              content: "Final Score:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            {
              content: `${scoreText} (${passText})`,
              styles: {
                fontStyle: "bold",
                textColor: scoreData?.result?.passed
                  ? [16, 185, 129]
                  : [239, 68, 68],
              },
            },
          ],
          [
            {
              content: "Email Address:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            candidate.email,
            {
              content: "Proctoring Risk:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            {
              content: detailData?.riskLevel || "NONE",
              styles: {
                fontStyle: "bold",
                textColor:
                  detailData?.riskLevel === "CRITICAL" ||
                  detailData?.riskLevel === "HIGH"
                    ? [239, 68, 68]
                    : [16, 185, 129],
              },
            },
          ],
          [
            {
              content: "Session Status:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            (candidate.testStatus || "N/A").replace(/_/g, " "),
            {
              content: "Total Violations:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            {
              content: String(candidate.violationCount || 0),
              styles: {
                fontStyle: "bold",
                textColor:
                  (candidate.violationCount || 0) > 0
                    ? [239, 68, 68]
                    : [100, 116, 139],
              },
            },
          ],
          [
            {
              content: "IP Address:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            detailData?.systemInfo?.ipAddress || "N/A",
            {
              content: "Browser / OS:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            `${detailData?.systemInfo?.browser || "Chrome"} / ${detailData?.systemInfo?.os || "Windows"}`,
          ],
        ],
        theme: "grid",
        styles: {
          fontSize: 8.5,
          cellPadding: 4.5,
          lineColor: [100, 116, 139],
          lineWidth: 0.5,
        },
      });

      // Warnings Timeline Table
      const violations = detailData?.violations || [];
      const violationsBody = violations.map(
        (v: {
          eventId?: string;
          id?: string;
          occurredAt?: string;
          time?: string;
          eventType?: string;
          severity?: string;
          metadata?: { description?: string };
          description?: string;
        }) => [
          new Date(v.occurredAt || v.time || "").toLocaleTimeString(),
          (v.eventType || "").replace(/_/g, " "),
          v.severity || "INFO",
          v.metadata?.description || v.description || "Violation logged",
        ],
      );

      autoTable(doc, {
        startY: (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8,
        margin: { left: 14, right: 14 },
        head: [
          [
            {
              content: "PROCTORING WARNINGS TIMELINE",
              colSpan: 4,
              styles: {
                halign: "left",
                fillColor: [30, 41, 59],
                fontStyle: "bold",
              },
            },
          ],
          ["Time", "Event Type", "Severity", "Description"],
        ],
        body:
          violationsBody.length > 0
            ? violationsBody
            : [
                [
                  "-",
                  "No proctoring violations recorded during this session.",
                  "-",
                  "-",
                ],
              ],
        theme: "striped",
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [100, 116, 139],
          lineWidth: 0.5,
        },
      });

      // Section Separator Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59); // Slate header
      doc.text(
        "QUESTIONS & SUBMISSIONS DETAILS",
        14,
        (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10,
      );

      // Question Cards using autoTables
      questionsList.forEach(
        (
          q: {
            id: string;
            sourceQuestionId?: string;
            prompt?: string;
            type?: string;
            coding?: { title?: string };
            options?: Array<{ id: string; text: string; isCorrect: boolean }>;
            mcqOptions?: Array<{
              id: string;
              text: string;
              isCorrect: boolean;
            }>;
          },
          idx: number,
        ) => {
          const questionId = q.sourceQuestionId || q.id;
          const sub = submissionsList.find(
            (s: {
              questionId: string;
              answerText?: string;
              selectedOptionIds?: string[];
            }) => s.questionId === questionId,
          );
          const isCoding = q.type === "CODING";

          // Build exact selected ID set & raw answers list
          const selectedValues = new Set<string>();
          if (sub?.selectedOptionIds && Array.isArray(sub.selectedOptionIds)) {
            sub.selectedOptionIds.forEach((id: string) => selectedValues.add(String(id).trim().toLowerCase()));
          }
          if (sub?.answerText) {
            const rawAns = String(sub.answerText).trim();
            selectedValues.add(rawAns.toLowerCase());
            try {
              const parsed = JSON.parse(sub.answerText);
              if (Array.isArray(parsed)) {
                parsed.forEach((id: string) => selectedValues.add(String(id).trim().toLowerCase()));
              } else if (typeof parsed === "string") {
                selectedValues.add(parsed.trim().toLowerCase());
              }
            } catch {
              /* raw text */
            }
          }

          // Fetch true correct options list
          const enrichedTQ = questionsData.find(
            (tq) => tq.questionId === questionId,
          );
          const enrichedQuestion = enrichedTQ?.question;
          const correctOptions: Array<{ id?: string; text?: string; isCorrect?: boolean }> =
            (enrichedQuestion?.options || enrichedQuestion?.mcqOptions || []) as Array<{ id?: string; text?: string; isCorrect?: boolean }>;

          // Calculate time spent telemetry
          const timeItem = timingsList.find(
            (t: { questionId: string }) => t.questionId === questionId,
          );
          const activeSeconds = timeItem?.activeSeconds || 0;
          const minutes = Math.floor(activeSeconds / 60);
          const seconds = activeSeconds % 60;
          const timeSpentText =
            minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

          // Build structured body rows
          const bodyRows: unknown[][] = [
            [
              {
                content: `Question:\n${q.prompt || ""}`,
                colSpan: 3,
                styles: {
                  textColor: [15, 23, 42],
                  fontStyle: "bold",
                  fillColor: [248, 250, 252],
                  fontSize: 9,
                },
              },
            ],
          ];

          if (isCoding) {
            bodyRows.push([
              {
                content: `Submitted Code:\n${sub?.answerText || "No submission"}`,
                colSpan: 3,
                styles: {
                  fontStyle: "normal",
                  fillColor: [248, 250, 252],
                  textColor: [15, 23, 42],
                },
              },
            ]);
          } else {
            const optionsList = q.options || q.mcqOptions || [];
            optionsList.forEach(
              (
                opt: { id: string; text: string; isCorrect: boolean },
                oIdx: number,
              ) => {
                const optionLetter = String.fromCharCode(65 + oIdx); // 'A', 'B', etc.
                const correctOpt = correctOptions.find(
                  (co) =>
                    (co.id && opt.id && co.id === opt.id) ||
                    (co.text && opt.text && co.text.trim().toLowerCase() === opt.text.trim().toLowerCase()),
                );
                const isOptionCorrect = correctOpt
                  ? Boolean(correctOpt.isCorrect)
                  : Boolean(opt.isCorrect);

                // Robust check for selection matching ID, letter, index, or option text
                const optIdStr = String(opt.id || "").trim().toLowerCase();
                const optTextStr = String(opt.text || "").trim().toLowerCase();
                const letterStr = optionLetter.toLowerCase();
                const idxStr = String(oIdx);

                const isSelected =
                  (optIdStr !== "" && selectedValues.has(optIdStr)) ||
                  selectedValues.has(letterStr) ||
                  selectedValues.has(idxStr) ||
                  (optTextStr !== "" && selectedValues.has(optTextStr)) ||
                  Array.from(selectedValues).some(
                    (val) =>
                      val === optTextStr ||
                      val.startsWith(`${letterStr}.`) ||
                      val.startsWith(`${letterStr} `)
                  );

                const statusLabel =
                  isSelected && isOptionCorrect
                    ? "[SELECTED & CORRECT]"
                    : isSelected
                      ? "[SELECTED - INCORRECT]"
                      : isOptionCorrect
                        ? "[CORRECT ANSWER]"
                        : "";

                const rowText =
                  `${optionLetter}. ${opt.text} ${statusLabel}`.trim();

                let cellStyle = {
                  textColor: [30, 41, 59],
                  fontStyle: "normal",
                  fillColor: [255, 255, 255],
                };
                if (isSelected && isOptionCorrect) {
                  cellStyle = {
                    textColor: [16, 185, 129],
                    fontStyle: "bold",
                    fillColor: [240, 253, 250],
                  }; // matrix green bg/fg
                } else if (isSelected) {
                  cellStyle = {
                    textColor: [239, 68, 68],
                    fontStyle: "bold",
                    fillColor: [254, 242, 242],
                  }; // soft red bg/fg
                } else if (isOptionCorrect) {
                  cellStyle = {
                    textColor: [16, 185, 129],
                    fontStyle: "bold",
                    fillColor: [255, 255, 255],
                  }; // correct option marker
                }

                bodyRows.push([
                  { content: rowText, colSpan: 3, styles: cellStyle },
                ]);
              },
            );
          }

          autoTable(doc, {
            pageBreak: "avoid", // Keep entire card grouped to prevent hanging rows
            startY:
              idx === 0
                ? (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 16
                : (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 12,
            margin: { left: 14, right: 14 },
            head: [
              [
                {
                  content: `Q${idx + 1}`,
                  styles: {
                    halign: "center",
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    lineColor: [100, 116, 139],
                    lineWidth: 0.5,
                  },
                },
                {
                  content: "",
                  styles: { fillColor: [255, 255, 255], lineWidth: 0 },
                },
                {
                  content: "",
                  styles: { fillColor: [255, 255, 255], lineWidth: 0 },
                },
              ],
            ],
            body: bodyRows,
            theme: "grid",
            styles: {
              fontSize: 8,
              cellPadding: 4.5,
              lineColor: [100, 116, 139],
              lineWidth: 0.5,
            },
            columnStyles: {
              0: { cellWidth: 15 }, // Q1, Q2 etc.
              1: { cellWidth: 42 }, // Time Spent box (slightly wider to fit slant nicely)
              2: { cellWidth: 125 }, // Empty space on the right
            },
            didDrawCell: (data) => {
              if (data.row.section === "head" && data.column.index === 1) {
                const cell = data.cell;
                const h = cell.height;

                // Draw custom 45-degree slanted polygon using two triangles for universal jsPDF support
                doc.setFillColor(30, 41, 59);
                doc.setDrawColor(30, 41, 59); // Match draw color to fill color to hide diagonal seam
                doc.triangle(
                  cell.x,
                  cell.y,
                  cell.x + cell.width - h,
                  cell.y,
                  cell.x,
                  cell.y + h,
                  "FD",
                );
                doc.triangle(
                  cell.x + cell.width - h,
                  cell.y,
                  cell.x + cell.width,
                  cell.y + h,
                  cell.x,
                  cell.y + h,
                  "FD",
                );

                // Draw slate borders around the slanted cell
                doc.setDrawColor(100, 116, 139);
                doc.setLineWidth(0.5);
                doc.line(cell.x, cell.y, cell.x, cell.y + h); // left vertical
                doc.line(cell.x, cell.y + h, cell.x + cell.width, cell.y + h); // bottom horizontal
                doc.line(cell.x, cell.y, cell.x + cell.width - h, cell.y); // top horizontal
                doc.line(
                  cell.x + cell.width - h,
                  cell.y,
                  cell.x + cell.width,
                  cell.y + h,
                ); // slanted right edge

                // Draw text centered within the shape
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.text(
                  `Time Spent: ${timeSpentText}`,
                  cell.x + 2,
                  cell.y + h / 2 + 1.5,
                );
              }
            },
          });
        },
      );

      // Save PDF directly to user's downloads folder
      doc.save(
        `Advanced_Report_${candidate.candidateName.replace(/\s+/g, "_")}.pdf`,
      );

      toast({
        title: "Download Successful",
        description: "Advanced PDF report downloaded directly.",
      });
    } catch (err) {
      console.error("Failed to download advanced report:", err);
    }
  };

  const exportBulkExcelReport = async () => {
    if (displayedCandidates.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no appeared candidates to export.",
        variant: "destructive",
      });
      return;
    }

    setExportingExcel(true);
    toast({
      title: "Generating Bulk Excel Export",
      description: "Gathering candidate telemetry, scores, and submissions...",
    });

    try {
      // 1. Fetch detailed information for all displayed candidates
      const detailedCandidateDataList = await Promise.all(
        displayedCandidates.map(async (candidate) => {
          const reportKey = getReportCandidateKey(candidate);
          const scoreData = candidateResults[reportKey];
          const sessionId = scoreData?.sessionId;

          let detailData = scoreData?.detail;
          let paperData = null;
          let resumeData = null;
          let timingsList: Array<{ questionId: string; activeSeconds?: number }> = [];

          try {
            if (!detailData) {
              const detailRes = await apiClient.get(
                `/api/admin/proctoring/candidates/${candidate.candidateId}/details?scheduleId=${candidate.scheduleId || reportScheduleId}`,
              );
              detailData = detailRes.data?.data ?? detailRes.data;
            }

            if (sessionId) {
              const [paperRes, resumeRes, timingsRes] = await Promise.all([
                apiClient.get(`/test-sessions/${sessionId}/paper`).catch(() => ({ data: null })),
                apiClient.get(`/test-sessions/${sessionId}/resume`).catch(() => ({ data: null })),
                apiClient.get(`/test-sessions/${sessionId}/question-timings`).catch(() => ({ data: null })),
              ]);

              paperData = paperRes.data?.data || paperRes.data;
              resumeData = resumeRes.data?.data || resumeRes.data;
              timingsList = timingsRes.data?.data || timingsRes.data || [];
            }
          } catch (err) {
            console.warn(`Could not fetch full details for ${candidate.candidateName}:`, err);
          }

          return {
            candidate,
            scoreData,
            detailData,
            paperData,
            resumeData,
            timingsList,
          };
        }),
      );

      // Build Summary Sheet Rows
      const summaryRows = detailedCandidateDataList.map((item, idx) => {
        const { candidate, scoreData, detailData } = item;
        const totalScore = scoreData?.result?.totalScore;
        const maxScore = scoreData?.result?.maxScore ?? totalTestMarks;
        const percentage =
          totalScore !== undefined && maxScore > 0
            ? `${((totalScore / maxScore) * 100).toFixed(1)}%`
            : "-";
        const passed = scoreData?.result?.passed;
        const passStatus =
          passed !== undefined ? (passed ? "Passed" : "Failed") : "Pending";
        const risk = detailData?.riskLevel || candidate.riskLevel || "NONE";
        const violationCount = candidate.violationCount || detailData?.violations?.length || 0;
        const ip = detailData?.systemInfo?.ipAddress || detailData?.ipAddress || "N/A";
        const browser = detailData?.systemInfo?.browser || detailData?.browser || "N/A";
        const os = detailData?.systemInfo?.os || detailData?.os || "N/A";
        const fullscreenViolations =
          detailData?.systemInfo?.fullscreenViolations ?? detailData?.fullscreenViolations ?? 0;

        return {
          "S.No": idx + 1,
          "Candidate Name": candidate.candidateName || "N/A",
          "Email Address": candidate.email || "N/A",
          "Test Status": (candidate.testStatus || "N/A").replace(/_/g, " "),
          "Score": totalScore !== undefined ? totalScore : 0,
          "Max Score": maxScore,
          "Percentage": percentage,
          "Result": passStatus,
          "Proctoring Risk": risk,
          "Total Violations": violationCount,
          "Fullscreen Exits": fullscreenViolations,
          "IP Address": ip,
          "Browser": browser,
          "Operating System": os,
          "Schedule ID": candidate.scheduleId || "N/A",
        };
      });

      // Build Question Submissions Sheet Rows
      const submissionRows: Array<Record<string, unknown>> = [];
      detailedCandidateDataList.forEach((item) => {
        const { candidate, scoreData, paperData, resumeData, timingsList } = item;
        const questionsList =
          paperData?.paper?.questions ||
          questionsData.map((tq) => tq.question).filter(Boolean) ||
          [];
        const submissionsList = resumeData?.submissions || [];

        if (questionsList.length === 0) {
          submissionRows.push({
            "Candidate Name": candidate.candidateName,
            "Email Address": candidate.email,
            "Question #": "-",
            "Question Title / Prompt": "No questions recorded",
            "Question Type": "-",
            "Time Spent": "-",
            "Candidate Answer / Code": "-",
            "Correct Options": "-",
            "Evaluation Status": "-",
          });
          return;
        }

        questionsList.forEach((q: {
          id: string;
          sourceQuestionId?: string;
          prompt?: string;
          title?: string;
          type?: string;
          coding?: { title?: string };
          options?: Array<{ id: string; text: string; isCorrect: boolean }>;
          mcqOptions?: Array<{
            id: string;
            text: string;
            isCorrect: boolean;
          }>;
        }, qIdx: number) => {
          const questionId = q.sourceQuestionId || q.id;
          const sub = submissionsList.find(
            (s: { questionId: string; answerText?: string; selectedOptionIds?: string[] }) => s.questionId === questionId,
          ) as { questionId: string; answerText?: string; selectedOptionIds?: string[] } | undefined;
          const isCoding = q.type === "CODING";

          // Calculate time spent
          const timeItem = timingsList.find(
            (t) => t.questionId === questionId,
          );
          const activeSeconds = timeItem?.activeSeconds || 0;
          const mins = Math.floor(activeSeconds / 60);
          const secs = activeSeconds % 60;
          const timeSpentText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          // Selected answers
          const selectedValues = new Set<string>();
          if (sub?.selectedOptionIds && Array.isArray(sub.selectedOptionIds)) {
            sub.selectedOptionIds.forEach((id: string) =>
              selectedValues.add(String(id).trim().toLowerCase()),
            );
          }
          if (sub?.answerText) {
            const rawAns = String(sub.answerText).trim();
            selectedValues.add(rawAns.toLowerCase());
            try {
              const parsed = JSON.parse(sub.answerText);
              if (Array.isArray(parsed)) {
                parsed.forEach((id: string) =>
                  selectedValues.add(String(id).trim().toLowerCase()),
                );
              } else if (typeof parsed === "string") {
                selectedValues.add(parsed.trim().toLowerCase());
              }
            } catch {
              /* raw text */
            }
          }

          // Enriched question for correct options
          const enrichedTQ = questionsData.find(
            (tq) => tq.questionId === questionId,
          );
          const enrichedQuestion = enrichedTQ?.question;
          const correctOptionsList =
            (enrichedQuestion?.options ||
              enrichedQuestion?.mcqOptions ||
              q.options ||
              q.mcqOptions ||
              []) as Array<{ id?: string; text?: string; isCorrect?: boolean }>;

          let candidateAnswerText = "Not Attempted";
          let correctOptionText = "-";
          let isCorrectSubmission = "N/A";

          if (isCoding) {
            candidateAnswerText = sub?.answerText || "No code submitted";
            correctOptionText = "Coding Problem";
            isCorrectSubmission = sub?.answerText ? "Submitted" : "No Submission";
          } else {
            const optionsList = q.options || q.mcqOptions || [];
            const correctNames: string[] = [];
            const selectedNames: string[] = [];
            let anyCorrectSelected = false;
            let anyIncorrectSelected = false;

            optionsList.forEach((opt: { id?: string; text?: string; isCorrect?: boolean }, oIdx: number) => {
              const optionLetter = String.fromCharCode(65 + oIdx);
              const correctOpt = correctOptionsList.find(
                (co) =>
                  (co.id && opt.id && co.id === opt.id) ||
                  (co.text &&
                    opt.text &&
                    co.text.trim().toLowerCase() ===
                      opt.text.trim().toLowerCase()),
              );
              const isOptionCorrect = correctOpt
                ? Boolean(correctOpt.isCorrect)
                : Boolean(opt.isCorrect);

              if (isOptionCorrect) {
                correctNames.push(`(${optionLetter}) ${opt.text}`);
              }

              const optIdStr = String(opt.id || "").trim().toLowerCase();
              const optTextStr = String(opt.text || "").trim().toLowerCase();
              const letterStr = optionLetter.toLowerCase();
              const idxStr = String(oIdx);

              const isSelected =
                (optIdStr !== "" && selectedValues.has(optIdStr)) ||
                selectedValues.has(letterStr) ||
                selectedValues.has(idxStr) ||
                (optTextStr !== "" && selectedValues.has(optTextStr)) ||
                Array.from(selectedValues).some(
                  (val) =>
                    val === optTextStr ||
                    val.startsWith(`${letterStr}.`) ||
                    val.startsWith(`${letterStr} `),
                );

              if (isSelected) {
                selectedNames.push(`(${optionLetter}) ${opt.text}`);
                if (isOptionCorrect) {
                  anyCorrectSelected = true;
                } else {
                  anyIncorrectSelected = true;
                }
              }
            });

            correctOptionText = correctNames.join(", ") || "N/A";
            if (selectedNames.length > 0) {
              candidateAnswerText = selectedNames.join(", ");
              if (anyCorrectSelected && !anyIncorrectSelected) {
                isCorrectSubmission = "CORRECT";
              } else {
                isCorrectSubmission = "INCORRECT";
              }
            } else if (sub?.answerText) {
              candidateAnswerText = sub.answerText;
              isCorrectSubmission = "SUBMITTED";
            }
          }

          submissionRows.push({
            "Candidate Name": candidate.candidateName,
            "Email Address": candidate.email,
            "Question #": `Q${qIdx + 1}`,
            "Question Title / Prompt": q.prompt || q.title || `Question ${qIdx + 1}`,
            "Question Type": q.type || "MCQ",
            "Time Spent": timeSpentText,
            "Candidate Answer / Code": candidateAnswerText,
            "Correct Answer(s)": correctOptionText,
            "Answer Status": isCorrectSubmission,
          });
        });
      });

      // Build Proctoring Violations Sheet Rows
      const violationRows: Array<Record<string, unknown>> = [];
      detailedCandidateDataList.forEach((item) => {
        const { candidate, detailData } = item;
        const violations = detailData?.violations || [];

        if (violations.length === 0) {
          violationRows.push({
            "Candidate Name": candidate.candidateName,
            "Email Address": candidate.email,
            "Timestamp": "-",
            "Violation Type": "None",
            "Severity": "INFO",
            "Description": "Clean session - no violations recorded",
          });
        } else {
          violations.forEach((v) => {
            violationRows.push({
              "Candidate Name": candidate.candidateName,
              "Email Address": candidate.email,
              "Timestamp": v.occurredAt || v.time ? new Date(v.occurredAt || v.time || "").toLocaleString() : "N/A",
              "Violation Type": (v.eventType || "VIOLATION").replace(/_/g, " "),
              "Severity": v.severity || "MEDIUM",
              "Description": v.metadata?.description || v.description || "Violation recorded",
            });
          });
        }
      });

      // Create Workbook and Sheets
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsSubmissions = XLSX.utils.json_to_sheet(submissionRows);
      const wsViolations = XLSX.utils.json_to_sheet(violationRows);

      // Auto-fit column widths for clear presentation
      const autoFitCols = (rows: Array<Record<string, unknown>>) => {
        if (!rows || rows.length === 0) return [];
        const keys = Object.keys(rows[0]);
        return keys.map((key) => {
          const maxLen = rows.reduce((max, row) => {
            const cellVal = String(row[key] ?? "");
            return Math.max(max, cellVal.length);
          }, key.length);
          return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
        });
      };

      wsSummary["!cols"] = autoFitCols(summaryRows);
      wsSubmissions["!cols"] = autoFitCols(submissionRows);
      wsViolations["!cols"] = autoFitCols(violationRows);

      XLSX.utils.book_append_sheet(wb, wsSummary, "Candidate Performance");
      XLSX.utils.book_append_sheet(wb, wsSubmissions, "Question Submissions");
      XLSX.utils.book_append_sheet(wb, wsViolations, "Proctoring Violations");

      const testTitleSafe = (test?.title || "Test").replace(/[^a-zA-Z0-9_-]/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${testTitleSafe}_Candidate_Reports_${dateStr}.xlsx`);

      toast({
        title: "Export Completed",
        description: `Successfully exported bulk report for ${displayedCandidates.length} candidate(s).`,
      });
    } catch (err) {
      console.error("Failed to export bulk excel report:", err);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the Excel report.",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString();
  };

  const handleAddQuestions = () => {
    navigate(`/admin/tests/${id}/questions`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Test Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The test you're looking for doesn't exist or has been deleted.
        </p>
        <Link to="/admin/tests">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tests
          </Button>
        </Link>
      </div>
    );
  }

  const questionCount = test.questions?.length || 0;

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackClick}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">Edit Test</h1>
            <p className="text-muted-foreground mt-1">
              Modify test details and configuration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-semibold gap-1.5"
            title="Preview the exact assessment experience as seen by candidates"
          >
            <Eye className="w-4 h-4 text-indigo-500" />
            Preview Test
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="details">Basic Information</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questionCount})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="invite">Invite Candidates</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Details</CardTitle>
                  <CardDescription>
                    Configure the basic information for your test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Test Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Frontend Engineering Assessment"
                      value={formData.title}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter test description..."
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="durationMins">Duration (minutes)</Label>
                      <Input
                        id="durationMins"
                        name="durationMins"
                        type="number"
                        value={formData.durationMins}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passMark">Passing Mark (%)</Label>
                      <Input
                        id="passMark"
                        name="passMark"
                        type="number"
                        value={formData.passMark}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(v) =>
                          handleSelectChange("difficulty", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EASY">Easy</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HARD">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 flex flex-col h-full">
              <Card className="flex-1 flex flex-col h-full">
                <CardHeader>
                  <CardTitle>Test Instructions</CardTitle>
                  <CardDescription>
                    General instructions shown to candidates before starting the
                    test
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <Textarea
                    placeholder="Enter test instructions..."
                    className="flex-1 min-h-[350px] font-sans text-sm resize-none"
                    value={
                      ((
                        formData.instructions as
                          | Record<string, unknown>
                          | undefined
                      )?.general as string) || ""
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        instructions: {
                          ...prev.instructions,
                          general: e.target.value,
                        },
                      }))
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Basic Info Save Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveBasicInfo} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Basic Info
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Test Questions</CardTitle>
                <CardDescription>
                  Manage and organize questions in this test
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddQuestions}>
                <Plus className="w-4 h-4 mr-2" />
                Add Questions
              </Button>
            </CardHeader>
            <CardContent>
              {questionsData.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No questions added yet.
                  </p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={handleAddQuestions}
                  >
                    Add your first question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questionsData.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">
                            {item.question?.title ||
                              item.question?.prompt ||
                              "Unknown Question"}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span className="capitalize">
                              {(
                                ((
                                  item.question as unknown as
                                    | Record<string, unknown>
                                    | undefined
                                )?.type as string) ||
                                item.question?.questionType ||
                                ""
                              )?.toLowerCase()}
                            </span>
                            <span>•</span>
                            <span>{item.marks} marks</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-red-50/80 dark:hover:bg-red-950/20"
                        onClick={() => {
                          setSelectedQuestion(item);
                          setDeleteQuestionDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="pt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Schedule</CardTitle>
              <CardDescription>
                Set the availability window for this test (Organisation is set
                to your Admin home by default)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Starting Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Starting time</Label>
                  <p className="text-xs text-muted-foreground">
                    This test would not be accessible before this.
                  </p>
                  <div className="flex gap-4 items-center mt-1">
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setStartDatePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 cursor-pointer h-10 select-none"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {scheduleStartTime
                            ? scheduleStartTime.split("T")[0]
                            : "Select Date"}
                        </span>
                      </button>
                      <MaterialDatePickerDialog
                        isOpen={startDatePickerOpen}
                        onClose={() => setStartDatePickerOpen(false)}
                        value={
                          scheduleStartTime
                            ? scheduleStartTime.split("T")[0]
                            : ""
                        }
                        onChange={(date) => {
                          const time =
                            scheduleStartTime && scheduleStartTime.includes("T")
                              ? scheduleStartTime.split("T")[1]
                              : "00:00";
                          setScheduleStartTime(date ? `${date}T${time}` : "");
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setStartTimePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 cursor-pointer h-10 select-none"
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {scheduleStartTime && scheduleStartTime.includes("T")
                            ? scheduleStartTime.split("T")[1].slice(0, 5)
                            : "Select Time"}
                        </span>
                      </button>
                      <MaterialTimePickerDialog
                        isOpen={startTimePickerOpen}
                        onClose={() => setStartTimePickerOpen(false)}
                        value={
                          scheduleStartTime && scheduleStartTime.includes("T")
                            ? scheduleStartTime.split("T")[1].slice(0, 5)
                            : ""
                        }
                        onChange={(time) => {
                          const date = scheduleStartTime
                            ? scheduleStartTime.split("T")[0]
                            : new Date().toISOString().split("T")[0];
                          setScheduleStartTime(date ? `${date}T${time}` : "");
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ending Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ending time</Label>
                  <p className="text-xs text-muted-foreground">
                    This test would not be accessible after this.
                  </p>
                  <div className="flex gap-4 items-center mt-1">
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setEndDatePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 cursor-pointer h-10 select-none"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {scheduleEndTime
                            ? scheduleEndTime.split("T")[0]
                            : "Select Date"}
                        </span>
                      </button>
                      <MaterialDatePickerDialog
                        isOpen={endDatePickerOpen}
                        onClose={() => setEndDatePickerOpen(false)}
                        value={
                          scheduleEndTime ? scheduleEndTime.split("T")[0] : ""
                        }
                        onChange={(date) => {
                          const time =
                            scheduleEndTime && scheduleEndTime.includes("T")
                              ? scheduleEndTime.split("T")[1]
                              : "00:00";
                          setScheduleEndTime(date ? `${date}T${time}` : "");
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setEndTimePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 cursor-pointer h-10 select-none"
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {scheduleEndTime && scheduleEndTime.includes("T")
                            ? scheduleEndTime.split("T")[1].slice(0, 5)
                            : "Select Time"}
                        </span>
                      </button>
                      <MaterialTimePickerDialog
                        isOpen={endTimePickerOpen}
                        onClose={() => setEndTimePickerOpen(false)}
                        value={
                          scheduleEndTime && scheduleEndTime.includes("T")
                            ? scheduleEndTime.split("T")[1].slice(0, 5)
                            : ""
                        }
                        onChange={(time) => {
                          const date = scheduleEndTime
                            ? scheduleEndTime.split("T")[0]
                            : new Date().toISOString().split("T")[0];
                          setScheduleEndTime(date ? `${date}T${time}` : "");
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t px-6 py-4 bg-muted/20">
              {isScheduleDirty && (
                <span className="text-xs text-muted-foreground self-center mr-auto">
                  You have unsaved schedule changes
                </span>
              )}
              <Button
                type="button"
                onClick={handleSaveSchedule}
                disabled={savingSchedule || !isScheduleDirty}
                size="sm"
              >
                {savingSchedule ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Schedule...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Schedule
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proctoring Settings</CardTitle>
              <CardDescription>
                Configure anti-cheating and monitoring rules for this assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="proctoringMode">Proctoring Mode</Label>
                <Select
                  value={formData.proctoringMode}
                  onValueChange={handleProctoringModeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select proctoring mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No Proctoring</SelectItem>
                    <SelectItem value="LOW">Low Proctoring</SelectItem>
                    <SelectItem value="MEDIUM">Medium Proctoring</SelectItem>
                    <SelectItem value="HIGH">High Proctoring</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.proctoringMode === "NONE" ? (
                <p className="text-sm text-muted-foreground italic">
                  This assessment will run without proctoring.
                </p>
              ) : (
                <div className="space-y-6 pt-2">
                  {/* Category 1: Browser Controls */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Browser & Shell Control
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="enableTabSwitchTracking"
                            checked={formData.enableTabSwitchTracking}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "enableTabSwitchTracking",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.enableTabSwitchTracking &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="enableTabSwitchTracking"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Enable tab switch tracking
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="blockCopyPaste"
                            checked={formData.blockCopyPaste}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("blockCopyPaste", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.blockCopyPaste &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="blockCopyPaste"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Block copy/paste
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="blockRightClick"
                            checked={formData.blockRightClick}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("blockRightClick", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.blockRightClick &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="blockRightClick"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Block right click
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="warnOnFullscreenExit"
                            checked={formData.warnOnFullscreenExit}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "warnOnFullscreenExit",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.warnOnFullscreenExit &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="warnOnFullscreenExit"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Warn on fullscreen exit
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Webcam & Audio Monitoring */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Webcam & Audio Monitoring
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="requireWebcam"
                            checked={formData.requireWebcam}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireWebcam", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.requireWebcam &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="requireWebcam"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Require webcam
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="detectFaceNotVisible"
                            checked={formData.detectFaceNotVisible}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "detectFaceNotVisible",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.detectFaceNotVisible &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="detectFaceNotVisible"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Detect face not visible
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="detectMultipleFaces"
                            checked={formData.detectMultipleFaces}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "detectMultipleFaces",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.detectMultipleFaces &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="detectMultipleFaces"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Detect multiple faces
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="detectSuspiciousAudio"
                            checked={formData.detectSuspiciousAudio}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "detectSuspiciousAudio",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.detectSuspiciousAudio &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="detectSuspiciousAudio"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Detect suspicious audio
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="periodicSnapshots"
                            checked={formData.periodicSnapshots}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "periodicSnapshots",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.periodicSnapshots &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="periodicSnapshots"
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          <span>Periodic snapshots</span>
                          {formData.periodicSnapshots && (
                            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {formData.proctoringMode === "HIGH"
                                ? "⚡ 1 Frame / 1 min"
                                : "⏱️ 1 Frame / 3 mins"}
                            </span>
                          )}
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="evidenceCapture"
                            checked={formData.evidenceCapture}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("evidenceCapture", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.evidenceCapture &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="evidenceCapture"
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          <span>Evidence capture</span>
                          {formData.evidenceCapture && (
                            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              📸 Violation Snapshots
                            </span>
                          )}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Advanced Security & Hardware */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Advanced Security & Hardware
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="requireMicrophone"
                            checked={formData.requireMicrophone}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "requireMicrophone",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.requireMicrophone &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="requireMicrophone"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Require microphone
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="requireScreenShare"
                            checked={formData.requireScreenShare}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "requireScreenShare",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.requireScreenShare &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="requireScreenShare"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Require screen share
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="detectDevTools"
                            checked={formData.detectDevTools}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectDevTools", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.detectDevTools &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="detectDevTools"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Detect DevTools
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="detectScreenShareStop"
                            checked={formData.detectScreenShareStop}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "detectScreenShareStop",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.detectScreenShareStop &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="detectScreenShareStop"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Detect screen-share stop
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex items-center justify-center">
                          <Checkbox
                            id="enableLiveProctoring"
                            checked={formData.enableLiveProctoring}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "enableLiveProctoring",
                                !!checked,
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          {!formData.enableLiveProctoring &&
                            formData.proctoringMode !== "CUSTOM" && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                <X className="h-3 w-3 stroke-[2.5]" />
                              </div>
                            )}
                        </div>
                        <Label
                          htmlFor="enableLiveProctoring"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Enable live proctoring
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4 bg-muted/20">
              <Button onClick={handleSaveProctoring} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Proctoring Settings
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="invite" className="pt-6">
          <Card className="border border-border">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Candidate Invitations
                </CardTitle>
                <CardDescription>
                  Manage candidate invitations, test access links, and live assessment progress
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedSchedule ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-amber-50/10 border-amber-200/50">
                  <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4 opacity-80" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    No Active Schedules
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2 text-sm">
                    This test has not been scheduled yet. You must configure a
                    schedule under the Settings tab before inviting candidates.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm">
                    <div>
                      <p className="font-semibold text-primary">
                        Connected Assessment Schedule
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(selectedScheduleData?.startTime || "")}{" "}
                        - {formatDateTime(selectedScheduleData?.endTime || "")}
                      </p>
                    </div>
                  </div>

                  <InvitedCandidatesTable
                    key={selectedSchedule}
                    scheduleId={selectedSchedule}
                    scheduleData={selectedScheduleData}
                    onOpenAddModal={() => setIsAddCandidatesOpen(true)}
                    onOpenBulkModal={() => setIsBulkInviteOpen(true)}
                    onInvitationsLoaded={setInvitations}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="pt-6">
          <Card className="border border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Candidate Performance Reports
                </CardTitle>
                <CardDescription>
                  View test scores, detailed submissions, and proctoring metrics
                  candidate-wise
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Label
                  htmlFor="report-schedule"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Filter by Schedule:
                </Label>
                <Select
                  value={reportScheduleId}
                  onValueChange={setReportScheduleId}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schedules</SelectItem>
                    {reportSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {new Date(schedule.startTime).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadReportData()}
                  disabled={loadingReports || exportingExcel}
                  className="shrink-0"
                  title="Refresh Reports"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingReports ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button
                  onClick={exportBulkExcelReport}
                  disabled={loadingReports || exportingExcel || displayedCandidates.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0 font-semibold shadow-sm"
                  title="Export all candidate reports, scores, submissions, and proctoring telemetry to a single Excel file"
                >
                  {exportingExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {exportingExcel ? "Exporting..." : "Export Excel"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading candidate reports...
                  </p>
                </div>
              ) : displayedCandidates.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">
                    No candidate records found for this test.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/75">
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                        <TableHead className="text-center">
                          Proctoring Risk
                        </TableHead>
                        <TableHead className="text-center">
                          Violations
                        </TableHead>
                        <TableHead className="text-right">
                          Download Reports / View
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCandidates.map((candidate) => {
                        const reportCandidateKey =
                          getReportCandidateKey(candidate);
                        const scoreData = candidateResults[reportCandidateKey];
                        const testStatus = candidate.testStatus;

                        let statusColor = "bg-slate-100 text-slate-700";
                        if (testStatus === "SUBMITTED")
                          statusColor =
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                        else if (testStatus === "AUTO_SUBMITTED")
                          statusColor =
                            "bg-amber-500/10 text-amber-600 border-amber-500/20";
                        else if (testStatus === "IN_PROGRESS")
                          statusColor =
                            "bg-sky-500/10 text-sky-600 border-sky-500/20";

                        const risk =
                          scoreData?.detail?.riskLevel ||
                          candidate.riskLevel ||
                          "NONE";
                        let riskColor = "bg-slate-100 text-slate-700";
                        if (risk === "HIGH")
                          riskColor = "bg-red-500/15 text-red-500";
                        else if (risk === "CRITICAL")
                          riskColor = "bg-red-500 text-white animate-pulse";
                        else if (risk === "MEDIUM")
                          riskColor = "bg-amber-500/15 text-amber-500";
                        else if (risk === "LOW")
                          riskColor = "bg-yellow-500/15 text-yellow-600";
                        else if (risk === "NONE")
                          riskColor = "bg-emerald-500/15 text-emerald-500";

                        const totalScore = scoreData?.result?.totalScore;
                        const maxScore = scoreData?.result?.maxScore;
                        const passed = scoreData?.result?.passed;
                        const isResultPending =
                          testStatus === "IN_PROGRESS" ||
                          testStatus === "NOT_STARTED" ||
                          (!scoreData?.sessionId &&
                            totalScore === undefined &&
                            passed === undefined);

                        return (
                          <TableRow key={reportCandidateKey}>
                            <TableCell>
                              <div className="font-semibold">
                                {candidate.candidateName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {candidate.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColor}>
                                {testStatus?.replace(/_/g, " ") ||
                                  "NOT STARTED"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {totalScore !== undefined
                                ? `${totalScore} / ${maxScore}`
                                : isResultPending
                                  ? `0 / ${totalTestMarks}`
                                  : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {passed !== undefined ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    passed
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : "bg-red-500/15 text-red-500"
                                  }
                                >
                                  {passed ? "Passed" : "Failed"}
                                </Badge>
                              ) : isResultPending ? (
                                <Badge
                                  variant="outline"
                                  className="bg-sky-500/10 text-sky-600 border-sky-500/20"
                                >
                                  Pending
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={riskColor}>
                                {risk}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {candidate.violationCount || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {isResultPending ? (
                                <span className="inline-flex h-8 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
                                  Result yet to be declared
                                </span>
                              ) : (
                                <div className="flex flex-wrap justify-end items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/10 font-semibold"
                                    onClick={() =>
                                      handleOpenAdvancedReport(candidate)
                                    }
                                    title="View advanced submissions, telemetry, and violations"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Advanced
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 font-semibold"
                                    onClick={() =>
                                      downloadScorecard(
                                        scoreData.sessionId,
                                        candidate.candidateName,
                                      )
                                    }
                                    title="Download normal scorecard PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Normal
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/10 font-semibold"
                                    onClick={() =>
                                      downloadAdvancedReport(candidate)
                                    }
                                    title="Download advanced proctoring and submissions PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Advanced
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Test Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test "
              <span className="font-semibold text-foreground">
                {test.title}
              </span>
              " and remove it from our servers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Question Confirmation Dialog */}
      <AlertDialog
        open={deleteQuestionDialogOpen}
        onOpenChange={setDeleteQuestionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "
              <span className="font-semibold text-foreground">
                {selectedQuestion?.question?.title}
              </span>
              " from this test? This action can be undone by adding the question
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteQuestion}
              disabled={deletingQuestion}
            >
              {deletingQuestion ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog
        open={unsavedChangesDialogOpen}
        onOpenChange={setUnsavedChangesDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this test. Are you sure you want to go
              back without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setUnsavedChangesDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                setUnsavedChangesDialogOpen(false);
                navigate("/admin/tests");
              }}
            >
              Discard & Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Schedule Changes Dialog */}
      <AlertDialog
        open={unsavedScheduleDialogOpen}
        onOpenChange={setUnsavedScheduleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Schedule Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the test schedule. Would you like to
              save them before switching tabs?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setUnsavedScheduleDialogOpen(false);
                setPendingTab(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="border border-destructive bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDiscardScheduleChanges}
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndSwitch}>
              Save & Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advanced Candidate Report Dialog */}
      <Dialog
        open={isAdvancedReportOpen}
        onOpenChange={setIsAdvancedReportOpen}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              Advanced Report: {selectedReportCandidate?.candidateName}
            </DialogTitle>
            <DialogDescription>
              Detailed logs of questions, selected options/submitted code, and
              proctoring metrics.
            </DialogDescription>
          </DialogHeader>

          {loadingAdvancedDetails ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading submission details...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Candidate Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Email
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {selectedReportCandidate?.email}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Test Status
                  </div>
                  <div className="text-sm font-semibold capitalize">
                    {selectedReportCandidate?.testStatus?.replace(/_/g, " ") ||
                      "Not Started"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Final Score
                  </div>
                  <div className="text-sm font-semibold">
                    {selectedReportCandidate &&
                    candidateResults[
                      getReportCandidateKey(selectedReportCandidate)
                    ]?.result?.totalScore !== undefined
                      ? `${candidateResults[getReportCandidateKey(selectedReportCandidate)].result.totalScore} / ${candidateResults[getReportCandidateKey(selectedReportCandidate)].result.maxScore}`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Passed / Failed
                  </div>
                  <div className="text-sm font-semibold">
                    {selectedReportCandidate &&
                    candidateResults[
                      getReportCandidateKey(selectedReportCandidate)
                    ]?.result?.passed !== undefined
                      ? candidateResults[
                          getReportCandidateKey(selectedReportCandidate)
                        ].result.passed
                        ? "PASSED"
                        : "FAILED"
                      : "-"}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="answers" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
                  <TabsTrigger value="answers">
                    Questions & Submissions
                  </TabsTrigger>
                  <TabsTrigger value="proctoring">
                    Proctoring Timeline
                  </TabsTrigger>
                </TabsList>

                {/* Answers Tab */}
                <TabsContent value="answers" className="space-y-4">
                  {candidatePaperSubmissions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No submissions found for this candidate.
                    </div>
                  ) : (
                    candidatePaperSubmissions.map(
                      (item: Record<string, unknown>, idx: number) => {
                        const q = item.question as {
                          id?: string;
                          title?: string;
                          prompt?: string;
                          questionType?: string;
                          type?: string;
                          mcqOptions?: {
                            id: string;
                            text: string;
                            isCorrect: boolean;
                          }[];
                        };
                        const sub = item.submission as {
                          answerText?: string;
                          selectedOptionIds?: string[];
                          questionId?: string;
                        } | null;
                        const isCoding =
                          q.questionType === "CODING" || q.type === "CODING";

                        return (
                          <Card
                            key={q.id}
                            className="border border-slate-200 shadow-sm overflow-hidden"
                          >
                            <CardHeader className="bg-slate-50/50 p-4 border-b">
                              <div className="flex justify-between items-start gap-4">
                                <span className="font-semibold text-sm text-slate-800">
                                  Question {idx + 1}:{" "}
                                  {q.title || "Untitled Question"}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 text-xs"
                                >
                                  {isCoding ? "Coding" : "MCQ"}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                                {q.prompt}
                              </p>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                              {isCoding ? (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-slate-500">
                                    Submitted Source Code:
                                  </div>
                                  {sub?.answerText ? (
                                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-72">
                                      <code>{sub.answerText}</code>
                                    </pre>
                                  ) : (
                                    <div className="text-sm text-muted-foreground italic">
                                      No code submitted.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-slate-500">
                                    MCQ Options:
                                  </div>
                                  <div className="grid gap-2">
                                    {(q.mcqOptions || []).map(
                                      (opt: {
                                        id: string;
                                        text: string;
                                        isCorrect: boolean;
                                      }) => {
                                        const isSelected =
                                          sub?.answerText?.includes(opt.id) ||
                                          sub?.answerText?.includes(opt.text);
                                        const isCorrect = opt.isCorrect;

                                        let optionStyle =
                                          "border-slate-200 bg-white";
                                        if (isSelected && isCorrect)
                                          optionStyle =
                                            "border-emerald-500 bg-emerald-500/5 text-emerald-700";
                                        else if (isSelected && !isCorrect)
                                          optionStyle =
                                            "border-red-500 bg-red-500/5 text-red-700";
                                        else if (!isSelected && isCorrect)
                                          optionStyle =
                                            "border-emerald-200 bg-emerald-50/20 text-emerald-600";

                                        return (
                                          <div
                                            key={opt.id}
                                            className={`p-3 border rounded-lg text-sm flex items-center justify-between ${optionStyle}`}
                                          >
                                            <span>{opt.text}</span>
                                            <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
                                              {isSelected && (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-primary/10 text-primary border-primary/20"
                                                >
                                                  Selected
                                                </Badge>
                                              )}
                                              {isCorrect && (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                >
                                                  Correct Answer
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      },
                    )
                  )}
                </TabsContent>

                {/* Proctoring Tab */}
                <TabsContent value="proctoring" className="space-y-4">
                  {/* System & Device Specs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-slate-50/50">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        IP Address
                      </div>
                      <div className="text-sm font-semibold">
                        {reportCandidateDetails?.systemInfo?.ipAddress || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Browser / OS
                      </div>
                      <div className="text-sm font-semibold truncate">
                        {reportCandidateDetails?.systemInfo?.browser ||
                          "Chrome"}{" "}
                        / {reportCandidateDetails?.systemInfo?.os || "Windows"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Fullscreen Violations
                      </div>
                      <div className="text-sm font-semibold">
                        {reportCandidateDetails?.systemInfo
                          ?.fullscreenViolations ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Total Warnings
                      </div>
                      <div className="text-sm font-semibold">
                        {selectedReportCandidate?.violationCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Violation Timeline */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-800">
                      Violation Records
                    </h3>
                    {!reportCandidateDetails?.violations ||
                    reportCandidateDetails.violations.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic">
                        No proctoring violations recorded for this session.
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reportCandidateDetails.violations.map(
                              (v: ReportViolation) => {
                                let sevColor = "bg-slate-100 text-slate-700";
                                if (
                                  v.severity === "CRITICAL" ||
                                  v.severity === "HIGH"
                                )
                                  sevColor = "bg-red-500/10 text-red-500";
                                else if (v.severity === "MEDIUM")
                                  sevColor = "bg-amber-500/10 text-amber-500";

                                return (
                                  <TableRow key={v.id}>
                                    <TableCell className="text-xs whitespace-nowrap">
                                      {new Date(
                                        v.occurredAt || v.time,
                                      ).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="text-xs font-semibold">
                                      {v.eventType?.replace(/_/g, " ")}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={sevColor}
                                      >
                                        {v.severity}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {v.description || "Violation triggered"}
                                    </TableCell>
                                  </TableRow>
                                );
                              },
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Snapshot / Evidence Captures */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-800">
                      Snapshot Evidence
                    </h3>
                    {!reportCandidateDetails?.evidence ||
                    reportCandidateDetails.evidence.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic">
                        No image evidence collected.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {reportCandidateDetails.evidence.map(
                          (img: ReportEvidence) => (
                            <div
                              key={img.id}
                              className="border rounded-lg overflow-hidden bg-muted/20"
                            >
                              <img
                                src={img.imageData || img.imageUrl}
                                alt="Proctor Capture"
                                className="w-full h-32 object-cover"
                              />
                              <div className="p-2 text-[10px] text-muted-foreground">
                                <div>{img.snapshotType || "VIOLATION"}</div>
                                <div>
                                  {new Date(
                                    img.capturedAt,
                                  ).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsAdvancedReportOpen(false)}>
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedSchedule && (
        <>
          <AddCandidatesModal
            open={isAddCandidatesOpen}
            onOpenChange={setIsAddCandidatesOpen}
            scheduleId={selectedSchedule}
            alreadyInvitedIds={alreadyInvitedCandidateIds}
            testTitle={test?.title || "Assessment"}
            organisationName={adminOrgName}
            onSuccess={() => {
              // Trigger reload in table
              setInvitations((prev) => [...prev]);
            }}
          />

          <BulkInviteModal
            open={isBulkInviteOpen}
            onOpenChange={setIsBulkInviteOpen}
            scheduleId={selectedSchedule}
            onSuccess={() => {
              // Trigger reload in table
              setInvitations((prev) => [...prev]);
            }}
          />
        </>
      )}

      <TestCandidatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        test={test}
        questions={questionsData}
      />
    </div>
  );
}
