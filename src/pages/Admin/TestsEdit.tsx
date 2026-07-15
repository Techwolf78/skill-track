import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
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
  RefreshCw,
  Eye,
} from "lucide-react";
import { testService, Test, CreateTestRequest, TestQuestion, Question, ProctoringMode, TestScheduleExtended } from "@/lib/test-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// jspdf-autotable attaches lastAutoTable at runtime; augment jsPDF here
type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { MaterialDatePickerDialog, MaterialTimePickerDialog } from "@/components/ui/material-pickers";

interface CandidateInvitation {
  id: string;
  scheduleId?: string;
  candidateId?: string;
  status?: string;
  token?: string;
}

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
  question?: Question & { type?: string; avgTimeSeconds?: number; avg_time_seconds?: number; options?: any[] };
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
  const [questionsData, setQuestionsData] = useState<EnrichedTestQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<EnrichedTestQuestion | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam) return tabParam;
    return location.state?.activeTab || "details";
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state, location.search]);

  // Invitation states
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [inviteTab, setInviteTab] = useState<"available" | "invited" | "all">("available");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [selectedScheduleData, setSelectedScheduleData] = useState<TestScheduleExtended | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
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

  // Form state
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
  const [unsavedScheduleDialogOpen, setUnsavedScheduleDialogOpen] = useState(false);
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
  const [reportCandidates, setReportCandidates] = useState<ReportCandidate[]>([]);
  const [reportSchedules, setReportSchedules] = useState<TestScheduleExtended[]>([]);
  const [candidateResults, setCandidateResults] = useState<Record<string, CandidateResultEntry>>({});
  const [selectedReportCandidate, setSelectedReportCandidate] = useState<ReportCandidate | null>(null);
  const [reportCandidateDetails, setReportCandidateDetails] = useState<ReportCandidateDetails | null>(null);
  const [loadingAdvancedDetails, setLoadingAdvancedDetails] = useState(false);
  const [candidatePaperSubmissions, setCandidatePaperSubmissions] = useState<Record<string, unknown>[]>([]);
  const [isAdvancedReportOpen, setIsAdvancedReportOpen] = useState(false);

  const displayedCandidates = useMemo(() => {
    // Only show candidates who actually appeared (status is not NOT_STARTED)
    const appeared = reportCandidates.filter(
      (c) => c.testStatus && c.testStatus !== "NOT_STARTED"
    );

    if (!reportScheduleId || reportScheduleId === "all") {
      return appeared;
    }
    return appeared.filter((c) => c.scheduleId === reportScheduleId);
  }, [reportCandidates, reportScheduleId]);

  const getReportCandidateKey = (candidate: Pick<ReportCandidate, "candidateId" | "scheduleId">) =>
    `${candidate.scheduleId || "no-schedule"}:${candidate.candidateId}`;

  const totalTestMarks = useMemo(() => {
    const mappedQuestions = questionsData.length > 0
      ? questionsData
      : test?.testQuestions || test?.questions || [];

    return mappedQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);
  }, [questionsData, test]);

  const isScheduleDirty = useMemo(() => {
    if (!test) return false;

    const getLocalISOTime = (isoString?: string) => {
      if (!isoString) return "";
      return isoString.slice(0, 16);
    };

    const testSchedules = test.testSchedules || [];
    const activeOrFirst = testSchedules.find((s) => s.status === "SCHEDULED" || s.status === "LIVE") || testSchedules[0];
    const originalStart = getLocalISOTime(activeOrFirst?.startTime);
    const originalEnd = getLocalISOTime(activeOrFirst?.endTime);

    // Fall back to selectedScheduleData if available
    const currentOrigStart = selectedScheduleData?.startTime ? getLocalISOTime(selectedScheduleData.startTime) : originalStart;
    const currentOrigEnd = selectedScheduleData?.endTime ? getLocalISOTime(selectedScheduleData.endTime) : originalEnd;

    return scheduleStartTime !== currentOrigStart || scheduleEndTime !== currentOrigEnd;
  }, [test, selectedScheduleData, scheduleStartTime, scheduleEndTime]);

  const isFormDirty = useMemo(() => {
    if (!test) return false;
    if (formData.title !== test.title) return true;
    if ((formData.description || "") !== (test.description || "")) return true;
    if (formData.durationMins !== test.durationMins) return true;
    if (formData.difficulty !== test.difficulty) return true;
    if (formData.passMark !== test.passMark) return true;
    if (formData.status !== test.status) return true;
    if ((formData.proctoringMode || "NONE") !== (test.proctoringMode || "NONE")) return true;
    
    // Check instructions general text
    const currentGeneral = (formData.instructions as Record<string, unknown> | undefined)?.general || "";
    const originalGeneral = (test.instructions as Record<string, unknown> | undefined)?.general || DEFAULT_TEST_INSTRUCTIONS;
    if (currentGeneral !== originalGeneral) return true;

    // Check schedule times
    if (isScheduleDirty) return true;

    // Proctoring settings
    if ((formData.enableTabSwitchTracking || false) !== (test.enableTabSwitchTracking || false)) return true;
    if ((formData.blockCopyPaste || false) !== (test.blockCopyPaste || false)) return true;
    if ((formData.blockRightClick || false) !== (test.blockRightClick || false)) return true;
    if ((formData.warnOnFullscreenExit || false) !== (test.warnOnFullscreenExit || false)) return true;
    if ((formData.maxWarnings || 0) !== (test.maxWarnings || 0)) return true;
    if ((formData.requireWebcam || false) !== (test.requireWebcam || false)) return true;
    if ((formData.detectFaceNotVisible || false) !== (test.detectFaceNotVisible || false)) return true;
    if ((formData.detectMultipleFaces || false) !== (test.detectMultipleFaces || false)) return true;
    if ((formData.detectSuspiciousAudio || false) !== (test.detectSuspiciousAudio || false)) return true;
    if ((formData.detectObjects || false) !== (test.detectObjects || false)) return true;
    if ((formData.periodicSnapshots || false) !== (test.periodicSnapshots || false)) return true;
    if ((formData.evidenceCapture || false) !== (test.evidenceCapture || false)) return true;
    if ((formData.requireMicrophone || false) !== (test.requireMicrophone || false)) return true;
    if ((formData.requireScreenShare || false) !== (test.requireScreenShare || false)) return true;
    if ((formData.detectDevTools || false) !== (test.detectDevTools || false)) return true;
    if ((formData.detectScreenShareStop || false) !== (test.detectScreenShareStop || false)) return true;
    if ((formData.enableLiveProctoring || false) !== (test.enableLiveProctoring || false)) return true;
    if ((formData.autoSubmitOnCriticalViolations || false) !== (test.autoSubmitOnCriticalViolations || false)) return true;
    if ((formData.maxCriticalViolations || 0) !== (test.maxCriticalViolations || 0)) return true;

    return false;
  }, [formData, test, isScheduleDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
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

      // Populate form with test data
      setFormData({
        title: data.title,
        description: data.description || "",
        durationMins: data.durationMins,
        difficulty: data.difficulty,
        passMark: data.passMark,
        status: data.status,
        instructions: (() => {
          const general = (data.instructions?.general as string || "").trim();
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
        enableTabSwitchTracking: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.enableTabSwitchTracking || false) : getProctoringPreset(data.proctoringMode || "NONE").enableTabSwitchTracking,
        blockCopyPaste: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.blockCopyPaste || false) : getProctoringPreset(data.proctoringMode || "NONE").blockCopyPaste,
        blockRightClick: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.blockRightClick || false) : getProctoringPreset(data.proctoringMode || "NONE").blockRightClick,
        warnOnFullscreenExit: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.warnOnFullscreenExit || false) : getProctoringPreset(data.proctoringMode || "NONE").warnOnFullscreenExit,
        maxWarnings: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.maxWarnings || 0) : getProctoringPreset(data.proctoringMode || "NONE").maxWarnings,
        requireWebcam: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.requireWebcam || false) : getProctoringPreset(data.proctoringMode || "NONE").requireWebcam,
        detectFaceNotVisible: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.detectFaceNotVisible || false) : getProctoringPreset(data.proctoringMode || "NONE").detectFaceNotVisible,
        detectMultipleFaces: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.detectMultipleFaces || false) : getProctoringPreset(data.proctoringMode || "NONE").detectMultipleFaces,
        detectSuspiciousAudio: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.detectSuspiciousAudio || false) : getProctoringPreset(data.proctoringMode || "NONE").detectSuspiciousAudio,
        detectObjects: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.detectObjects || false) : getProctoringPreset(data.proctoringMode || "NONE").detectObjects,
        periodicSnapshots: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.periodicSnapshots || false) : getProctoringPreset(data.proctoringMode || "NONE").periodicSnapshots,
        evidenceCapture: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.evidenceCapture || false) : getProctoringPreset(data.proctoringMode || "NONE").evidenceCapture,
        requireMicrophone: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.requireMicrophone || false) : getProctoringPreset(data.proctoringMode || "NONE").requireMicrophone,
        requireScreenShare: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.requireScreenShare || false) : getProctoringPreset(data.proctoringMode || "NONE").requireScreenShare,
        detectDevTools: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.detectDevTools || false) : getProctoringPreset(data.proctoringMode || "NONE").detectDevTools,
        detectScreenShareStop: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.detectScreenShareStop || false) : getProctoringPreset(data.proctoringMode || "NONE").detectScreenShareStop,
        enableLiveProctoring: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.enableLiveProctoring || false) : getProctoringPreset(data.proctoringMode || "NONE").enableLiveProctoring,
        autoSubmitOnCriticalViolations: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.autoSubmitOnCriticalViolations || false) : getProctoringPreset(data.proctoringMode || "NONE").autoSubmitOnCriticalViolations,
        maxCriticalViolations: (data.proctoringMode || "NONE") === "CUSTOM" ? (data.maxCriticalViolations || 0) : getProctoringPreset(data.proctoringMode || "NONE").maxCriticalViolations,
      });
    } catch (error: unknown) {
      console.error("Failed to fetch test:", error);
      navigate("/admin/tests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

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
      console.error("Validation Error: Duration must be greater than 0 minutes.");
      return;
    }

    if (
      formData.passMark &&
      (formData.passMark < 0 || formData.passMark > 100)
    ) {
      console.error("Validation Error: Passing mark must be between 0 and 100.");
      return;
    }

    if (scheduleStartTime && scheduleEndTime) {
      const startDate = new Date(scheduleStartTime);
      const endDate = new Date(scheduleEndTime);
      if (endDate <= startDate) {
        console.error("Validation Error: Schedule end time must be after start time.");
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
        autoSubmitOnCriticalViolations: formData.autoSubmitOnCriticalViolations || false,
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
      console.error("Validation Error: Duration must be greater than 0 minutes.");
      return;
    }
    if (formData.passMark && (formData.passMark < 0 || formData.passMark > 100)) {
      console.error("Validation Error: Passing mark must be between 0 and 100.");
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
        autoSubmitOnCriticalViolations: formData.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: formData.maxCriticalViolations || 0,
      });
      // Sync local test state so dirty-check resets
      setTest((prev) => prev ? { ...prev, title: formData.title!, description: formData.description, durationMins: formData.durationMins!, difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD", passMark: formData.passMark!, status: formData.status as "DRAFT" | "PUBLISHED" | "ARCHIVED", instructions: formData.instructions } : prev);
      toast({ title: "Saved", description: "Basic information saved successfully." });
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
        autoSubmitOnCriticalViolations: formData.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: formData.maxCriticalViolations || 0,
      };

      console.log("[Admin/TestsEdit] Saving proctoring settings. Payload:", payload);
      const res = await testService.updateTest(id!, payload);
      console.log("[Admin/TestsEdit] Save proctoring response:", res);

      // Sync local test state so dirty-check resets
      setTest((prev) => prev ? {
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
        autoSubmitOnCriticalViolations: formData.autoSubmitOnCriticalViolations,
        maxCriticalViolations: formData.maxCriticalViolations,
      } : prev);
      toast({ title: "Saved", description: "Proctoring settings saved successfully." });
    } catch (error: unknown) {
      console.error("[Admin/TestsEdit] Failed to save proctoring:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleStartTime || !scheduleEndTime) {
      console.error("Validation Error: Both start time and end time are required.");
      return false;
    }

    const startDate = new Date(scheduleStartTime);
    const endDate = new Date(scheduleEndTime);
    if (endDate <= startDate) {
      console.error("Validation Error: Schedule end time must be after start time.");
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
      setTest(prev => {
        if (!prev) return prev;
        const testSchedules = prev.testSchedules || [];
        const activeOrFirst = testSchedules.find((s) => s.status === "SCHEDULED" || s.status === "LIVE") || testSchedules[0];
        
        let newSchedules;
        if (activeOrFirst) {
          newSchedules = testSchedules.map(s => s.id === activeOrFirst.id ? { ...s, startTime: startISO, endTime: endISO } : s);
        } else {
          newSchedules = [...testSchedules, { id: selectedSchedule || "new-id", startTime: startISO, endTime: endISO } as unknown as TestScheduleExtended];
        }
        
        return {
          ...prev,
          testSchedules: newSchedules
        };
      });

      // Refresh invitation/schedule data (does not trigger full screen loader)
      await fetchInvitationsData();
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
      setActiveTab(value);
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
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setUnsavedScheduleDialogOpen(false);
  };

  const handleSaveAndSwitch = async () => {
    const success = await handleSaveSchedule();
    if (success && pendingTab) {
      setActiveTab(pendingTab);
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
      console.log("[Admin/TestsEdit] Initiating API call to remove question with mapping ID:", selectedQuestion.id);
      // Call API to remove question from test
      await testService.removeQuestionFromTest(selectedQuestion.id);
      console.log("[Admin/TestsEdit] API call succeeded. Question with ID:", selectedQuestion.id, "successfully removed from backend.");

      // Optimistically remove from local state immediately (no full reload)
      const removedId = selectedQuestion.id;
      setQuestionsData((prev) => prev.filter((q) => q.id !== removedId));

      // Also update test.questions count in memory
      setTest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: (prev.questions || []).filter(
            (q) => q.questionId !== selectedQuestion.questionId
          ),
          testQuestions: (prev.testQuestions || []).filter(
            (q) => q.id !== removedId
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

  const fetchInvitationsData = useCallback(async () => {
    try {
      setLoadingInvitations(true);
      const [schedulesData, candidatesData] = await Promise.all([
        testService.getAllTestSchedules(),
        candidateService.getCandidates(),
      ]);

      // Filter schedules to only keep the ones for THIS test
      const testSchedules = schedulesData.filter((s) => s.testId === id);
      
      // Auto-select the first schedule if available
      if (testSchedules.length > 0) {
        const activeOrFirst = testSchedules.find((s) => s.status === "SCHEDULED" || s.status === "LIVE") || testSchedules[0];
        setSelectedSchedule(activeOrFirst.id);
        setSelectedScheduleData(activeOrFirst);
        if (activeOrFirst.startTime) {
          setScheduleStartTime(activeOrFirst.startTime.slice(0, 16));
        }
        if (activeOrFirst.endTime) {
          setScheduleEndTime(activeOrFirst.endTime.slice(0, 16));
        }
      } else {
        setSelectedSchedule("");
        setSelectedScheduleData(null);
        setScheduleStartTime("");
        setScheduleEndTime("");
      }

      setCandidates(candidatesData);

      try {
        const response = await apiClient.get("/candidate-invitations?size=1000");
        const invData = response.data?.data;
        if (Array.isArray(invData)) {
          setInvitations(invData);
        } else if (invData && typeof invData === "object" && "content" in invData && Array.isArray((invData as Record<string, unknown>).content)) {
          setInvitations((invData as Record<string, unknown>).content as CandidateInvitation[]);
        } else {
          setInvitations([]);
        }
      } catch (error) {
        console.log("No invitations data yet");
      }
    } catch (error) {
      console.error("Failed to fetch invitation data:", error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchInvitationsData();
    }
  }, [id, fetchInvitationsData]);

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
            const res = await apiClient.get(`/api/admin/proctoring/assessment-schedules/${s.id}/candidates`);
            const list = res.data?.data || res.data || [];
            return list.map((c: ReportCandidate) => ({ ...c, scheduleId: s.id }));
          } catch {
            return [];
          }
        })
      );
      
      const candidatesList = candidatesLists.flat();
      setReportCandidates(candidatesList);

      const resultsMap: Record<string, CandidateResultEntry> = {};
      await Promise.allSettled(
        candidatesList.map(async (c: ReportCandidate) => {
          try {
            const detailRes = await apiClient.get(
              `/api/admin/proctoring/candidates/${c.candidateId}/details?scheduleId=${c.scheduleId}`
            );
            const detail = detailRes.data?.data || detailRes.data;
            const sessionId = detail?.systemInfo?.sessionId;
            
            if (sessionId) {
              const resultRes = await apiClient.get(`/test-results/session/${sessionId}`);
              const result = resultRes.data?.data || resultRes.data;
              resultsMap[getReportCandidateKey(c)] = {
                sessionId,
                detail,
                scheduleId: c.scheduleId,
                result: result && result.id ? result : null
              };
            } else {
              resultsMap[getReportCandidateKey(c)] = {
                detail,
                scheduleId: c.scheduleId,
                result: null
              };
            }
          } catch (err) {
            console.warn(`Failed to load details/result for candidate ${c.candidateId}:`, err);
          }
        })
      );
      setCandidateResults(resultsMap);
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoadingReports(false);
    }
  }, [id, toast]);

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
          apiClient.get(`/test-sessions/${sessionId}/resume`)
        ]);

        const paperData = paperRes.data?.data || paperRes.data;
        const resumeData = resumeRes.data?.data || resumeRes.data;

        const questionsList = paperData?.paper?.questions || [];
        const submissionsList = resumeData?.submissions || [];

        const mappedSubmissions = questionsList.map((q: Record<string, unknown>) => {
          const questionId = (q.sourceQuestionId || q.id) as string;
          const submission = submissionsList.find((s: Record<string, unknown>) => s.questionId === questionId);
          
          const normalizedQuestion = {
            id: questionId,
            prompt: q.prompt,
            title: (q.coding as { title?: string } | undefined)?.title || (q.prompt as string | undefined) || "Question",
            questionType: q.type,
            type: q.type,
            mcqOptions: q.options || q.mcqOptions || []
          };

          return {
            question: normalizedQuestion,
            submission: submission || null
          };
        });
        setCandidatePaperSubmissions(mappedSubmissions);
      }
    } catch (err) {
      console.error("Failed to load advanced report details:", err);
    } finally {
      setLoadingAdvancedDetails(false);
    }
  };

  const downloadScorecard = async (sessionId: string, candidateName: string) => {
    try {
      toast({
        title: "Downloading Scorecard",
        description: "Please wait while we generate the PDF scorecard...",
      });
      const response = await apiClient.get(`/test-results/session/${sessionId}/scorecard`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Scorecard_${candidateName.replace(/\s+/g, "_")}.pdf`);
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

  const downloadAdvancedReport = async (candidate: { candidateId: string; candidateName: string; email: string; testStatus?: string; violationCount?: number; scheduleId?: string }) => {
    try {
      toast({
        title: "Generating Advanced PDF",
        description: "Compiling telemetry into a premium PDF report...",
      });

      const scoreData = candidateResults[getReportCandidateKey(candidate)];
      if (!scoreData?.sessionId) {
        console.error("Download Failed: No active session found to build advanced report.");
        return;
      }

      const detailRes = await apiClient.get(
        `/api/admin/proctoring/candidates/${candidate.candidateId}/details?scheduleId=${candidate.scheduleId || reportScheduleId}`
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

      const scoreText = scoreData?.result?.totalScore !== undefined
        ? `${scoreData.result.totalScore} / ${scoreData.result.maxScore}`
        : "N/A";
      const passText = scoreData?.result?.passed !== undefined
        ? (scoreData.result.passed ? "PASSED" : "FAILED")
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
        head: [[{ content: 'CANDIDATE METADATA & SESSION INFORMATION', colSpan: 4, styles: { halign: 'left', fillColor: [30, 41, 59], fontStyle: 'bold' } }]],
        body: [
          [
            { content: 'Candidate Name:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            candidate.candidateName,
            { content: 'Final Score:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            { content: `${scoreText} (${passText})`, styles: { fontStyle: 'bold', textColor: scoreData?.result?.passed ? [16, 185, 129] : [239, 68, 68] } }
          ],
          [
            { content: 'Email Address:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            candidate.email,
            { content: 'Proctoring Risk:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            { content: detailData?.riskLevel || 'NONE', styles: { fontStyle: 'bold', textColor: (detailData?.riskLevel === 'CRITICAL' || detailData?.riskLevel === 'HIGH') ? [239, 68, 68] : [16, 185, 129] } }
          ],
          [
            { content: 'Session Status:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            (candidate.testStatus || 'N/A').replace(/_/g, ' '),
            { content: 'Total Violations:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            { content: String(candidate.violationCount || 0), styles: { fontStyle: 'bold', textColor: (candidate.violationCount || 0) > 0 ? [239, 68, 68] : [100, 116, 139] } }
          ],
          [
            { content: 'IP Address:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            detailData?.systemInfo?.ipAddress || 'N/A',
            { content: 'Browser / OS:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            `${detailData?.systemInfo?.browser || 'Chrome'} / ${detailData?.systemInfo?.os || 'Windows'}`
          ]
        ],
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 4.5, lineColor: [100, 116, 139], lineWidth: 0.5 }
      });

      // Warnings Timeline Table
      const violations = detailData?.violations || [];
      const violationsBody = violations.map((v: { eventId?: string; id?: string; occurredAt?: string; time?: string; eventType?: string; severity?: string; metadata?: { description?: string }; description?: string }) => [
        new Date(v.occurredAt || v.time || '').toLocaleTimeString(),
        (v.eventType || '').replace(/_/g, ' '),
        v.severity || 'INFO',
        v.metadata?.description || v.description || 'Violation logged'
      ]);

      autoTable(doc, {
        startY: (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8,
        margin: { left: 14, right: 14 },
        head: [
          [{ content: 'PROCTORING WARNINGS TIMELINE', colSpan: 4, styles: { halign: 'left', fillColor: [30, 41, 59], fontStyle: 'bold' } }],
          ['Time', 'Event Type', 'Severity', 'Description']
        ],
        body: violationsBody.length > 0 ? violationsBody : [['-', 'No proctoring violations recorded during this session.', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, lineColor: [100, 116, 139], lineWidth: 0.5 }
      });

      // Section Separator Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59); // Slate header
      doc.text("QUESTIONS & SUBMISSIONS DETAILS", 14, (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10);

      // Question Cards using autoTables
      questionsList.forEach((q: { id: string; sourceQuestionId?: string; prompt?: string; type?: string; coding?: { title?: string }; options?: Array<{ id: string; text: string; isCorrect: boolean }>; mcqOptions?: Array<{ id: string; text: string; isCorrect: boolean }> }, idx: number) => {
        const questionId = q.sourceQuestionId || q.id;
        const sub = submissionsList.find((s: { questionId: string; answerText?: string; selectedOptionIds?: string[] }) => s.questionId === questionId);
        const isCoding = q.type === "CODING";

        // Build exact selected ID set
        let selectedIds = new Set<string>();
        if (sub?.selectedOptionIds && Array.isArray(sub.selectedOptionIds)) {
          selectedIds = new Set(sub.selectedOptionIds.map(String));
        } else if (sub?.answerText) {
          try {
            const parsed = JSON.parse(sub.answerText);
            if (Array.isArray(parsed)) parsed.forEach((id: string) => selectedIds.add(String(id)));
          } catch { /* raw text */ }
        }

        // Fetch true correct options list
        const enrichedTQ = questionsData.find(tq => tq.questionId === questionId);
        const enrichedQuestion = enrichedTQ?.question;
        const correctOptions = enrichedQuestion?.options || enrichedQuestion?.mcqOptions || [];

        // Calculate time spent telemetry
        const timeItem = timingsList.find((t: { questionId: string }) => t.questionId === questionId);
        const activeSeconds = timeItem?.activeSeconds || 0;
        const minutes = Math.floor(activeSeconds / 60);
        const seconds = activeSeconds % 60;
        const timeSpentText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        // Build structured body rows
        const bodyRows: any[] = [
          [{ content: `Question:\n${q.prompt || ""}`, colSpan: 3, styles: { textColor: [15, 23, 42], fontStyle: 'bold', fillColor: [248, 250, 252], fontSize: 9 } }]
        ];

        if (isCoding) {
          bodyRows.push([{
            content: `Submitted Code:\n${sub?.answerText || "No submission"}`,
            colSpan: 3,
            styles: { fontStyle: 'normal', fillColor: [248, 250, 252], textColor: [15, 23, 42] }
          }]);
        } else {
          const optionsList = q.options || q.mcqOptions || [];
          optionsList.forEach((opt: { id: string; text: string; isCorrect: boolean }, oIdx: number) => {
            const optionLetter = String.fromCharCode(65 + oIdx);
            const correctOpt = correctOptions.find(co => co.id === opt.id || co.text === opt.text);
            const isOptionCorrect = correctOpt ? correctOpt.isCorrect : opt.isCorrect;
            const isSelected = selectedIds.has(opt.id);

            const statusLabel = isSelected && isOptionCorrect
              ? "[SELECTED & CORRECT]"
              : isSelected
                ? "[SELECTED - INCORRECT]"
                : isOptionCorrect
                  ? "[CORRECT ANSWER]"
                  : "";

            const rowText = `${optionLetter}. ${opt.text} ${statusLabel}`.trim();

            let cellStyle = { textColor: [30, 41, 59], fontStyle: 'normal', fillColor: [255, 255, 255] };
            if (isSelected && isOptionCorrect) {
              cellStyle = { textColor: [16, 185, 129], fontStyle: 'bold', fillColor: [240, 253, 250] }; // matrix green bg/fg
            } else if (isSelected) {
              cellStyle = { textColor: [239, 68, 68], fontStyle: 'bold', fillColor: [254, 242, 242] }; // soft red bg/fg
            } else if (isOptionCorrect) {
              cellStyle = { textColor: [16, 185, 129], fontStyle: 'bold', fillColor: [255, 255, 255] }; // correct option marker
            }

            bodyRows.push([{ content: rowText, colSpan: 3, styles: cellStyle }]);
          });
        }

        autoTable(doc, {
          pageBreak: 'avoid', // Keep entire card grouped to prevent hanging rows
          startY: idx === 0 ? (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 16 : (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 12,
          margin: { left: 14, right: 14 },
          head: [[
            { content: `Q${idx + 1}`, styles: { halign: 'center', fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: [100, 116, 139], lineWidth: 0.5 } },
            { content: "", styles: { fillColor: [255, 255, 255], lineWidth: 0 } },
            { content: "", styles: { fillColor: [255, 255, 255], lineWidth: 0 } }
          ]],
          body: bodyRows,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 4.5, lineColor: [100, 116, 139], lineWidth: 0.5 },
          columnStyles: {
            0: { cellWidth: 15 }, // Q1, Q2 etc.
            1: { cellWidth: 42 }, // Time Spent box (slightly wider to fit slant nicely)
            2: { cellWidth: 125 } // Empty space on the right
          },
          didDrawCell: (data) => {
            if (data.row.section === 'head' && data.column.index === 1) {
              const cell = data.cell;
              const h = cell.height;
              
              // Draw custom 45-degree slanted polygon using two triangles for universal jsPDF support
              doc.setFillColor(30, 41, 59);
              doc.setDrawColor(30, 41, 59); // Match draw color to fill color to hide diagonal seam
              doc.triangle(cell.x, cell.y, cell.x + cell.width - h, cell.y, cell.x, cell.y + h, 'FD');
              doc.triangle(cell.x + cell.width - h, cell.y, cell.x + cell.width, cell.y + h, cell.x, cell.y + h, 'FD');
              
              // Draw slate borders around the slanted cell
              doc.setDrawColor(100, 116, 139);
              doc.setLineWidth(0.5);
              doc.line(cell.x, cell.y, cell.x, cell.y + h); // left vertical
              doc.line(cell.x, cell.y + h, cell.x + cell.width, cell.y + h); // bottom horizontal
              doc.line(cell.x, cell.y, cell.x + cell.width - h, cell.y); // top horizontal
              doc.line(cell.x + cell.width - h, cell.y, cell.x + cell.width, cell.y + h); // slanted right edge
              
              // Draw text centered within the shape
              doc.setTextColor(255, 255, 255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.text(`Time Spent: ${timeSpentText}`, cell.x + 2, cell.y + (h / 2) + 1.5);
            }
          }
        });
      });

      // Save PDF directly to user's downloads folder
      doc.save(`Advanced_Report_${candidate.candidateName.replace(/\s+/g, "_")}.pdf`);

      toast({
        title: "Download Successful",
        description: "Advanced PDF report downloaded directly.",
      });
    } catch (err) {
      console.error("Failed to download advanced report:", err);
    }
  };

  const handleInvite = async () => {
    if (!selectedSchedule) {
      console.error("Error: Please create a schedule for this test first.");
      return;
    }

    if (!selectedCandidate) {
      console.error("Error: No candidate selected");
      return;
    }

    setInviteSubmitting(true);
    try {
      const response = await apiClient.post("/candidate-invitations", {
        scheduleId: selectedSchedule,
        candidateId: selectedCandidate.id,
      });

      console.log("Invitation created successfully. Response:", response.data);

      toast({
        title: "Success",
        description: `Invitation sent to ${selectedCandidate.user.name}`,
      });
      setIsInviteDialogOpen(false);
      setSelectedCandidate(null);
      fetchInvitationsData();
    } catch (error) {
      console.error("Failed to send invitation:", error);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!selectedSchedule) {
      console.error("Error: Please create a schedule for this test first.");
      return;
    }

    if (selectedCandidates.length === 0) {
      console.error("Error: No candidates selected");
      return;
    }

    setInviteSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const candidateId of selectedCandidates) {
        try {
          await apiClient.post("/candidate-invitations", {
            scheduleId: selectedSchedule,
            candidateId: candidateId,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to invite candidate ${candidateId}:`, err);
          failCount++;
        }
      }

      toast({
        title: "Bulk Invitation Complete",
        description: `Successfully invited ${successCount} candidates. ${failCount > 0 ? `${failCount} failed.` : ""}`,
      });

      setSelectedCandidates([]);
      fetchInvitationsData();
    } catch (error) {
      console.error("Bulk invitation error:", error);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const copyTestLink = (invitationId: string) => {
    const baseUrl = window.location.origin;
    const testUrl = `${baseUrl}/test/access/${invitationId}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedToken(invitationId);
    toast({
      title: "Link Copied!",
      description: "Test URL copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getInvitationForCandidate = (candidateId: string, scheduleId: string) => {
    return invitations.find(
      (i) => i.candidateId === candidateId && i.scheduleId === scheduleId,
    ) || null;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case "EXPIRED":
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-yellow-500" />;
    }
  };

  const getInvitationStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-xs">
            Accepted
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600 text-xs">
            Expired
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 text-xs">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status.toLowerCase()}
          </Badge>
        );
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const name = candidate.user?.name || "";
      const email = candidate.user?.email || "";
      const invitation = selectedSchedule
        ? getInvitationForCandidate(candidate.id, selectedSchedule)
        : null;
      const matchesSearch =
        name.toLowerCase().includes(inviteSearchTerm.toLowerCase()) ||
        email.toLowerCase().includes(inviteSearchTerm.toLowerCase());
      const matchesTab =
        inviteTab === "all" ||
        (inviteTab === "available" && !invitation) ||
        (inviteTab === "invited" && !!invitation);
      return matchesSearch && matchesTab;
    });
  }, [candidates, inviteSearchTerm, inviteTab, invitations, selectedSchedule]);

  const inviteCounts = useMemo(() => {
    if (!selectedSchedule) {
      return {
        available: candidates.length,
        invited: 0,
        all: candidates.length,
      };
    }

    const invitedIds = new Set(
      invitations
        .filter((invitation) => invitation.scheduleId === selectedSchedule)
        .map((invitation) => invitation.candidateId)
        .filter(Boolean),
    );

    return {
      available: candidates.filter((candidate) => !invitedIds.has(candidate.id)).length,
      invited: candidates.filter((candidate) => invitedIds.has(candidate.id)).length,
      all: candidates.length,
    };
  }, [candidates, invitations, selectedSchedule]);

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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                    General instructions shown to candidates before starting the test
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <Textarea
                    placeholder="Enter test instructions..."
                    className="flex-1 min-h-[350px] font-sans text-sm resize-none"
                    value={(formData.instructions as Record<string, unknown> | undefined)?.general as string || ""}
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Basic Info</>
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
                            {item.question?.title || item.question?.prompt || "Unknown Question"}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span className="capitalize">
                              {((item.question as unknown as Record<string, unknown> | undefined)?.type as string || item.question?.questionType || "")?.toLowerCase()}
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
                Set the availability window for this test (Organisation is set to your Admin home by default)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Starting Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Starting time</Label>
                  <p className="text-xs text-muted-foreground">This test would not be accessible before this.</p>
                  <div className="flex gap-4 items-center mt-1">
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setStartDatePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 cursor-pointer h-10 select-none"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {scheduleStartTime ? scheduleStartTime.split("T")[0] : "Select Date"}
                        </span>
                      </button>
                      <MaterialDatePickerDialog
                        isOpen={startDatePickerOpen}
                        onClose={() => setStartDatePickerOpen(false)}
                        value={scheduleStartTime ? scheduleStartTime.split("T")[0] : ""}
                        onChange={(date) => {
                          const time = scheduleStartTime && scheduleStartTime.includes("T") ? scheduleStartTime.split("T")[1] : "00:00";
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
                          {scheduleStartTime && scheduleStartTime.includes("T") ? scheduleStartTime.split("T")[1].slice(0, 5) : "Select Time"}
                        </span>
                      </button>
                      <MaterialTimePickerDialog
                        isOpen={startTimePickerOpen}
                        onClose={() => setStartTimePickerOpen(false)}
                        value={scheduleStartTime && scheduleStartTime.includes("T") ? scheduleStartTime.split("T")[1].slice(0, 5) : ""}
                        onChange={(time) => {
                          const date = scheduleStartTime ? scheduleStartTime.split("T")[0] : new Date().toISOString().split("T")[0];
                          setScheduleStartTime(date ? `${date}T${time}` : "");
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Ending Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ending time</Label>
                  <p className="text-xs text-muted-foreground">This test would not be accessible after this.</p>
                  <div className="flex gap-4 items-center mt-1">
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setEndDatePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 cursor-pointer h-10 select-none"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {scheduleEndTime ? scheduleEndTime.split("T")[0] : "Select Date"}
                        </span>
                      </button>
                      <MaterialDatePickerDialog
                        isOpen={endDatePickerOpen}
                        onClose={() => setEndDatePickerOpen(false)}
                        value={scheduleEndTime ? scheduleEndTime.split("T")[0] : ""}
                        onChange={(date) => {
                          const time = scheduleEndTime && scheduleEndTime.includes("T") ? scheduleEndTime.split("T")[1] : "00:00";
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
                          {scheduleEndTime && scheduleEndTime.includes("T") ? scheduleEndTime.split("T")[1].slice(0, 5) : "Select Time"}
                        </span>
                      </button>
                      <MaterialTimePickerDialog
                        isOpen={endTimePickerOpen}
                        onClose={() => setEndTimePickerOpen(false)}
                        value={scheduleEndTime && scheduleEndTime.includes("T") ? scheduleEndTime.split("T")[1].slice(0, 5) : ""}
                        onChange={(time) => {
                          const date = scheduleEndTime ? scheduleEndTime.split("T")[0] : new Date().toISOString().split("T")[0];
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
                        <Checkbox
                          id="enableTabSwitchTracking"
                          checked={formData.enableTabSwitchTracking}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("enableTabSwitchTracking", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="enableTabSwitchTracking"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Enable tab switch tracking
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="blockCopyPaste"
                          checked={formData.blockCopyPaste}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("blockCopyPaste", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="blockCopyPaste"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Block copy/paste
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="blockRightClick"
                          checked={formData.blockRightClick}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("blockRightClick", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
                        <Label
                          htmlFor="blockRightClick"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Block right click
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="warnOnFullscreenExit"
                          checked={formData.warnOnFullscreenExit}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange("warnOnFullscreenExit", !!checked)
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                        />
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
                  {(formData.proctoringMode === "MEDIUM" ||
                    formData.proctoringMode === "HIGH" ||
                    formData.proctoringMode === "CUSTOM") && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Webcam & Audio Monitoring
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireWebcam"
                            checked={formData.requireWebcam}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireWebcam", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="requireWebcam"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Require webcam
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectFaceNotVisible"
                            checked={formData.detectFaceNotVisible}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectFaceNotVisible", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectFaceNotVisible"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect face not visible
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectMultipleFaces"
                            checked={formData.detectMultipleFaces}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectMultipleFaces", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectMultipleFaces"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect multiple faces
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectSuspiciousAudio"
                            checked={formData.detectSuspiciousAudio}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectSuspiciousAudio", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectSuspiciousAudio"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect suspicious audio
                          </Label>
                        </div>



                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="periodicSnapshots"
                            checked={formData.periodicSnapshots}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("periodicSnapshots", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="periodicSnapshots"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Periodic snapshots
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="evidenceCapture"
                            checked={formData.evidenceCapture}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("evidenceCapture", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="evidenceCapture"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Evidence capture
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 3: Advanced Security & Hardware */}
                  {(formData.proctoringMode === "HIGH" ||
                    formData.proctoringMode === "CUSTOM") && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Advanced Security & Hardware
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireMicrophone"
                            checked={formData.requireMicrophone}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireMicrophone", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="requireMicrophone"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Require microphone
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireScreenShare"
                            checked={formData.requireScreenShare}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("requireScreenShare", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="requireScreenShare"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Require screen share
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectDevTools"
                            checked={formData.detectDevTools}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectDevTools", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectDevTools"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect DevTools
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="detectScreenShareStop"
                            checked={formData.detectScreenShareStop}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectScreenShareStop", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectScreenShareStop"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect screen-share stop
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="enableLiveProctoring"
                            checked={formData.enableLiveProctoring}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("enableLiveProctoring", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="enableLiveProctoring"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Enable live proctoring
                          </Label>
                        </div>


                      </div>


                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4 bg-muted/20">
              <Button onClick={handleSaveProctoring} disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save Proctoring Settings</>
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
                  Invite Candidates
                </CardTitle>
                <CardDescription>
                  Invite students or candidates to take this specific assessment
                </CardDescription>
              </div>
              {selectedCandidates.length > 0 && selectedSchedule && (
                <Button
                  onClick={handleBulkInvite}
                  disabled={inviteSubmitting}
                  className="gap-2 shrink-0"
                >
                  {inviteSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Invite Selected ({selectedCandidates.length})
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedSchedule ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-amber-50/10 border-amber-200/50">
                  <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4 opacity-80" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Active Schedules</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2 text-sm">
                    This test has not been scheduled yet. You must create a schedule under Test Schedules before inviting candidates.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm">
                    <div>
                      <p className="font-semibold text-primary">Schedule connected for this test</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(selectedScheduleData?.startTime || "")} - {formatDateTime(selectedScheduleData?.endTime || "")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search candidates by name or email..."
                        value={inviteSearchTerm}
                        onChange={(e) => setInviteSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                    <Tabs value={inviteTab} onValueChange={(value) => setInviteTab(value as "available" | "invited" | "all")}>
                      <TabsList className="bg-muted/40 border border-border p-1">
                        <TabsTrigger value="available" className="text-xs">
                          Available ({inviteCounts.available})
                        </TabsTrigger>
                        <TabsTrigger value="invited" className="text-xs">
                          Invited ({inviteCounts.invited})
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-xs">
                          All ({inviteCounts.all})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Candidates Table */}
                  <div className="border rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[42px]">
                            {inviteTab !== "invited" && (
                              <Checkbox
                                checked={
                                  filteredCandidates.length > 0 &&
                                  filteredCandidates.every((c) =>
                                    selectedCandidates.includes(c.id),
                                  )
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const allIds = filteredCandidates.map((c) => c.id);
                                    setSelectedCandidates((prev) =>
                                      Array.from(new Set([...prev, ...allIds])),
                                    );
                                  } else {
                                    const filteredIds = new Set(
                                      filteredCandidates.map((c) => c.id),
                                    );
                                    setSelectedCandidates((prev) =>
                                      prev.filter((id) => !filteredIds.has(id)),
                                    );
                                  }
                                }}
                              />
                            )}
                          </TableHead>
                          <TableHead className="w-[50px] text-center text-xs text-muted-foreground">#</TableHead>
                          <TableHead className="text-xs text-muted-foreground">Candidate</TableHead>
                          <TableHead className="text-xs text-muted-foreground">Contact</TableHead>
                          <TableHead className="text-xs text-muted-foreground">Account</TableHead>
                          <TableHead className="text-xs text-muted-foreground">Invitation</TableHead>
                          <TableHead className="text-xs text-muted-foreground">Test Link</TableHead>
                          <TableHead className="text-right text-xs text-muted-foreground">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingInvitations ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={8} className="text-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                            </TableCell>
                          </TableRow>
                        ) : filteredCandidates.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                              {inviteTab === "available"
                                ? "No candidates available to invite."
                                : inviteTab === "invited"
                                  ? "No invited candidates for this schedule."
                                  : "No candidates found."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCandidates.map((candidate, index) => {
                            const invitation = getInvitationForCandidate(candidate.id, selectedSchedule);
                            const isScheduleCompleted =
                              selectedScheduleData?.status === "COMPLETED" ||
                              selectedScheduleData?.status === "EXPIRED";
                            const displayStatus =
                              invitation?.status === "PENDING" && isScheduleCompleted
                                ? "EXPIRED"
                                : invitation?.status;

                            return (
                              <TableRow key={candidate.id} className="hover:bg-muted/30">
                                <TableCell>
                                  {!invitation && (
                                    <Checkbox
                                      checked={selectedCandidates.includes(candidate.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCandidates((prev) => [...prev, candidate.id]);
                                        } else {
                                          setSelectedCandidates((prev) =>
                                            prev.filter((id) => id !== candidate.id),
                                          );
                                        }
                                      }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground text-sm">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                                      {candidate.user.name
                                        ?.split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2) || "C"}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{candidate.user.name}</p>
                                      <p className="text-[10px] text-muted-foreground">ID: {candidate.id.slice(0, 8)}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div>{candidate.user.email}</div>
                                  <div className="text-xs text-muted-foreground">{candidate.user.phoneNumber}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {candidate.stale ? "Inactive" : "Active"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {invitation ? (
                                    getInvitationStatusBadge(displayStatus || "")
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Not invited</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {invitation ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyTestLink(invitation.id)}
                                      className="h-8 px-2"
                                      disabled={displayStatus === "EXPIRED"}
                                    >
                                      {copiedToken === invitation.id ? (
                                        <>
                                          <Check className="w-3 h-3 mr-1 text-green-500" />
                                          <span className="text-xs">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Link2 className="w-3 h-3 mr-1" />
                                          <span className="text-xs">Copy Link</span>
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {invitation ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                      Invited
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-8"
                                      onClick={() => {
                                        setSelectedCandidate(candidate);
                                        setIsInviteDialogOpen(true);
                                      }}
                                      disabled={isScheduleCompleted}
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Send Invite
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
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
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  Candidate Performance Reports
                </CardTitle>
                <CardDescription>
                  View test scores, detailed submissions, and proctoring metrics candidate-wise
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="report-schedule" className="text-sm font-medium whitespace-nowrap">
                  Filter by Schedule:
                </Label>
                <Select value={reportScheduleId} onValueChange={setReportScheduleId}>
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
                  disabled={loadingReports}
                  className="shrink-0"
                  title="Refresh Reports"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingReports ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading candidate reports...</p>
                </div>
              ) : displayedCandidates.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground font-medium">No candidate records found for this test.</p>
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
                        <TableHead className="text-center">Proctoring Risk</TableHead>
                        <TableHead className="text-center">Violations</TableHead>
                        <TableHead className="text-right">Download Reports / View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCandidates.map((candidate) => {
                        const reportCandidateKey = getReportCandidateKey(candidate);
                        const scoreData = candidateResults[reportCandidateKey];
                        const testStatus = candidate.testStatus;
                        
                        let statusColor = "bg-slate-100 text-slate-700";
                        if (testStatus === "SUBMITTED") statusColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                        else if (testStatus === "AUTO_SUBMITTED") statusColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
                        else if (testStatus === "IN_PROGRESS") statusColor = "bg-sky-500/10 text-sky-600 border-sky-500/20";

                        const risk = scoreData?.detail?.riskLevel || candidate.riskLevel || "NONE";
                        let riskColor = "bg-slate-100 text-slate-700";
                        if (risk === "HIGH") riskColor = "bg-red-500/15 text-red-500";
                        else if (risk === "CRITICAL") riskColor = "bg-red-500 text-white animate-pulse";
                        else if (risk === "MEDIUM") riskColor = "bg-amber-500/15 text-amber-500";
                        else if (risk === "LOW") riskColor = "bg-yellow-500/15 text-yellow-600";
                        else if (risk === "NONE") riskColor = "bg-emerald-500/15 text-emerald-500";

                        const totalScore = scoreData?.result?.totalScore;
                        const maxScore = scoreData?.result?.maxScore;
                        const passed = scoreData?.result?.passed;
                        const isResultPending =
                          testStatus === "IN_PROGRESS" ||
                          testStatus === "NOT_STARTED" ||
                          (!scoreData?.sessionId && totalScore === undefined && passed === undefined);

                        return (
                          <TableRow key={reportCandidateKey}>
                            <TableCell>
                              <div className="font-semibold">{candidate.candidateName}</div>
                              <div className="text-xs text-muted-foreground">{candidate.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColor}>
                                {testStatus?.replace(/_/g, " ") || "NOT STARTED"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {totalScore !== undefined ? `${totalScore} / ${maxScore}` : isResultPending ? `0 / ${totalTestMarks}` : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {passed !== undefined ? (
                                <Badge variant="outline" className={passed ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}>
                                  {passed ? "Passed" : "Failed"}
                                </Badge>
                              ) : isResultPending ? (
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20">
                                  Pending
                                </Badge>
                              ) : "-"}
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
                                    onClick={() => handleOpenAdvancedReport(candidate)}
                                    title="View advanced submissions, telemetry, and violations"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Advanced
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 font-semibold"
                                    onClick={() => downloadScorecard(scoreData.sessionId, candidate.candidateName)}
                                    title="Download normal scorecard PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Normal
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/10 font-semibold"
                                    onClick={() => downloadAdvancedReport(candidate)}
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

      {/* Invite Confirmation Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Invitation</DialogTitle>
            <DialogDescription>
              Send test invitation to candidate?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              This will send an invitation to{" "}
              <span className="font-semibold text-slate-900">
                {selectedCandidate?.user.name}
              </span>{" "}
              for the test{" "}
              <span className="font-semibold text-slate-900">
                {test?.title || "Test"}
              </span>
            </p>
            {selectedScheduleData && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Start: {formatDateTime(selectedScheduleData.startTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    End: {formatDateTime(selectedScheduleData.endTime)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteSubmitting}>
              {inviteSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Unsaved Changes Dialog */}
      <AlertDialog open={unsavedChangesDialogOpen} onOpenChange={setUnsavedChangesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this test. Are you sure you want to go back without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnsavedChangesDialogOpen(false)}>
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
      <AlertDialog open={unsavedScheduleDialogOpen} onOpenChange={setUnsavedScheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Schedule Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the test schedule. Would you like to save them before switching tabs?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUnsavedScheduleDialogOpen(false);
              setPendingTab(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="border border-destructive bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDiscardScheduleChanges}
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleSaveAndSwitch}
            >
              Save & Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advanced Candidate Report Dialog */}
      <Dialog open={isAdvancedReportOpen} onOpenChange={setIsAdvancedReportOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-500" />
              Advanced Report: {selectedReportCandidate?.candidateName}
            </DialogTitle>
            <DialogDescription>
              Detailed logs of questions, selected options/submitted code, and proctoring metrics.
            </DialogDescription>
          </DialogHeader>

          {loadingAdvancedDetails ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading submission details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Candidate Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Email</div>
                  <div className="text-sm font-semibold truncate">{selectedReportCandidate?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Test Status</div>
                  <div className="text-sm font-semibold capitalize">{selectedReportCandidate?.testStatus?.replace(/_/g, " ") || "Not Started"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Final Score</div>
                  <div className="text-sm font-semibold">
                    {selectedReportCandidate && candidateResults[getReportCandidateKey(selectedReportCandidate)]?.result?.totalScore !== undefined
                      ? `${candidateResults[getReportCandidateKey(selectedReportCandidate)].result.totalScore} / ${candidateResults[getReportCandidateKey(selectedReportCandidate)].result.maxScore}`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Passed / Failed</div>
                  <div className="text-sm font-semibold">
                    {selectedReportCandidate && candidateResults[getReportCandidateKey(selectedReportCandidate)]?.result?.passed !== undefined
                      ? (candidateResults[getReportCandidateKey(selectedReportCandidate)].result.passed ? "PASSED" : "FAILED")
                      : "-"}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="answers" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
                  <TabsTrigger value="answers">Questions & Submissions</TabsTrigger>
                  <TabsTrigger value="proctoring">Proctoring Timeline</TabsTrigger>
                </TabsList>

                {/* Answers Tab */}
                <TabsContent value="answers" className="space-y-4">
                  {candidatePaperSubmissions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No submissions found for this candidate.
                    </div>
                  ) : (
                    candidatePaperSubmissions.map((item: Record<string, unknown>, idx: number) => {
                      const q = item.question as { id?: string; title?: string; prompt?: string; questionType?: string; type?: string; mcqOptions?: { id: string; text: string; isCorrect: boolean }[] };
                      const sub = item.submission as { answerText?: string; selectedOptionIds?: string[]; questionId?: string } | null;
                      const isCoding = q.questionType === "CODING" || q.type === "CODING";

                      return (
                        <Card key={q.id} className="border border-slate-200 shadow-sm overflow-hidden">
                          <CardHeader className="bg-slate-50/50 p-4 border-b">
                            <div className="flex justify-between items-start gap-4">
                              <span className="font-semibold text-sm text-slate-800">
                                Question {idx + 1}: {q.title || "Untitled Question"}
                              </span>
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                {isCoding ? "Coding" : "MCQ"}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{q.prompt}</p>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3">
                            {isCoding ? (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">Submitted Source Code:</div>
                                {sub?.answerText ? (
                                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-72">
                                    <code>{sub.answerText}</code>
                                  </pre>
                                ) : (
                                  <div className="text-sm text-muted-foreground italic">No code submitted.</div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-slate-500">MCQ Options:</div>
                                <div className="grid gap-2">
                                  {(q.mcqOptions || []).map((opt: { id: string; text: string; isCorrect: boolean }) => {
                                    const isSelected = sub?.answerText?.includes(opt.id) || sub?.answerText?.includes(opt.text);
                                    const isCorrect = opt.isCorrect;

                                    let optionStyle = "border-slate-200 bg-white";
                                    if (isSelected && isCorrect) optionStyle = "border-emerald-500 bg-emerald-500/5 text-emerald-700";
                                    else if (isSelected && !isCorrect) optionStyle = "border-red-500 bg-red-500/5 text-red-700";
                                    else if (!isSelected && isCorrect) optionStyle = "border-emerald-200 bg-emerald-50/20 text-emerald-600";

                                    return (
                                      <div key={opt.id} className={`p-3 border rounded-lg text-sm flex items-center justify-between ${optionStyle}`}>
                                        <span>{opt.text}</span>
                                        <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium">
                                          {isSelected && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Selected</Badge>}
                                          {isCorrect && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Correct Answer</Badge>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                {/* Proctoring Tab */}
                <TabsContent value="proctoring" className="space-y-4">
                  {/* System & Device Specs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-slate-50/50">
                    <div>
                      <div className="text-xs text-muted-foreground">IP Address</div>
                      <div className="text-sm font-semibold">{reportCandidateDetails?.systemInfo?.ipAddress || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Browser / OS</div>
                      <div className="text-sm font-semibold truncate">
                        {reportCandidateDetails?.systemInfo?.browser || "Chrome"} / {reportCandidateDetails?.systemInfo?.os || "Windows"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fullscreen Violations</div>
                      <div className="text-sm font-semibold">{reportCandidateDetails?.systemInfo?.fullscreenViolations ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Warnings</div>
                      <div className="text-sm font-semibold">{selectedReportCandidate?.violationCount || 0}</div>
                    </div>
                  </div>

                  {/* Violation Timeline */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-800">Violation Records</h3>
                    {!reportCandidateDetails?.violations || reportCandidateDetails.violations.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic">No proctoring violations recorded for this session.</div>
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
                            {reportCandidateDetails.violations.map((v: ReportViolation) => {
                              let sevColor = "bg-slate-100 text-slate-700";
                              if (v.severity === "CRITICAL" || v.severity === "HIGH") sevColor = "bg-red-500/10 text-red-500";
                              else if (v.severity === "MEDIUM") sevColor = "bg-amber-500/10 text-amber-500";

                              return (
                                <TableRow key={v.id}>
                                  <TableCell className="text-xs whitespace-nowrap">{new Date(v.occurredAt || v.time).toLocaleTimeString()}</TableCell>
                                  <TableCell className="text-xs font-semibold">{v.eventType?.replace(/_/g, " ")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={sevColor}>{v.severity}</Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{v.description || "Violation triggered"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Snapshot / Evidence Captures */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-800">Snapshot Evidence</h3>
                    {!reportCandidateDetails?.evidence || reportCandidateDetails.evidence.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic">No image evidence collected.</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {reportCandidateDetails.evidence.map((img: ReportEvidence) => (
                          <div key={img.id} className="border rounded-lg overflow-hidden bg-muted/20">
                            <img src={img.imageData || img.imageUrl} alt="Proctor Capture" className="w-full h-32 object-cover" />
                            <div className="p-2 text-[10px] text-muted-foreground">
                              <div>{img.snapshotType || "VIOLATION"}</div>
                              <div>{new Date(img.capturedAt).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsAdvancedReportOpen(false)}>Close Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
