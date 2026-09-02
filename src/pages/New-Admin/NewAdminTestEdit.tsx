import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  LayoutGrid,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  LogOut,
  Save,
  Calendar,
  Shield,
  Eye,
  Video,
  Mic,
  Monitor,
  AlertTriangle,
  Lock,
  X,
  Send,
  Download,
  CloudDownload,
  Bell,
  Mail,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  Copy,
  User as UserIcon,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MaterialDatePickerDialog,
  MaterialTimePickerDialog,
} from "@/components/ui/material-pickers";
import { AddCandidatesModal } from "@/components/invite/AddCandidatesModal";
import { BulkInviteModal } from "@/components/invite/BulkInviteModal";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  testService,
  Test,
  Question,
  TestQuestion,
  ProctoringMode,
  TestScheduleExtended,
} from "@/lib/test-service";
import { candidateService, CandidateInvitation } from "@/lib/candidate-service";
import { PublishTestConfirmationModal } from "@/components/admin/PublishTestConfirmationModal";
import { ExtendTimeModal, ExtendTimeCandidateSession } from "@/components/admin/ExtendTimeModal";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

type TabType = "PROBLEMS" | "GENERAL_SETTINGS" | "ADVANCED_SETTINGS" | "CANDIDATES";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

const fmtMcqType = (t?: string) => {
  if (!t) return "Single";
  switch (t.toUpperCase()) {
    case "SINGLE_CORRECT":
      return "Single";
    case "MULTIPLE_CORRECT":
      return "Multiple";
    case "TRUE_FALSE":
      return "True/False";
    case "ASSERTION_REASON":
      return "Assertion Reason";
    case "FILL_IN_THE_BLANK":
      return "Fill in blank";
    default:
      return t;
  }
};

const formatDuration = (mins?: number) => {
  if (!mins || mins <= 0) return "60 mins";
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMins} min${remainingMins > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${mins} min${mins > 1 ? "s" : ""}`;
};

const formatTimeTaken = (totalSeconds: number) => {
  if (totalSeconds <= 0) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return "< 1m";
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString();
};

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
      maxCriticalViolations: 3,
    };
  }
  return defaults;
};

export default function NewAdminTestEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = (): TabType => {
    const tabParam = searchParams.get("tab")?.toLowerCase();
    if (tabParam === "candidates" || tabParam === "reports" || tabParam === "invite" || tabParam === "invitations") {
      return "CANDIDATES";
    }
    if (tabParam === "general" || tabParam === "settings" || tabParam === "general_settings") {
      return "GENERAL_SETTINGS";
    }
    if (tabParam === "advanced" || tabParam === "schedule" || tabParam === "proctoring" || tabParam === "advanced_settings") {
      return "ADVANCED_SETTINGS";
    }
    return "PROBLEMS";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab")?.toLowerCase();
    if (tabParam === "candidates" || tabParam === "reports" || tabParam === "invite" || tabParam === "invitations") {
      setActiveTab("CANDIDATES");
    } else if (tabParam === "general" || tabParam === "settings" || tabParam === "general_settings") {
      setActiveTab("GENERAL_SETTINGS");
    } else if (tabParam === "advanced" || tabParam === "schedule" || tabParam === "proctoring" || tabParam === "advanced_settings") {
      setActiveTab("ADVANCED_SETTINGS");
    } else if (tabParam === "problems" || tabParam === "questions") {
      setActiveTab("PROBLEMS");
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(Boolean(id));
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Array<TestQuestion & { question?: Question }>>([]);
  // Section UI state
  const [groupedQuestions, setGroupedQuestions] = useState<Record<string, Array<TestQuestion & { question?: Question }>>>({});
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [movingSectionFor, setMovingSectionFor] = useState<string | null>(null); // tq.id being moved

  // General Settings Form States
  const [title, setTitle] = useState("");
  const [durationMins, setDurationMins] = useState<number | string>(60);
  const [passMark, setPassMark] = useState<number | string>(40);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("PUBLISHED");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [savingGeneralSettings, setSavingGeneralSettings] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unverifiedQuestionsForPublish, setUnverifiedQuestionsForPublish] = useState<
    Array<{ id: string; title: string; pendingLanguages?: string[] }>
  >([]);

  // Advanced Settings: Schedule States
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [selectedScheduleData, setSelectedScheduleData] = useState<TestScheduleExtended | null>(null);
  const [scheduleStartTime, setScheduleStartTime] = useState<string>("");
  const [scheduleEndTime, setScheduleEndTime] = useState<string>("");
  const [initialScheduleStart, setInitialScheduleStart] = useState<string>("");
  const [initialScheduleEnd, setInitialScheduleEnd] = useState<string>("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Picker dialog open states
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  // Advanced Settings: Proctoring States
  const [proctoringMode, setProctoringMode] = useState<ProctoringMode>("NONE");
  const [enableTabSwitchTracking, setEnableTabSwitchTracking] = useState(false);
  const [blockCopyPaste, setBlockCopyPaste] = useState(false);
  const [blockRightClick, setBlockRightClick] = useState(false);
  const [warnOnFullscreenExit, setWarnOnFullscreenExit] = useState(false);
  const [maxWarnings, setMaxWarnings] = useState(0);
  const [requireWebcam, setRequireWebcam] = useState(false);
  const [detectFaceNotVisible, setDetectFaceNotVisible] = useState(false);
  const [detectMultipleFaces, setDetectMultipleFaces] = useState(false);
  const [detectSuspiciousAudio, setDetectSuspiciousAudio] = useState(false);
  const [detectObjects, setDetectObjects] = useState(false);
  const [periodicSnapshots, setPeriodicSnapshots] = useState(false);
  const [evidenceCapture, setEvidenceCapture] = useState(false);
  const [requireMicrophone, setRequireMicrophone] = useState(false);
  const [requireScreenShare, setRequireScreenShare] = useState(false);
  const [detectDevTools, setDetectDevTools] = useState(false);
  const [detectScreenShareStop, setDetectScreenShareStop] = useState(false);
  const [enableLiveProctoring, setEnableLiveProctoring] = useState(false);
  const [autoSubmitOnCriticalViolations, setAutoSubmitOnCriticalViolations] = useState(false);
  const [maxCriticalViolations, setMaxCriticalViolations] = useState(0);
  const [savingProctoring, setSavingProctoring] = useState(false);
  const [initialProctoring, setInitialProctoring] = useState<any>({});

  // ── Candidate Invitations & Performance States ──
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [isAddCandidatesOpen, setIsAddCandidatesOpen] = useState(false);
  const [isBulkInviteOpen, setIsBulkInviteOpen] = useState(false);
  const [candidateResults, setCandidateResults] = useState<Record<string, any>>({});
  const [loadingCandidatesData, setLoadingCandidatesData] = useState(false);

  // Candidate Reports Filtering & Pagination
  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("ALL");
  const [invitedByMe, setInvitedByMe] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateRowsPerPage, setCandidateRowsPerPage] = useState(15);
  const [statusAccordionOpen, setStatusAccordionOpen] = useState(true);
  const [invitedOnAccordionOpen, setInvitedOnAccordionOpen] = useState(true);

  // ── Modals for 3-dots actions ──
  const [selectedCandidateForReport, setSelectedCandidateForReport] = useState<CandidateInvitation | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [candidateToResend, setCandidateToResend] = useState<CandidateInvitation | null>(null);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [candidateToRevoke, setCandidateToRevoke] = useState<CandidateInvitation | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // ── Time Extension Modal State ──
  const [isExtendTimeModalOpen, setIsExtendTimeModalOpen] = useState(false);
  const [candidateForTimeExtension, setCandidateForTimeExtension] = useState<ExtendTimeCandidateSession | null>(null);

  const alreadyInvitedCandidateIds = useMemo(() => {
    return new Set(invitations.map((i) => i.candidateId));
  }, [invitations]);

  // Fetch Test Details & Questions & Schedules from Backend
  const fetchTest = useCallback(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      testService.getTestById(id),
      testService.getGroupedTestQuestions(id),
      testService.getAllTestSchedules(),
    ])
      .then(([testData, groupedData, allSchedules]) => {
        setTest(testData);

        // Populate General Settings Form
        setTitle(testData.title || "");
        setDurationMins(testData.durationMins || 60);
        setPassMark(testData.passMark || 40);
        setDifficulty((testData.difficulty as any) || "MEDIUM");
        setStatus((testData.status as any) || "PUBLISHED");
        setDescription(testData.description || "");

        const inst = testData.instructions;
        if (typeof inst === "string") {
          setInstructions(inst);
        } else if (inst && typeof inst === "object" && "text" in inst) {
          setInstructions(String((inst as any).text || ""));
        } else {
          setInstructions("");
        }

        // Populate Schedule
        const testSchedules = (allSchedules || []).filter((s) => s.testId === id);
        const activeSchedule =
          testSchedules.find((s) => s.status === "SCHEDULED" || s.status === "LIVE") ||
          testSchedules[0];

        if (activeSchedule) {
          setSelectedScheduleId(activeSchedule.id);
          setSelectedScheduleData(activeSchedule as any);
          const start = activeSchedule.startTime ? activeSchedule.startTime.slice(0, 16) : "";
          const end = activeSchedule.endTime ? activeSchedule.endTime.slice(0, 16) : "";
          setScheduleStartTime(start);
          setScheduleEndTime(end);
          setInitialScheduleStart(start);
          setInitialScheduleEnd(end);

          candidateService
            .getInvitationsBySchedule(activeSchedule.id)
            .then((invs) => setInvitations(invs || []))
            .catch((e) => console.warn("Failed to load invitations:", e));
        }

        // Populate Proctoring Settings
        const pMode = testData.proctoringMode || "NONE";
        setProctoringMode(pMode);
        setEnableTabSwitchTracking(testData.enableTabSwitchTracking || false);
        setBlockCopyPaste(testData.blockCopyPaste || false);
        setBlockRightClick(testData.blockRightClick || false);
        setWarnOnFullscreenExit(testData.warnOnFullscreenExit || false);
        setMaxWarnings(testData.maxWarnings || 0);
        setRequireWebcam(testData.requireWebcam || false);
        setDetectFaceNotVisible(testData.detectFaceNotVisible || false);
        setDetectMultipleFaces(testData.detectMultipleFaces || false);
        setDetectSuspiciousAudio(testData.detectSuspiciousAudio || false);
        setDetectObjects(testData.detectObjects || false);
        setPeriodicSnapshots(testData.periodicSnapshots || false);
        setEvidenceCapture(testData.evidenceCapture || false);
        setRequireMicrophone(testData.requireMicrophone || false);
        setRequireScreenShare(testData.requireScreenShare || false);
        setDetectDevTools(testData.detectDevTools || false);
        setDetectScreenShareStop(testData.detectScreenShareStop || false);
        setEnableLiveProctoring(testData.enableLiveProctoring || false);
        setAutoSubmitOnCriticalViolations(testData.autoSubmitOnCriticalViolations || false);
        setMaxCriticalViolations(testData.maxCriticalViolations || 0);

        setInitialProctoring({
          proctoringMode: pMode,
          enableTabSwitchTracking: testData.enableTabSwitchTracking || false,
          blockCopyPaste: testData.blockCopyPaste || false,
          blockRightClick: testData.blockRightClick || false,
          warnOnFullscreenExit: testData.warnOnFullscreenExit || false,
          maxWarnings: testData.maxWarnings || 0,
          requireWebcam: testData.requireWebcam || false,
          detectFaceNotVisible: testData.detectFaceNotVisible || false,
          detectMultipleFaces: testData.detectMultipleFaces || false,
          detectSuspiciousAudio: testData.detectSuspiciousAudio || false,
          detectObjects: testData.detectObjects || false,
          periodicSnapshots: testData.periodicSnapshots || false,
          evidenceCapture: testData.evidenceCapture || false,
          requireMicrophone: testData.requireMicrophone || false,
          requireScreenShare: testData.requireScreenShare || false,
          detectDevTools: testData.detectDevTools || false,
          detectScreenShareStop: testData.detectScreenShareStop || false,
          enableLiveProctoring: testData.enableLiveProctoring || false,
          autoSubmitOnCriticalViolations: testData.autoSubmitOnCriticalViolations || false,
          maxCriticalViolations: testData.maxCriticalViolations || 0,
        });

        // Build section-aware state from grouped API response
        const grouped = groupedData || {};
        // Keep "Ungrouped" last, otherwise preserve insertion order
        const orderedKeys = Object.keys(grouped).sort((a, b) => {
          if (a === "Ungrouped") return 1;
          if (b === "Ungrouped") return -1;
          return 0;
        });
        setGroupedQuestions(grouped as Record<string, Array<TestQuestion & { question?: Question }>>);
        setSectionOrder(orderedKeys);
        // Derive flat list (order within each section, sections in order)
        const flat = orderedKeys.flatMap((key) => grouped[key] || []) as Array<TestQuestion & { question?: Question }>;
        setQuestions(flat);
      })
      .catch((err) => {
        console.error("[NewAdminTestEdit] Error loading test:", err);
        toast.error("Failed to load test details");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  // Load results and session details for candidates
  const loadCandidatesData = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingCandidatesData(true);
      const allScheds = await testService.getAllTestSchedules();
      const testSchedules = allScheds.filter((s) => s.testId === id);
      
      const scheduleIds = testSchedules.length > 0 
        ? Array.from(new Set(testSchedules.map((s) => s.id)))
        : selectedScheduleId ? [selectedScheduleId] : [];

      if (scheduleIds.length > 0) {
        const invsLists = await Promise.all(
          scheduleIds.map(async (sId) => {
            try {
              return await candidateService.getInvitationsBySchedule(sId);
            } catch {
              return [];
            }
          })
        );
        const invs = invsLists.flat();
        setInvitations(invs || []);

        // Fetch score details for each invitation if available
        const resultsMap: Record<string, any> = {};
        await Promise.allSettled(
          (invs || []).map(async (inv) => {
            try {
              const detailRes = await apiClient.get(
                `/api/admin/proctoring/candidates/${inv.candidateId}/details?scheduleId=${inv.scheduleId}`
              );
              const detail = detailRes.data?.data || detailRes.data;
              const sessionId = detail?.systemInfo?.sessionId || detail?.sessionId || (inv as any).sessionId || (inv as any).testSessionId;
              if (sessionId) {
                const [res, sessionRes] = await Promise.allSettled([
                  apiClient.get(`/test-results/session/${sessionId}`),
                  apiClient.get(`/test-sessions/${sessionId}`),
                ]);
                const resultData = res.status === "fulfilled" ? (res.value.data?.data || res.value.data) : null;
                const sessionData = sessionRes.status === "fulfilled" ? (sessionRes.value.data?.data || sessionRes.value.data) : null;

                resultsMap[inv.id] = {
                  sessionId,
                  detail,
                  session: sessionData,
                  result: resultData,
                };
              } else {
                resultsMap[inv.id] = { detail, session: null, result: null };
              }
            } catch {
              // fallback
            }
          })
        );
        setCandidateResults(resultsMap);
      }
    } catch (e) {
      console.warn("Failed to load candidate reports:", e);
    } finally {
      setLoadingCandidatesData(false);
    }
  }, [id, selectedScheduleId]);

  useEffect(() => {
    if (activeTab === "CANDIDATES") {
      loadCandidatesData();
    }
  }, [activeTab, loadCandidatesData]);

  const isScheduleDirty = useMemo(() => {
    return (
      scheduleStartTime !== initialScheduleStart ||
      scheduleEndTime !== initialScheduleEnd
    );
  }, [scheduleStartTime, scheduleEndTime, initialScheduleStart, initialScheduleEnd]);

  const isProctoringDirty = useMemo(() => {
    if (!initialProctoring.proctoringMode) return false;
    return (
      proctoringMode !== initialProctoring.proctoringMode ||
      enableTabSwitchTracking !== initialProctoring.enableTabSwitchTracking ||
      blockCopyPaste !== initialProctoring.blockCopyPaste ||
      blockRightClick !== initialProctoring.blockRightClick ||
      warnOnFullscreenExit !== initialProctoring.warnOnFullscreenExit ||
      maxWarnings !== initialProctoring.maxWarnings ||
      requireWebcam !== initialProctoring.requireWebcam ||
      detectFaceNotVisible !== initialProctoring.detectFaceNotVisible ||
      detectMultipleFaces !== initialProctoring.detectMultipleFaces ||
      detectSuspiciousAudio !== initialProctoring.detectSuspiciousAudio ||
      detectObjects !== initialProctoring.detectObjects ||
      periodicSnapshots !== initialProctoring.periodicSnapshots ||
      evidenceCapture !== initialProctoring.evidenceCapture ||
      requireMicrophone !== initialProctoring.requireMicrophone ||
      requireScreenShare !== initialProctoring.requireScreenShare ||
      detectDevTools !== initialProctoring.detectDevTools ||
      detectScreenShareStop !== initialProctoring.detectScreenShareStop ||
      enableLiveProctoring !== initialProctoring.enableLiveProctoring ||
      autoSubmitOnCriticalViolations !== initialProctoring.autoSubmitOnCriticalViolations ||
      maxCriticalViolations !== initialProctoring.maxCriticalViolations
    );
  }, [
    proctoringMode,
    enableTabSwitchTracking,
    blockCopyPaste,
    blockRightClick,
    warnOnFullscreenExit,
    maxWarnings,
    requireWebcam,
    detectFaceNotVisible,
    detectMultipleFaces,
    detectSuspiciousAudio,
    detectObjects,
    periodicSnapshots,
    evidenceCapture,
    requireMicrophone,
    requireScreenShare,
    detectDevTools,
    detectScreenShareStop,
    enableLiveProctoring,
    autoSubmitOnCriticalViolations,
    maxCriticalViolations,
    initialProctoring,
  ]);

  const handleProctoringModeChange = (mode: ProctoringMode) => {
    setProctoringMode(mode);
    const preset = getProctoringPreset(mode);
    setEnableTabSwitchTracking(preset.enableTabSwitchTracking);
    setBlockCopyPaste(preset.blockCopyPaste);
    setBlockRightClick(preset.blockRightClick);
    setWarnOnFullscreenExit(preset.warnOnFullscreenExit);
    setMaxWarnings(preset.maxWarnings);
    setRequireWebcam(preset.requireWebcam);
    setDetectFaceNotVisible(preset.detectFaceNotVisible);
    setDetectMultipleFaces(preset.detectMultipleFaces);
    setDetectSuspiciousAudio(preset.detectSuspiciousAudio);
    setDetectObjects(preset.detectObjects);
    setPeriodicSnapshots(preset.periodicSnapshots);
    setEvidenceCapture(preset.evidenceCapture);
    setRequireMicrophone(preset.requireMicrophone);
    setRequireScreenShare(preset.requireScreenShare);
    setDetectDevTools(preset.detectDevTools);
    setDetectScreenShareStop(preset.detectScreenShareStop);
    setEnableLiveProctoring(preset.enableLiveProctoring);
    setAutoSubmitOnCriticalViolations(preset.autoSubmitOnCriticalViolations);
    setMaxCriticalViolations(preset.maxCriticalViolations);
  };

  const handleRemoveQuestion = async (testQuestionId: string) => {
    try {
      await testService.deleteTestQuestion(testQuestionId);
      setQuestions((prev) => prev.filter((tq) => tq.id !== testQuestionId));
      setGroupedQuestions((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((tq) => tq.id !== testQuestionId);
        }
        return next;
      });
      toast.success("Problem removed from test");
    } catch (err: any) {
      toast.error("Failed to remove problem: " + (err.message || "Unknown error"));
    }
  };

  const handleMoveToSection = async (tq: TestQuestion & { question?: Question }, targetSection: string) => {
    try {
      await testService.updateTestQuestion(tq.id, { sectionName: targetSection });
      // Update groupedQuestions optimistically
      setGroupedQuestions((prev) => {
        const next: Record<string, Array<TestQuestion & { question?: Question }>> = {};
        for (const key of Object.keys(prev)) {
          next[key] = prev[key].filter((q) => q.id !== tq.id);
        }
        const updated = { ...tq, sectionName: targetSection };
        next[targetSection] = [...(next[targetSection] || []), updated];
        return next;
      });
      // Add section to order if not already present
      setSectionOrder((prev) => prev.includes(targetSection) ? prev : [...prev, targetSection]);
      setMovingSectionFor(null);
      toast.success(`Moved to "${targetSection}"`);
    } catch (err: any) {
      toast.error("Failed to move question: " + (err.message || "Unknown error"));
    }
  };

  const handleConfirmNewSection = () => {
    const name = newSectionName.trim();
    if (!name) { toast.error("Section name cannot be empty"); return; }
    if (sectionOrder.includes(name)) { toast.error(`Section "${name}" already exists`); return; }
    setSectionOrder((prev) => {
      // Insert before "Ungrouped" if it exists, otherwise append
      const ungroupedIdx = prev.indexOf("Ungrouped");
      if (ungroupedIdx === -1) return [...prev, name];
      return [...prev.slice(0, ungroupedIdx), name, ...prev.slice(ungroupedIdx)];
    });
    setGroupedQuestions((prev) => ({ ...prev, [name]: [] }));
    setNewSectionName("");
    setAddSectionOpen(false);
    toast.success(`Section "${name}" created`);
  };

  const handleDeleteSection = async (sectionName: string) => {
    const sectionQs = groupedQuestions[sectionName] || [];
    if (sectionQs.length > 0) {
      // Reassign questions to "Ungrouped" (empty/null section)
      try {
        await Promise.all(
          sectionQs.map((tq) => testService.updateTestQuestion(tq.id, { sectionName: "" }))
        );
        setGroupedQuestions((prev) => {
          const next = { ...prev };
          const unassigned = (next[sectionName] || []).map((tq) => ({ ...tq, sectionName: undefined }));
          delete next[sectionName];
          next["Ungrouped"] = [...(next["Ungrouped"] || []), ...unassigned];
          return next;
        });
        setSectionOrder((prev) => {
          const filtered = prev.filter((s) => s !== sectionName);
          return filtered.includes("Ungrouped") ? filtered : [...filtered, "Ungrouped"];
        });
        toast.success(`Section "${sectionName}" deleted, questions moved to Ungrouped`);
      } catch (err: any) {
        toast.error("Failed to delete section: " + (err.message || "Unknown error"));
      }
    } else {
      // Empty section, simply remove from state
      setSectionOrder((prev) => prev.filter((s) => s !== sectionName));
      setGroupedQuestions((prev) => {
        const next = { ...prev };
        delete next[sectionName];
        return next;
      });
      toast.success(`Section "${sectionName}" deleted`);
    }
  };

  const executePublish = async () => {
    if (!id) return;
    const dur = Number(durationMins);
    const pass = Number(passMark);
    try {
      setSavingGeneralSettings(true);
      const updated = await testService.updateTest(id, {
        title: title.trim(),
        durationMins: dur,
        passMark: pass,
        difficulty,
        status: "PUBLISHED",
        description: description.trim(),
        instructions: instructions ? { text: instructions.trim() } : {},
      });
      setTest(updated);
      setPublishModalOpen(false);
      toast.success("General settings saved and test published successfully!");
    } catch (err: any) {
      console.error("[NewAdminTestEdit] Failed to save general settings:", err);
      toast.error("Failed to save settings: " + (err?.response?.data?.message || err.message || "Unknown error"));
    } finally {
      setSavingGeneralSettings(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    if (!id) return;
    if (!title.trim()) {
      toast.error("Test title is required.");
      return;
    }
    const dur = Number(durationMins);
    if (isNaN(dur) || dur <= 0) {
      toast.error("Duration must be greater than 0 minutes.");
      return;
    }
    const pass = Number(passMark);
    if (isNaN(pass) || pass < 0 || pass > 100) {
      toast.error("Passing mark must be between 0 and 100%.");
      return;
    }

    // Checkpoint 2: Inspect all coding questions for pending driver verifications
    const unverified = questions
      .filter((tq) => {
        const q = (tq as any).question || tq;
        const isCoding = (q.questionType ?? "").toUpperCase() === "CODING";
        if (!isCoding) return false;
        const declaredLangs = Object.keys(q.languageTemplates || {});
        const verifiedLangs = q.verifiedLanguages || [];
        const hasUnverified = declaredLangs.length === 0 || declaredLangs.some((l: string) => !verifiedLangs.includes(l));
        return q.status === "UNDER_REVIEW" || hasUnverified;
      })
      .map((tq) => {
        const q = (tq as any).question || tq;
        const declaredLangs = Object.keys(q.languageTemplates || { python: {}, javascript: {}, java: {}, cpp: {} });
        const verifiedLangs = q.verifiedLanguages || [];
        const pending = declaredLangs.filter((l: string) => !verifiedLangs.includes(l));
        return {
          id: q.id || tq.id,
          title: q.title || "Untitled Coding Question",
          pendingLanguages: pending.length > 0 ? pending : (q.pendingLanguages || ["python", "javascript", "java", "cpp"]),
        };
      });

    if (unverified.length > 0) {
      setUnverifiedQuestionsForPublish(unverified);
      setPublishModalOpen(true);
      return;
    }

    await executePublish();
  };

  const handleSaveSchedule = async () => {
    if (!id) return;
    if (!scheduleStartTime || !scheduleEndTime) {
      toast.error("Both start time and end time are required.");
      return;
    }
    const startDate = new Date(scheduleStartTime);
    const endDate = new Date(scheduleEndTime);
    if (endDate <= startDate) {
      toast.error("Schedule end time must be after start time.");
      return;
    }

    try {
      setSavingSchedule(true);
      let targetId = selectedScheduleId;
      if (selectedScheduleId) {
        const res = await apiClient.patch(`/test-schedules/${selectedScheduleId}`, {
          startTime: scheduleStartTime,
          endTime: scheduleEndTime,
        });
        const d = res.data?.data || res.data;
        if (d) setSelectedScheduleData(d);
      } else {
        const res = await apiClient.post("/test-schedules", {
          testId: id,
          startTime: scheduleStartTime,
          endTime: scheduleEndTime,
          maxCandidates: 100,
        });
        const d = res.data?.data || res.data;
        if (d?.id) {
          targetId = d.id;
          setSelectedScheduleId(d.id);
          setSelectedScheduleData(d);
        }
      }
      setInitialScheduleStart(scheduleStartTime);
      setInitialScheduleEnd(scheduleEndTime);
      toast.success("Test schedule has been saved successfully.");

      // Refresh candidate and schedule data immediately
      fetchTest();
      if (targetId) {
        candidateService.getInvitationsBySchedule(targetId).then((invs) => {
          setInvitations(invs || []);
        });
      }
    } catch (err: any) {
      console.error("[NewAdminTestEdit] Failed to save schedule:", err);
      toast.error("Failed to save schedule: " + (err?.response?.data?.message || err.message || "Unknown error"));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveProctoring = async () => {
    if (!id) return;
    try {
      setSavingProctoring(true);
      const updated = await testService.updateTest(id, {
        proctoringMode,
        enableTabSwitchTracking,
        blockCopyPaste,
        blockRightClick,
        warnOnFullscreenExit,
        maxWarnings: Number(maxWarnings) || 0,
        requireWebcam,
        detectFaceNotVisible,
        detectMultipleFaces,
        detectSuspiciousAudio,
        detectObjects,
        periodicSnapshots,
        evidenceCapture,
        requireMicrophone,
        requireScreenShare,
        detectDevTools,
        detectScreenShareStop,
        enableLiveProctoring,
        autoSubmitOnCriticalViolations,
        maxCriticalViolations: Number(maxCriticalViolations) || 0,
      });
      setTest(updated);
      setInitialProctoring({
        proctoringMode,
        enableTabSwitchTracking,
        blockCopyPaste,
        blockRightClick,
        warnOnFullscreenExit,
        maxWarnings: Number(maxWarnings) || 0,
        requireWebcam,
        detectFaceNotVisible,
        detectMultipleFaces,
        detectSuspiciousAudio,
        detectObjects,
        periodicSnapshots,
        evidenceCapture,
        requireMicrophone,
        requireScreenShare,
        detectDevTools,
        detectScreenShareStop,
        enableLiveProctoring,
        autoSubmitOnCriticalViolations,
        maxCriticalViolations: Number(maxCriticalViolations) || 0,
      });
      toast.success("Proctoring settings saved successfully.");
    } catch (err: any) {
      console.error("[NewAdminTestEdit] Failed to save proctoring settings:", err);
      toast.error("Failed to save proctoring: " + (err?.response?.data?.message || err.message || "Unknown error"));
    } finally {
      setSavingProctoring(false);
    }
  };

  // ── Filtered Candidates for the CANDIDATES Tab ──
  const filteredCandidates = useMemo(() => {
    return invitations.filter((inv) => {
      const name = (inv.candidateName || inv.candidate?.user?.name || "").toLowerCase();
      const email = (inv.candidateEmail || inv.candidate?.user?.email || "").toLowerCase();
      const q = candidateSearchQuery.toLowerCase().trim();

      if (q && !name.includes(q) && !email.includes(q)) {
        return false;
      }

      const scoreEntry = candidateResults[inv.id];
      const result = scoreEntry?.result;
      const pass = result?.passed;
      const status = inv.status;

      if (candidateStatusFilter === "PASSED" && !pass) return false;
      if (candidateStatusFilter === "FAILED" && (pass === undefined || pass === true)) return false;
      if (candidateStatusFilter === "INVITED" && status !== "PENDING") return false;
      if (candidateStatusFilter === "IN_PROGRESS" && status !== "ACCEPTED") return false;
      if (candidateStatusFilter === "SUBMITTED" && status !== "SUBMITTED") return false;

      return true;
    });


  }, [invitations, candidateSearchQuery, candidateStatusFilter, candidateResults]);

  const totalCandidatePages = Math.max(
    1,
    Math.ceil(filteredCandidates.length / candidateRowsPerPage)
  );
  const paginatedCandidates = useMemo(() => {
    const start = (candidatePage - 1) * candidateRowsPerPage;
    return filteredCandidates.slice(start, start + candidateRowsPerPage);
  }, [filteredCandidates, candidatePage, candidateRowsPerPage]);

  const handleSelectAllCandidates = (checked: boolean) => {
    if (checked) {
      setSelectedCandidateIds(paginatedCandidates.map((c) => c.id));
    } else {
      setSelectedCandidateIds([]);
    }
  };

  const handleToggleCandidateSelect = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkResend = async () => {
    if (selectedCandidateIds.length === 0) {
      toast.error("Please select at least one candidate.");
      return;
    }
    try {
      const toResend = invitations.filter((i) => selectedCandidateIds.includes(i.id));
      await Promise.all(
        toResend.map((inv) =>
          candidateService.reissueInvitation(inv.scheduleId, inv.candidateId, inv.id)
        )
      );
      toast.success(`Resent invitations to ${selectedCandidateIds.length} candidate(s).`);
    } catch {
      toast.error("Failed to resend invitations.");
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedCandidateIds.length === 0) {
      toast.error("Please select at least one candidate.");
      return;
    }
    if (!confirm(`Revoke ${selectedCandidateIds.length} candidate invitations?`)) return;
    try {
      await Promise.all(
        selectedCandidateIds.map((invId) => candidateService.deleteInvitation(invId))
      );
      setInvitations((prev) => prev.filter((i) => !selectedCandidateIds.includes(i.id)));
      setSelectedCandidateIds([]);
      toast.success("Candidate invitations revoked successfully.");
    } catch {
      toast.error("Failed to revoke invitations.");
    }
  };

  const handleConfirmSingleResend = async () => {
    if (!candidateToResend) return;
    try {
      setResending(true);
      await candidateService.reissueInvitation(
        candidateToResend.scheduleId,
        candidateToResend.candidateId,
        candidateToResend.id
      );
      toast.success(
        `Invitation email resent to ${
          candidateToResend.candidateEmail || candidateToResend.candidate?.user?.email || "candidate"
        }.`
      );
      setIsResendModalOpen(false);
      setCandidateToResend(null);
    } catch {
      toast.error("Failed to resend invitation.");
    } finally {
      setResending(false);
    }
  };

  const handleConfirmSingleRevoke = async () => {
    if (!candidateToRevoke) return;
    try {
      setRevoking(true);
      await candidateService.deleteInvitation(candidateToRevoke.id);
      setInvitations((prev) => prev.filter((i) => i.id !== candidateToRevoke.id));
      toast.success("Candidate invitation revoked successfully.");
      setIsRevokeModalOpen(false);
      setCandidateToRevoke(null);
    } catch {
      toast.error("Failed to revoke invitation.");
    } finally {
      setRevoking(false);
    }
  };

  const downloadAdvancedReport = async (inv: CandidateInvitation) => {
    try {
      const name = inv.candidateName || inv.candidate?.user?.name || "Candidate";
      const email = inv.candidateEmail || inv.candidate?.user?.email || "";
      const scoreData = candidateResults[inv.id];

      if (!scoreData?.sessionId) {
        toast.error("No active session found to build advanced report.");
        return;
      }

      toast.info("Compiling telemetry into a premium PDF report...");

      const detailRes = await apiClient.get(
        `/api/admin/proctoring/candidates/${inv.candidateId}/details?scheduleId=${inv.scheduleId || selectedScheduleId || selectedScheduleData?.id}`,
      ).catch(() => ({ data: null }));
      const detailData = detailRes.data?.data ?? detailRes.data ?? scoreData?.detail;

      const [paperRes, resumeRes, timingsRes] = await Promise.all([
        apiClient.get(`/test-sessions/${scoreData.sessionId}/paper`).catch(() => ({ data: null })),
        apiClient.get(`/test-sessions/${scoreData.sessionId}/resume`).catch(() => ({ data: null })),
        apiClient.get(`/test-sessions/${scoreData.sessionId}/question-timings`).catch(() => ({ data: null })),
      ]);

      const paperData = paperRes.data?.data || paperRes.data;
      const resumeData = resumeRes.data?.data || resumeRes.data;
      const timingsList = timingsRes.data?.data || timingsRes.data || [];

      const questionsList = paperData?.paper?.questions || [];
      const submissionsList = resumeData?.submissions || [];

      const scoreText =
        scoreData?.result?.totalScore !== undefined
          ? `${scoreData.result.totalScore} / ${scoreData.result.maxScore || (scoreData.result.percentage ? Math.round((scoreData.result.totalScore / (scoreData.result.percentage / 100))) : scoreData.result.totalScore)}`
          : scoreData?.result?.score !== undefined
          ? `${scoreData.result.score} pts`
          : "N/A";
      const passText =
        scoreData?.result?.passed !== undefined
          ? scoreData.result.passed
            ? "PASSED"
            : "FAILED"
          : inv.status || "PENDING";

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
      doc.text(`SECURE ADVANCED PROCTORING TELEMETRY REPORT — TEST: ${testTitle.toUpperCase()}`, 14, 25);

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
            name,
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
            email,
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
            (inv.sessionStatus || inv.status || "N/A").replace(/_/g, " "),
            {
              content: "Total Violations:",
              styles: { fontStyle: "bold", textColor: [100, 116, 139] },
            },
            {
              content: String(detailData?.violationCount || detailData?.violations?.length || 0),
              styles: {
                fontStyle: "bold",
                textColor:
                  (detailData?.violationCount || detailData?.violations?.length || 0) > 0
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

      // Render Identity Verification Photo & Snapshots Evidence if present
      const candidatePhotoUrl = detailData?.candidatePhoto?.imageUrl || detailData?.candidatePhoto?.imageData;
      const allEvidence: Array<{ imageUrl?: string; imageData?: string; snapshotType?: string; capturedAt?: string }> = [
        ...(detailData?.candidatePhoto ? [detailData.candidatePhoto] : []),
        ...(detailData?.evidence || []),
        ...(detailData?.snapshots || []),
      ].filter((item) => Boolean(item?.imageUrl || item?.imageData));

      if (candidatePhotoUrl || allEvidence.length > 0) {
        let currentY = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 10;
        
        // Page overflow check
        if (currentY + 45 > 280) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text("IDENTITY VERIFICATION & PROCTORING SNAPSHOTS", 14, currentY);

        let imgX = 14;
        let imgY = currentY + 6;
        const imgW = 42;
        const imgH = 32;

        for (let sIdx = 0; sIdx < Math.min(allEvidence.length, 8); sIdx++) {
          const snap = allEvidence[sIdx];
          const src = snap.imageUrl || snap.imageData;
          if (!src) continue;

          if (imgX + imgW > 196) {
            imgX = 14;
            imgY += imgH + 12;
            if (imgY + imgH > 280) {
              doc.addPage();
              imgY = 20;
            }
          }

          try {
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "F");
            doc.addImage(src, "JPEG", imgX, imgY, imgW, imgH);
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            const label = snap.snapshotType ? snap.snapshotType.replace(/_/g, " ") : `Snapshot #${sIdx + 1}`;
            doc.text(label, imgX, imgY + imgH + 4);
          } catch {
            // fallback if canvas cross-origin or format error
          }
          imgX += imgW + 6;
        }

        // Advance finalY after images grid
        (doc as JsPDFWithAutoTable).lastAutoTable.finalY = imgY + imgH + 8;
      }

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
          const enrichedTQ = questions.find(
            (tq) => tq.questionId === questionId || tq.id === questionId || tq.question?.id === questionId,
          );
          const enrichedQuestion = enrichedTQ?.question;
          const correctOptions = (enrichedQuestion?.mcqOptions && enrichedQuestion.mcqOptions.length > 0)
            ? enrichedQuestion.mcqOptions
            : ((enrichedQuestion as any)?.options?.length > 0)
              ? (enrichedQuestion as any).options
              : (q.mcqOptions && q.mcqOptions.length > 0)
                ? q.mcqOptions
                : ((q as any).options?.length > 0)
                  ? (q as any).options
                  : [];

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
                content: `Question:\n${q.prompt || enrichedQuestion?.prompt || ""}`,
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
            const optionsList = (q.mcqOptions && q.mcqOptions.length > 0)
              ? q.mcqOptions
              : ((q as any).options?.length > 0)
                ? (q as any).options
                : (enrichedQuestion?.mcqOptions && enrichedQuestion.mcqOptions.length > 0)
                  ? enrichedQuestion.mcqOptions
                  : ((enrichedQuestion as any)?.options?.length > 0)
                    ? (enrichedQuestion as any).options
                    : [];
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
            pageBreak: "avoid",
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
              0: { cellWidth: 15 },
              1: { cellWidth: 42 },
              2: { cellWidth: 125 },
            },
            didDrawCell: (data) => {
              if (data.row.section === "head" && data.column.index === 1) {
                const cell = data.cell;
                const h = cell.height;

                doc.setFillColor(30, 41, 59);
                doc.setDrawColor(30, 41, 59);
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

                doc.setDrawColor(100, 116, 139);
                doc.setLineWidth(0.5);
                doc.line(cell.x, cell.y, cell.x, cell.y + h);
                doc.line(cell.x, cell.y + h, cell.x + cell.width, cell.y + h);
                doc.line(cell.x, cell.y, cell.x + cell.width - h, cell.y);
                doc.line(
                  cell.x + cell.width - h,
                  cell.y,
                  cell.x + cell.width,
                  cell.y + h,
                );

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

      doc.save(`Advanced_Report_${name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Advanced PDF Report downloaded.");
    } catch (e) {
      console.error("Failed to generate advanced PDF report:", e);
      toast.error("Failed to generate advanced PDF report.");
    }
  };

  const handleDownloadReport = () => {
    const candidatesToExport = invitations.length > 0 ? invitations : filteredCandidates;
    if (candidatesToExport.length === 0) {
      toast.error("No candidate data available to export.");
      return;
    }

    toast.info("Generating comprehensive Excel test report...");

    try {
      // Find distinct subjects for dynamic section scoring
      const distinctSubjects = Array.from(
        new Set(
          questions
            .map((q) => q.question?.subject?.name || (q as any).subject?.name || (q as any).subjectName)
            .filter(Boolean)
        )
      );

      // 1. Sheet: Candidate Performance Summary
      const summaryRows = candidatesToExport.map((inv) => {
        const name = inv.candidateName || inv.candidate?.user?.name || "Candidate";
        const email = inv.candidateEmail || inv.candidate?.user?.email || "—";
        const phone = inv.candidatePhone || inv.candidate?.user?.phoneNumber || "—";
        const college =
          inv.candidate?.organisation?.name ||
          (inv.candidate?.extraFields?.collegeName as string) ||
          (inv.candidate?.extraFields?.college as string) ||
          "—";
        const domain =
          (inv.candidate?.extraFields?.domain as string) ||
          (inv.candidate?.extraFields?.department as string) ||
          (inv.candidate?.extraFields?.branch as string) ||
          "—";

        const scoreEntry = candidateResults[inv.id];
        const result = scoreEntry?.result;
        const detail = scoreEntry?.detail;
        const session = scoreEntry?.session;

        const status =
          result?.passed === true
            ? "Passed"
            : result?.passed === false
            ? "Failed"
            : inv.sessionStatus || inv.status || "Pending";

        const totalMarks =
          result?.maxScore ??
          test?.totalMarks ??
          (questions.reduce((sum, q) => sum + (q.marks || 0), 0) || 100);

        const candidateScore =
          result?.totalScore !== undefined
            ? result.totalScore
            : result?.score !== undefined
            ? result.score
            : 0;

        const percentage =
          result?.percentage !== undefined
            ? `${result.percentage}%`
            : result?.scorePercentage !== undefined
            ? `${result.scorePercentage}%`
            : "0%";

        const startedAt =
          session?.startedAt ||
          session?.startTime ||
          detail?.systemInfo?.startedAt ||
          detail?.startedAt;

        const endedAt =
          session?.submittedAt ||
          session?.endedAt ||
          session?.endTime ||
          detail?.systemInfo?.endedAt ||
          detail?.submittedAt ||
          result?.evaluatedAt;

        let timeTaken = "—";
        if (result?.timeTakenSeconds) {
          timeTaken = formatTimeTaken(result.timeTakenSeconds);
        } else if (startedAt && endedAt) {
          const diffSec = Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
          timeTaken = formatTimeTaken(diffSec);
        } else if (result?.timeTaken) {
          timeTaken = String(result.timeTaken);
        } else if (detail?.timeTaken) {
          timeTaken = String(detail.timeTaken);
        }

        // Proctoring metrics
        const violations: any[] = detail?.violations || [];
        const violationsCount = detail?.violationsCount ?? detail?.violationCount ?? violations.length;
        const criticalViolations =
          detail?.criticalViolationsCount ??
          detail?.criticalViolationCount ??
          violations.filter((v: any) => v.severity === "HIGH" || v.severity === "CRITICAL").length;

        const tabSwitchCount = violations.filter((v: any) => v.eventType === "TAB_SWITCH").length;
        const fullscreenExitCount = violations.filter((v: any) => v.eventType === "FULLSCREEN_EXIT").length;
        const devtoolsCount = violations.filter((v: any) => v.eventType === "DEVTOOLS_OPEN" || v.eventType === "DEVTOOLS").length;
        const copyPasteCount = violations.filter((v: any) => v.eventType === "COPY_PASTE").length;
        const faceNotVisibleCount = violations.filter((v: any) => v.eventType === "FACE_NOT_VISIBLE" || v.eventType === "NO_FACE").length;
        const multipleFacesCount = violations.filter((v: any) => v.eventType === "MULTIPLE_FACES").length;
        const suspiciousAudioCount = violations.filter((v: any) => v.eventType === "SUSPICIOUS_AUDIO" || v.eventType === "AUDIO_VIOLATION").length;
        const objectDetectedCount = violations.filter((v: any) => v.eventType === "OBJECT_DETECTED" || v.eventType === "CELL_PHONE").length;
        const framesCaptured = (detail?.snapshots?.length || 0) + (detail?.evidence?.length || 0);

        const riskLevel =
          detail?.riskLevel ||
          (detail?.riskScore !== undefined
            ? detail.riskScore > 60
              ? "Severe"
              : detail.riskScore > 30
              ? "Minor"
              : "Negligible"
            : "Negligible");

        const trustScore =
          detail?.trustScore ??
          (detail?.riskScore !== undefined ? Math.max(0, 100 - Math.round(detail.riskScore)) : 100);

        // Problem breakdown
        const submissions: any[] = detail?.submissions || [];
        const totalProblems = questions.length || 0;
        const solvedProblems =
          submissions.filter((s: any) => s.isPassed || s.score > 0).length ||
          (status === "Passed" ? totalProblems : 0);

        const technologiesUsed =
          Array.from(new Set(submissions.map((s: any) => s.language || s.type || "Coding"))).join(", ") ||
          (questions.some((q) => q.question?.questionType === "CODING") ? "Coding" : "MCQ");

        const rowObj: Record<string, any> = {
          "Full Name": name,
          "Email": email,
          "Phone Number": phone,
          "College / Organisation": college,
          "Domain / Branch": domain,
          "Status": status,
          "Verdict": result?.passed === true ? "Passed" : result?.passed === false ? "Failed" : "Pending",
          "Invited On": inv.createdAt || inv.sentAt ? new Date(inv.createdAt || inv.sentAt || "").toLocaleString() : "—",
          "Started At": startedAt ? new Date(startedAt).toLocaleString() : "—",
          "Submitted At": endedAt ? new Date(endedAt).toLocaleString() : "—",
          "Time Taken": timeTaken,
          "Test Max Score": totalMarks,
          "Candidate Score": candidateScore,
          "% Score": percentage,
          "Total no. of Problems": totalProblems,
          "No. of Problems Solved": solvedProblems,
          "Technologies Used": technologiesUsed,
          "Proctoring Verdict": riskLevel,
          "Trust Score": trustScore,
          "Total Number of Violations": violationsCount,
          "Critical Violations": criticalViolations,
          "Navigation / Tab Switch Violations": tabSwitchCount,
          "Fullscreen Exit Violations": fullscreenExitCount,
          "DevTools Violations": devtoolsCount,
          "Copy Paste Violations": copyPasteCount,
          "Frames without a Face": faceNotVisibleCount,
          "Frames with Multiple Faces": multipleFacesCount,
          "Suspicious Audio Violations": suspiciousAudioCount,
          "Prohibited Object Detected": objectDetectedCount,
          "Frames Captured": framesCaptured,
          "Report Url": `${window.location.origin}/admin/tests/${id}?tab=candidates&candidateId=${inv.candidateId}`,
        };

        // Dynamic Section/Subject Breakdown
        distinctSubjects.forEach((subj) => {
          const subjQuestions = questions.filter(
            (q) => (q.question?.subject?.name || (q as any).subject?.name || (q as any).subjectName) === subj
          );
          const subjMax = subjQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
          let subjScore = 0;
          subjQuestions.forEach((sq) => {
            const sub = submissions.find((s: any) => s.questionId === sq.questionId);
            if (sub) subjScore += sub.score || 0;
          });
          rowObj[`${subj} - Max Score`] = subjMax;
          rowObj[`${subj} - Candidate Score`] = subjScore;
        });

        return rowObj;
      });

      // 2. Sheet: Question-by-Question Submissions
      const submissionRows: Array<Record<string, any>> = [];
      candidatesToExport.forEach((inv) => {
        const name = inv.candidateName || inv.candidate?.user?.name || "Candidate";
        const email = inv.candidateEmail || inv.candidate?.user?.email || "—";
        const scoreEntry = candidateResults[inv.id];
        const submissions: any[] = scoreEntry?.detail?.submissions || [];

        questions.forEach((tq, idx) => {
          const q = tq.question || (tq as any);
          const sub = submissions.find((s: any) => s.questionId === tq.questionId || s.questionId === q?.id);
          submissionRows.push({
            "Candidate Name": name,
            "Email Address": email,
            "Question #": idx + 1,
            "Question Title": q?.title || `Question ${idx + 1}`,
            "Question Type": q?.questionType || "MCQ",
            "Subject": q?.subject?.name || "General",
            "Max Marks": tq.marks || 0,
            "Score Obtained": sub?.score ?? 0,
            "Passed / Solved": sub?.isPassed ? "YES" : "NO",
            "Language Used": sub?.language || "N/A",
            "Submitted At": sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "—",
          });
        });
      });

      // 3. Sheet: Proctoring Violations Log
      const violationRows: Array<Record<string, any>> = [];
      candidatesToExport.forEach((inv) => {
        const name = inv.candidateName || inv.candidate?.user?.name || "Candidate";
        const email = inv.candidateEmail || inv.candidate?.user?.email || "—";
        const scoreEntry = candidateResults[inv.id];
        const violations: any[] = scoreEntry?.detail?.violations || [];

        if (violations.length === 0) {
          violationRows.push({
            "Candidate Name": name,
            "Email Address": email,
            "Timestamp": "—",
            "Violation Type": "None",
            "Severity": "INFO",
            "Description": "Clean session — no violations recorded",
          });
        } else {
          violations.forEach((v: any) => {
            violationRows.push({
              "Candidate Name": name,
              "Email Address": email,
              "Timestamp": v.occurredAt || v.time ? new Date(v.occurredAt || v.time || "").toLocaleString() : "—",
              "Violation Type": (v.eventType || "VIOLATION").replace(/_/g, " "),
              "Severity": v.severity || "MEDIUM",
              "Description": v.metadata?.description || v.description || `Triggered ${v.eventType || "violation"}`,
            });
          });
        }
      });

      // Create Workbook & Sheets
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsSubmissions = XLSX.utils.json_to_sheet(submissionRows.length > 0 ? submissionRows : [{ "Status": "No submissions recorded" }]);
      const wsViolations = XLSX.utils.json_to_sheet(violationRows);

      // Auto-fit Column Widths
      const autoFitCols = (rows: Array<Record<string, unknown>>) => {
        if (!rows || rows.length === 0) return [];
        const keys = Object.keys(rows[0]);
        return keys.map((key) => {
          const maxLen = rows.reduce((max, row) => {
            const cellVal = String(row[key] ?? "");
            return Math.max(max, cellVal.length);
          }, key.length);
          return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
        });
      };

      wsSummary["!cols"] = autoFitCols(summaryRows);
      if (submissionRows.length > 0) wsSubmissions["!cols"] = autoFitCols(submissionRows);
      wsViolations["!cols"] = autoFitCols(violationRows);

      XLSX.utils.book_append_sheet(wb, wsSummary, "Assessment Summary");
      XLSX.utils.book_append_sheet(wb, wsSubmissions, "Question Submissions");
      XLSX.utils.book_append_sheet(wb, wsViolations, "Proctoring Violations");

      const testTitleSafe = (title || test?.title || "Assessment").replace(/[^a-zA-Z0-9_-]/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `${testTitleSafe}_Complete_Report_${dateStr}.xlsx`);

      toast.success(`Complete assessment report exported for ${candidatesToExport.length} candidate(s).`);
    } catch (err) {
      console.error("[NewAdminTestEdit] Failed to export Excel report:", err);
      toast.error("Failed to generate complete Excel report.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex flex-col items-center justify-center text-slate-700">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-medium">Loading Test Configuration...</p>
      </div>
    );
  }

  const testTitle = test?.title || title || "Untitled Test";
  const durationStr = formatDuration(test?.durationMins || Number(durationMins));

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* ── 1. Top Navbar (Dark Gryphon360 Navbar) ── */}
      <header className="h-20 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Breadcrumb */}
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <div
            onClick={() => navigate("/admin/tests")}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <img
              src="/Gryphon360logo.png"
              alt="Gryphon 360"
              className="h-12 md:h-14 w-auto object-contain shrink-0 hover:opacity-95 transition-opacity"
            />
          </div>

          <div className="h-5 w-[1px] bg-slate-700 mx-1 shrink-0" />

          <div className="flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5 truncate">
            <button
              onClick={() => navigate("/admin/tests")}
              className="hover:text-slate-200 cursor-pointer transition-colors shrink-0"
            >
              Tests
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-200 font-semibold truncate max-w-[200px] md:max-w-md">
              {testTitle}
            </span>
          </div>
        </div>

        {/* Right Side: User Profile */}
        <div className="flex items-center space-x-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2 py-1 hover:bg-white/5 transition-colors focus:outline-none cursor-pointer">
                <Avatar className="w-8 h-8 border border-slate-700 bg-slate-800 text-slate-200">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
                    alt={user?.name || "Admin"}
                  />
                  <AvatarFallback className="bg-[#4353a4] text-white text-xs font-bold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex items-center">
                  <span className="text-xs font-semibold text-slate-200">
                    {user?.name || "Admin User"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-2xl p-1 text-xs">
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || "Admin User"}</p>
                  <p className="text-xs text-slate-500 leading-none truncate mt-1">{user?.email || "admin@gryphon360.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => navigate("/admin/tests")}
                className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
                Back to Tests
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => logout && logout()}
                className="cursor-pointer text-red-600 hover:bg-red-50 px-3 py-2 text-xs flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── 2. Main Content Workspace ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-6">
        {/* Top Header Row: Test Name + Duration */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {testTitle}
            </h1>
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#10B981] text-white shrink-0 shadow-xs"
              title="Active & Verified"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{durationStr}</span>
            </span>
          </div>
        </div>

        {/* ── 3. Tab Navigations (4 Standalone Tabs) ── */}
        <div className="bg-white border border-slate-200/90 shadow-sm px-6 flex items-center overflow-x-auto scrollbar-none">
          {/* PROBLEMS TAB */}
          <button
            onClick={() => setActiveTab("PROBLEMS")}
            className={`py-3.5 px-4 text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === "PROBLEMS"
                ? "border-[#10B981] text-[#0d9488]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>PROBLEMS</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                activeTab === "PROBLEMS"
                  ? "bg-[#081225] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {questions.length}
            </span>
          </button>

          {/* GENERAL SETTINGS TAB */}
          <button
            onClick={() => setActiveTab("GENERAL_SETTINGS")}
            className={`py-3.5 px-4 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === "GENERAL_SETTINGS"
                ? "border-[#10B981] text-[#0d9488]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>GENERAL SETTINGS</span>
          </button>

          {/* ADVANCED SETTINGS TAB */}
          <button
            onClick={() => setActiveTab("ADVANCED_SETTINGS")}
            className={`py-3.5 px-4 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === "ADVANCED_SETTINGS"
                ? "border-[#10B981] text-[#0d9488]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>ADVANCED SETTINGS</span>
          </button>

          {/* CANDIDATES TAB */}
          <button
            onClick={() => setActiveTab("CANDIDATES")}
            className={`py-3.5 px-4 text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === "CANDIDATES"
                ? "border-[#10B981] text-[#0d9488]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>CANDIDATES</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                activeTab === "CANDIDATES"
                  ? "bg-[#081225] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {invitations.length}
            </span>
          </button>
        </div>

        {/* ── 4. Tab Content Body ── */}
        <div>
          {/* ── PROBLEMS TAB ── */}
          {activeTab === "PROBLEMS" && (
            <div className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              {/* Header Bar */}
              <div className="p-4 bg-white flex items-center justify-between border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Problems</span>
                <div className="flex items-center gap-2">
                  {/* Add Section */}
                  {addSectionOpen ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type="text"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleConfirmNewSection(); if (e.key === "Escape") { setAddSectionOpen(false); setNewSectionName(""); } }}
                        placeholder="Section name…"
                        className="text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 w-36"
                      />
                      <button onClick={handleConfirmNewSection} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer">✓</button>
                      <button onClick={() => { setAddSectionOpen(false); setNewSectionName(""); }} className="text-xs px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddSectionOpen(true)}
                      className="text-xs px-2.5 py-1 border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer flex items-center gap-1"
                      title="Add a section"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Section</span>
                    </button>
                  )}
                  {/* Add Problem */}
                  <button
                    onClick={() => navigate(id ? `/admin/tests/${id}/add-problems` : "/admin/library")}
                    className="p-1 text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
                    title="Add problem from library"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Problems — section-grouped list */}
              {questions.length === 0 && sectionOrder.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 text-xs space-y-2">
                  <p>No problems added to this test yet.</p>
                  <button
                    onClick={() => navigate(id ? `/admin/tests/${id}/add-problems` : "/admin/library")}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-none transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add from Library</span>
                  </button>
                </div>
              ) : (
                <div>
                  {sectionOrder
                    .filter((section) => {
                      if (section === "Ungrouped") {
                        const hasOtherSections = sectionOrder.some((s) => s !== "Ungrouped");
                        const ungroupedCount = (groupedQuestions["Ungrouped"] || []).length;
                        return !hasOtherSections || ungroupedCount > 0;
                      }
                      return true;
                    })
                    .map((section) => {
                    const sectionQs = groupedQuestions[section] || [];
                    const isCollapsed = collapsedSections.has(section);
                    const answeredHere = sectionQs.length;
                    return (
                      <div key={section} className="border-b border-slate-100 last:border-b-0">
                        {/* Section Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50/70 hover:bg-slate-100/60 transition-colors">
                          <button
                            onClick={() => setCollapsedSections((prev) => {
                              const next = new Set(prev);
                              if (next.has(section)) next.delete(section); else next.add(section);
                              return next;
                            })}
                            className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer flex-1 text-left"
                          >
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{section}</span>
                            <span className="ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{answeredHere}</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/tests/${id}/add-problems?section=${encodeURIComponent(section)}`)}
                              className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer px-2 py-1 rounded bg-indigo-50/80 hover:bg-indigo-100"
                              title={`Add questions directly to ${section}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Here</span>
                            </button>
                            {section !== "Ungrouped" && (
                              <button
                                onClick={() => handleDeleteSection(section)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title={`Delete section "${section}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Questions in this section */}
                        {!isCollapsed && (
                          <div className="divide-y divide-slate-50">
                            {sectionQs.length === 0 ? (
                              <div className="px-8 py-3 text-xs text-slate-400 italic">No questions in this section yet.</div>
                            ) : (
                              sectionQs.map((tq, index) => {
                                const q = tq.question;
                                const isCoding = (q?.questionType ?? "").toUpperCase() === "CODING";
                                const qTitle = q?.title || `Question ${index + 1}`;
                                const marks = tq.marks ?? q?.marks ?? 10;
                                const difficulty = q?.difficulty || "MEDIUM";
                                const mcqSubtype = q?.mcqType ? fmtMcqType(q.mcqType) : undefined;
                                const testCasesCount = isCoding
                                  ? `${(q as any)?.testCases?.length || (q as any)?.testCaseCount || 0} test cases`
                                  : undefined;

                                return (
                                  <div
                                    key={tq.id || index}
                                    className="pl-9 pr-5 py-4 hover:bg-slate-50/60 transition-colors space-y-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{qTitle}</h3>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200 shadow-xl p-1 text-xs">
                                          <DropdownMenuItem
                                            onClick={() => { if (q) navigate(`/admin/questions/preview/${q.id}`, { state: q }); }}
                                            className="cursor-pointer py-1.5 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Preview Problem</span>
                                          </DropdownMenuItem>
                                          {/* Move to Section */}
                                          {sectionOrder.filter((s) => s !== section).length > 0 && (
                                            <>
                                              <DropdownMenuSeparator className="bg-slate-100" />
                                              <DropdownMenuLabel className="text-[10px] text-slate-400 px-2.5 py-1">Move to section</DropdownMenuLabel>
                                              {sectionOrder.filter((s) => s !== section).map((targetSection) => (
                                                <DropdownMenuItem
                                                  key={targetSection}
                                                  onClick={() => handleMoveToSection(tq, targetSection)}
                                                  className="cursor-pointer py-1.5 px-2.5 text-slate-700 hover:bg-slate-50"
                                                >
                                                  → {targetSection}
                                                </DropdownMenuItem>
                                              ))}
                                            </>
                                          )}
                                          <DropdownMenuSeparator className="bg-slate-100" />
                                          <DropdownMenuItem
                                            onClick={() => handleRemoveQuestion(tq.id)}
                                            className="cursor-pointer py-1.5 px-2.5 flex items-center gap-2 text-red-600 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            <span>Remove from Test</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>

                                    {/* Metadata row */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                      <div className="flex items-center gap-1 font-mono text-slate-400">
                                        <span>=</span>
                                        <span className="text-slate-600 font-sans">{isCoding ? "Coding" : "MCQ"}</span>
                                      </div>
                                      {!isCoding && mcqSubtype && (
                                        <div className="flex items-center gap-1"><span className="text-slate-400 text-[11px]">⊙</span><span>{mcqSubtype}</span></div>
                                      )}
                                      {difficulty && (
                                        <div className="flex items-center gap-1"><span className="text-slate-400 text-[10px]">❖</span><span>{fmt(difficulty)}</span></div>
                                      )}
                                      {marks !== undefined && (
                                        <div className="flex items-center gap-1"><LayoutGrid className="w-3 h-3 text-slate-400" /><span>{marks} points</span></div>
                                      )}
                                      {testCasesCount && (
                                        <div className="flex items-center gap-1"><span className="text-slate-400 font-mono text-[11px]">⊘</span><span>{testCasesCount}</span></div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── GENERAL SETTINGS TAB ── */}
          {activeTab === "GENERAL_SETTINGS" && (
            <div className="border border-slate-200/90 shadow-sm bg-white p-6 md:p-8 space-y-7">
              {/* 1. Test Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Test name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Full Stack Developer Assessment"
                  className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                />
                <p className="text-[11px] text-slate-400">A clear, descriptive name helps candidates identify the assessment.</p>
              </div>

              {/* 2. Duration & Passing Mark */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-1">
                {/* Duration */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Test duration (in minutes) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Total duration permitted for candidates to attempt this test.</p>
                  <input
                    type="number"
                    min={1}
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    placeholder="60"
                    className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                  />
                </div>

                {/* Passing Mark */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Passing percentage (%) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Minimum score threshold required to pass the assessment.</p>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passMark}
                    onChange={(e) => setPassMark(e.target.value)}
                    placeholder="40"
                    className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* 3. Difficulty Level */}
              <div className="space-y-2 pt-1 w-full">
                <label className="block text-xs font-semibold text-slate-700">
                  Difficulty level
                </label>
                <p className="text-[11px] text-slate-400">Appropriate difficulty level calibrates recommendations and candidate expectations.</p>
                <div className="grid grid-cols-3 w-full pt-1.5">
                  {(["EASY", "MEDIUM", "HARD"] as const).map((lvl) => (
                    <label key={lvl} className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="radio"
                        name="difficultyLevel"
                        value={lvl}
                        checked={difficulty === lvl}
                        onChange={() => setDifficulty(lvl)}
                        className="w-5 h-5 text-[#4353a4] focus:ring-[#4353a4] border-slate-300 cursor-pointer"
                      />
                      <span>{fmt(lvl)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Description */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an overview, target skills, or objectives for this test..."
                  className="w-full border border-slate-200 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4353a4] leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">Brief summary of the test curriculum and intended evaluation areas.</p>
              </div>

              {/* 5. Candidate Instructions */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Instructions for candidates
                </label>
                <RichTextEditor
                  content={instructions}
                  onChange={setInstructions}
                  placeholder="e.g. Ensure a stable internet connection. All tests are timed and monitored..."
                  minHeight="140px"
                />
                <p className="text-[11px] text-slate-400">Instructions will be displayed to candidates on the assessment landing screen before starting.</p>
              </div>

              {/* 6. Save Action Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={handleSaveGeneralSettings}
                  disabled={savingGeneralSettings}
                  className="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white text-xs font-bold tracking-wider uppercase shadow-xs transition-colors rounded-none cursor-pointer inline-flex items-center gap-2"
                >
                  {savingGeneralSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── ADVANCED SETTINGS TAB (Exact Admin Section Match) ── */}
          {activeTab === "ADVANCED_SETTINGS" && (
            <div className="space-y-6">
              {/* 1. Test Schedule Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900 font-heading">
                    Test Schedule
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Set the availability window for this test (Organisation is set to your Admin home by default)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Starting Time */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-900">Starting time</Label>
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
                      <Label className="text-sm font-semibold text-slate-900">Ending time</Label>
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
                    className="bg-[#10B981] hover:bg-[#059669] text-white"
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

              {/* 2. Proctoring Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900 font-heading">
                    Proctoring Settings
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configure anti-cheating and monitoring rules for this assessment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="proctoringMode" className="text-sm font-semibold text-slate-900">
                      Proctoring Mode
                    </Label>
                    <Select
                      value={proctoringMode}
                      onValueChange={(val) => handleProctoringModeChange(val as ProctoringMode)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select proctoring mode" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="NONE">No Proctoring</SelectItem>
                        <SelectItem value="LOW">Low Proctoring</SelectItem>
                        <SelectItem value="MEDIUM">Medium Proctoring</SelectItem>
                        <SelectItem value="HIGH">High Proctoring</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {proctoringMode === "NONE" ? (
                    <p className="text-sm text-muted-foreground italic">
                      This assessment will run without proctoring.
                    </p>
                  ) : (
                    <div className="space-y-6 pt-2">
                      {/* Category 1: Browser Controls */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                          Browser & Shell Control
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="enableTabSwitchTracking"
                                checked={enableTabSwitchTracking}
                                onCheckedChange={(checked) =>
                                  setEnableTabSwitchTracking(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!enableTabSwitchTracking && proctoringMode !== "CUSTOM" && (
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
                                checked={blockCopyPaste}
                                onCheckedChange={(checked) =>
                                  setBlockCopyPaste(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!blockCopyPaste && proctoringMode !== "CUSTOM" && (
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
                                checked={blockRightClick}
                                onCheckedChange={(checked) =>
                                  setBlockRightClick(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!blockRightClick && proctoringMode !== "CUSTOM" && (
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
                                checked={warnOnFullscreenExit}
                                onCheckedChange={(checked) =>
                                  setWarnOnFullscreenExit(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!warnOnFullscreenExit && proctoringMode !== "CUSTOM" && (
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

                        <div className="pt-2 max-w-xs space-y-2">
                          <Label htmlFor="maxWarnings" className="text-sm font-normal">
                            Max Warnings Allowed
                          </Label>
                          <Input
                            id="maxWarnings"
                            type="number"
                            min="0"
                            value={maxWarnings}
                            onChange={(e) => setMaxWarnings(parseInt(e.target.value, 10) || 0)}
                            disabled={proctoringMode !== "CUSTOM"}
                            className="w-32 bg-white"
                          />
                        </div>
                      </div>

                      {/* Category 2: Webcam & Audio Monitoring */}
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                          Webcam & Audio Monitoring
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="requireWebcam"
                                checked={requireWebcam}
                                onCheckedChange={(checked) =>
                                  setRequireWebcam(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!requireWebcam && proctoringMode !== "CUSTOM" && (
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
                                checked={detectFaceNotVisible}
                                onCheckedChange={(checked) =>
                                  setDetectFaceNotVisible(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!detectFaceNotVisible && proctoringMode !== "CUSTOM" && (
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
                                checked={detectMultipleFaces}
                                onCheckedChange={(checked) =>
                                  setDetectMultipleFaces(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!detectMultipleFaces && proctoringMode !== "CUSTOM" && (
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
                                checked={detectSuspiciousAudio}
                                onCheckedChange={(checked) =>
                                  setDetectSuspiciousAudio(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!detectSuspiciousAudio && proctoringMode !== "CUSTOM" && (
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
                                id="detectObjects"
                                checked={detectObjects}
                                onCheckedChange={(checked) =>
                                  setDetectObjects(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!detectObjects && proctoringMode !== "CUSTOM" && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                            <Label
                              htmlFor="detectObjects"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Detect prohibited objects (phones/books)
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="periodicSnapshots"
                                checked={periodicSnapshots}
                                onCheckedChange={(checked) =>
                                  setPeriodicSnapshots(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!periodicSnapshots && proctoringMode !== "CUSTOM" && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                            <Label
                              htmlFor="periodicSnapshots"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Periodic snapshots
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="evidenceCapture"
                                checked={evidenceCapture}
                                onCheckedChange={(checked) =>
                                  setEvidenceCapture(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!evidenceCapture && proctoringMode !== "CUSTOM" && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                            <Label
                              htmlFor="evidenceCapture"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Capture snapshot evidence
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="requireMicrophone"
                                checked={requireMicrophone}
                                onCheckedChange={(checked) =>
                                  setRequireMicrophone(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!requireMicrophone && proctoringMode !== "CUSTOM" && (
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
                                checked={requireScreenShare}
                                onCheckedChange={(checked) =>
                                  setRequireScreenShare(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!requireScreenShare && proctoringMode !== "CUSTOM" && (
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
                                checked={detectDevTools}
                                onCheckedChange={(checked) =>
                                  setDetectDevTools(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!detectDevTools && proctoringMode !== "CUSTOM" && (
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
                                checked={detectScreenShareStop}
                                onCheckedChange={(checked) =>
                                  setDetectScreenShareStop(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!detectScreenShareStop && proctoringMode !== "CUSTOM" && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                            <Label
                              htmlFor="detectScreenShareStop"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Detect screen share stop
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="enableLiveProctoring"
                                checked={enableLiveProctoring}
                                onCheckedChange={(checked) =>
                                  setEnableLiveProctoring(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!enableLiveProctoring && proctoringMode !== "CUSTOM" && (
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

                          <div className="flex items-center space-x-2">
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                id="autoSubmitOnCriticalViolations"
                                checked={autoSubmitOnCriticalViolations}
                                onCheckedChange={(checked) =>
                                  setAutoSubmitOnCriticalViolations(!!checked)
                                }
                                disabled={proctoringMode !== "CUSTOM"}
                              />
                              {!autoSubmitOnCriticalViolations && proctoringMode !== "CUSTOM" && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm border border-red-500/40 bg-red-500/10 text-red-500">
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                            <Label
                              htmlFor="autoSubmitOnCriticalViolations"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Auto-submit on critical violations
                            </Label>
                          </div>
                        </div>

                        {autoSubmitOnCriticalViolations && (
                          <div className="pt-2 max-w-xs space-y-2">
                            <Label htmlFor="maxCriticalViolations" className="text-sm font-normal">
                              Max Critical Violations
                            </Label>
                            <Input
                              id="maxCriticalViolations"
                              type="number"
                              min="1"
                              value={maxCriticalViolations}
                              onChange={(e) => setMaxCriticalViolations(parseInt(e.target.value, 10) || 0)}
                              disabled={proctoringMode !== "CUSTOM"}
                              className="w-32 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t px-6 py-4 bg-muted/20">
                  {isProctoringDirty && (
                    <span className="text-xs text-muted-foreground self-center mr-auto">
                      You have unsaved proctoring changes
                    </span>
                  )}
                  <Button
                    type="button"
                    onClick={handleSaveProctoring}
                    disabled={savingProctoring || !isProctoringDirty}
                    size="sm"
                    className="bg-[#10B981] hover:bg-[#059669] text-white"
                  >
                    {savingProctoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving Proctoring...
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
            </div>
          )}

          {/* ── CANDIDATES (Merged Reports & Invitations) ── */}
          {activeTab === "CANDIDATES" && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* Left Filter Sidebar */}
              <div className="lg:col-span-1 border border-slate-200 bg-white shadow-xs p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Filters</h3>
                  <button
                    onClick={() => {
                      setCandidateStatusFilter("ALL");
                      setCandidateSearchQuery("");
                      setInvitedByMe(false);
                    }}
                    className="text-xs font-semibold text-[#4353a4] hover:text-[#324080] cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Status Accordion */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setStatusAccordionOpen(!statusAccordionOpen)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <span>Status</span>
                    {statusAccordionOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {statusAccordionOpen && (
                    <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                      {[
                        { key: "ALL", label: `All (${invitations.length})` },
                        { key: "PASSED", label: "Passed" },
                        { key: "FAILED", label: "Failed" },
                        { key: "INVITED", label: "Invited (Pending)" },
                      ].map((st) => (
                        <label
                          key={st.key}
                          className="flex items-center gap-2 cursor-pointer py-1 px-1.5 hover:bg-slate-50 rounded"
                        >
                          <input
                            type="radio"
                            name="candidateStatus"
                            checked={candidateStatusFilter === st.key}
                            onChange={() => setCandidateStatusFilter(st.key)}
                            className="text-[#4353a4] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>{st.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invited on Accordion */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setInvitedOnAccordionOpen(!invitedOnAccordionOpen)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <span>Invited on</span>
                    {invitedOnAccordionOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                  {invitedOnAccordionOpen && (
                    <div className="pt-1 text-xs text-slate-500">
                      <p className="text-[11px] text-slate-400">All recent invitation batches</p>
                    </div>
                  )}
                </div>

                {/* Invited by me Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invitedByMe}
                      onChange={(e) => setInvitedByMe(e.target.checked)}
                      className="w-4 h-4 text-[#4353a4] rounded-none border-slate-300 focus:ring-0 cursor-pointer"
                    />
                    <span>Invited by me</span>
                  </label>
                </div>
              </div>

              {/* Right Main Table & Actions Area */}
              <div className="lg:col-span-3 border border-slate-200 bg-white shadow-xs">
                {/* 1. Search Bar & Action Buttons */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={candidateSearchQuery}
                      onChange={(e) => {
                        setCandidateSearchQuery(e.target.value);
                        setCandidatePage(1);
                      }}
                      placeholder="Search for a candidate..."
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-none focus:outline-none focus:border-[#4353a4] bg-white text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsBulkInviteOpen(true)}
                      className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                      <span>Bulk Import</span>
                    </button>

                    <button
                      onClick={() => setIsAddCandidatesOpen(true)}
                      className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold tracking-wider uppercase inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Candidates</span>
                    </button>

                    <button
                      onClick={handleDownloadReport}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold tracking-wider uppercase inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <CloudDownload className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>

                {/* 2. Bulk Action Toolbar (Resend & Revoke shifted right) */}
                <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={
                          paginatedCandidates.length > 0 &&
                          selectedCandidateIds.length === paginatedCandidates.length
                        }
                        onChange={(e) => handleSelectAllCandidates(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded-none border-slate-300 focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={handleBulkResend}
                      disabled={selectedCandidateIds.length === 0}
                      className="hover:text-slate-900 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>Re-send Invitation</span>
                    </button>

                    <button
                      onClick={handleBulkRevoke}
                      disabled={selectedCandidateIds.length === 0}
                      className="hover:text-red-600 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider cursor-pointer text-slate-500"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                      <span>Delete Invitations</span>
                    </button>
                  </div>
                </div>

                {/* 3. Candidate Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 w-10"></th>
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Total Score</th>
                        <th className="py-3 px-4">% Score</th>
                        <th className="py-3 px-4 text-right">More Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {loadingCandidatesData ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                            <span>Loading candidates...</span>
                          </td>
                        </tr>
                      ) : paginatedCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                            <p>No candidates invited yet or none match filters.</p>
                            <button
                              onClick={() => setIsAddCandidatesOpen(true)}
                              className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Candidates</span>
                            </button>
                          </td>
                        </tr>
                      ) : (
                        paginatedCandidates.map((inv) => {
                          const name = inv.candidateName || inv.candidate?.user?.name || "Candidate";
                          const email = inv.candidateEmail || inv.candidate?.user?.email || "—";
                          const scoreEntry = candidateResults[inv.id];
                          const result = scoreEntry?.result;
                          const isPassed = result?.passed === true;
                          const isFailed = result && result.passed === false;
                          const scoreVal =
                            result?.score !== undefined
                              ? result.score
                              : result?.totalScore !== undefined
                              ? result.totalScore
                              : "—";
                          const percentVal =
                            result?.percentage !== undefined
                              ? `${result.percentage}%`
                              : result?.scorePercentage !== undefined
                              ? `${result.scorePercentage}%`
                              : "—";
                          const rawDate = inv.createdAt || inv.sentAt;
                          const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : "—";

                          let timeStr = "—";
                          const startedAt =
                            scoreEntry?.session?.startedAt ||
                            scoreEntry?.session?.startTime ||
                            scoreEntry?.session?.createdAt ||
                            scoreEntry?.detail?.systemInfo?.startedAt ||
                            scoreEntry?.detail?.startedAt ||
                            scoreEntry?.detail?.createdAt;

                          const endedAt =
                            scoreEntry?.session?.submittedAt ||
                            scoreEntry?.session?.endedAt ||
                            scoreEntry?.session?.endTime ||
                            scoreEntry?.session?.updatedAt ||
                            scoreEntry?.detail?.systemInfo?.endedAt ||
                            scoreEntry?.detail?.systemInfo?.submittedAt ||
                            scoreEntry?.detail?.submittedAt ||
                            scoreEntry?.detail?.endedAt ||
                            result?.evaluatedAt ||
                            result?.createdAt;

                          if (result?.timeTakenSeconds) {
                            timeStr = formatTimeTaken(result.timeTakenSeconds);
                          } else if (startedAt && endedAt) {
                            const diffSec = Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
                            timeStr = formatTimeTaken(diffSec);
                          } else if (result?.timeTaken) {
                            timeStr = String(result.timeTaken);
                          } else if (scoreEntry?.detail?.timeTaken) {
                            timeStr = String(scoreEntry.detail.timeTaken);
                          }

                          let statusBadge = (
                            <span className="font-semibold text-slate-600">
                              {inv.status === "ACCEPTED"
                                ? "Accepted"
                                : inv.status === "PENDING"
                                ? "Invited"
                                : inv.status || "Pending"}
                            </span>
                          );

                          if (isPassed) {
                            statusBadge = (
                              <span className="font-semibold text-emerald-700">Passed</span>
                            );
                          } else if (isFailed) {
                            statusBadge = (
                              <span className="font-semibold text-rose-600">Failed</span>
                            );
                          } else if (inv.status === "SUBMITTED" || inv.sessionStatus === "SUBMITTED" || inv.sessionStatus === "AUTO_SUBMITTED") {
                            statusBadge = (
                              <span className="font-semibold text-emerald-700">Submitted</span>
                            );
                          } else if (inv.status === "ACCEPTED" || inv.sessionStatus === "IN_PROGRESS") {
                            statusBadge = (
                              <span className="font-semibold text-amber-600">In Progress</span>
                            );
                          }

                          return (
                            <tr
                              key={inv.id}
                              className={`hover:bg-amber-50/40 transition-colors ${
                                selectedCandidateIds.includes(inv.id) ? "bg-amber-50/50" : ""
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-3.5 px-4">
                                <input
                                  type="checkbox"
                                  checked={selectedCandidateIds.includes(inv.id)}
                                  onChange={() => handleToggleCandidateSelect(inv.id)}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded-none border-slate-300 focus:ring-0 cursor-pointer"
                                />
                              </td>

                              {/* Candidate Info */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8 border border-slate-200">
                                    <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-bold">
                                      {name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900">{name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-normal">
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span>{email}</span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{dateStr}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">{statusBadge}</td>

                              {/* Time */}
                              <td className="py-3.5 px-4 font-medium text-slate-700">{timeStr}</td>

                              {/* Total Score */}
                              <td className="py-3.5 px-4 font-bold text-slate-900">{scoreVal}</td>

                              {/* % Score */}
                              <td className="py-3.5 px-4 font-bold text-slate-900">{percentVal}</td>

                              {/* 3-dots Menu */}
                              <td className="py-3.5 px-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer rounded">
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48 bg-white border border-slate-200 shadow-xl p-1 text-xs"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => downloadAdvancedReport(inv)}
                                      className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                                    >
                                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Download Report</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCandidateToResend(inv);
                                        setIsResendModalOpen(true);
                                      }}
                                      className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                                    >
                                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Resend Invitation</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        const scoreEntry = candidateResults[inv.id];
                                        const sessionId =
                                          scoreEntry?.sessionId ||
                                          scoreEntry?.session?.id ||
                                          scoreEntry?.detail?.systemInfo?.sessionId ||
                                          scoreEntry?.detail?.sessionId ||
                                          (inv as any).sessionId ||
                                          (inv as any).testSessionId;

                                        if (!sessionId) {
                                          toast.error("No active test session found for this candidate yet.");
                                          return;
                                        }

                                        const candName = inv.candidateName || inv.candidate?.user?.name || "Candidate";
                                        const candEmail = inv.candidateEmail || inv.candidate?.user?.email;

                                        setCandidateForTimeExtension({
                                          id: sessionId,
                                          candidateId: inv.candidateId,
                                          candidateName: candName,
                                          candidateEmail: candEmail,
                                          testTitle: title || test?.title || "Assessment",
                                          formattedRemaining: "Active",
                                        });
                                        setIsExtendTimeModalOpen(true);
                                      }}
                                      className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-amber-600 hover:bg-amber-50 font-medium"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Extend Time</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="bg-slate-100" />

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCandidateToRevoke(inv);
                                        setIsRevokeModalOpen(true);
                                      }}
                                      className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                      <span>Revoke Invitation</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Bottom Pagination Bar */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-6 text-[11px] font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="uppercase text-slate-400 font-bold">PAGE:</span>
                    <select
                      value={candidatePage}
                      onChange={(e) => setCandidatePage(Number(e.target.value))}
                      className="border border-slate-200 bg-white py-1 px-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: totalCandidatePages }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="uppercase text-slate-400 font-bold">ROWS PER PAGE:</span>
                    <select
                      value={candidateRowsPerPage}
                      onChange={(e) => {
                        setCandidateRowsPerPage(Number(e.target.value));
                        setCandidatePage(1);
                      }}
                      className="border border-slate-200 bg-white py-1 px-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div>
                    {filteredCandidates.length === 0
                      ? "0 OF 0"
                      : `${(candidatePage - 1) * candidateRowsPerPage + 1}-${Math.min(
                          candidatePage * candidateRowsPerPage,
                          filteredCandidates.length
                        )} OF ${filteredCandidates.length}`}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCandidatePage((p) => Math.max(1, p - 1))}
                      disabled={candidatePage === 1}
                      className="p-1 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer text-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCandidatePage((p) => Math.min(totalCandidatePages, p + 1))}
                      disabled={candidatePage === totalCandidatePages}
                      className="p-1 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer text-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── 5. Add Candidates Modal ── */}
      {selectedScheduleId && (
        <AddCandidatesModal
          open={isAddCandidatesOpen}
          onOpenChange={setIsAddCandidatesOpen}
          scheduleId={selectedScheduleId}
          alreadyInvitedIds={alreadyInvitedCandidateIds}
          onSuccess={() => {
            loadCandidatesData();
            fetchTest();
          }}
        />
      )}

      {/* ── 6. Bulk Invite Modal (CSV Upload) ── */}
      {selectedScheduleId && (
        <BulkInviteModal
          open={isBulkInviteOpen}
          onOpenChange={setIsBulkInviteOpen}
          scheduleId={selectedScheduleId}
          onSuccess={() => {
            loadCandidatesData();
            fetchTest();
          }}
        />
      )}

      {/* ── 7. Resend Invitation Confirmation Dialog Modal ── */}
      <Dialog open={isResendModalOpen} onOpenChange={setIsResendModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Resend Invitation Email
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Confirm resending assessment credentials
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {candidateToResend && (
            <div className="py-3 text-xs text-slate-600 space-y-2">
              <p>
                Are you sure you want to dispatch a fresh test access invitation email to:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded space-y-1">
                <p className="font-bold text-slate-900">
                  {candidateToResend.candidateName || candidateToResend.candidate?.user?.name || "Candidate"}
                </p>
                <p className="text-slate-500">
                  {candidateToResend.candidateEmail || candidateToResend.candidate?.user?.email}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={resending}
              onClick={() => {
                setIsResendModalOpen(false);
                setCandidateToResend(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={resending}
              onClick={handleConfirmSingleResend}
              className="bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold"
            >
              {resending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Resending...</span>
                </>
              ) : (
                <span>Resend Invitation</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 9. Revoke Invitation Confirmation Dialog Modal ── */}
      <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Revoke Candidate Invitation
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Deactivate assessment access token
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {candidateToRevoke && (
            <div className="py-3 text-xs text-slate-600 space-y-2">
              <p className="text-red-600 font-medium">
                Warning: This candidate will no longer be able to start or resume this assessment.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded space-y-1">
                <p className="font-bold text-slate-900">
                  {candidateToRevoke.candidateName || candidateToRevoke.candidate?.user?.name || "Candidate"}
                </p>
                <p className="text-slate-500">
                  {candidateToRevoke.candidateEmail || candidateToRevoke.candidate?.user?.email}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={revoking}
              onClick={() => {
                setIsRevokeModalOpen(false);
                setCandidateToRevoke(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={revoking}
              onClick={handleConfirmSingleRevoke}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {revoking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Revoking...</span>
                </>
              ) : (
                <span>Revoke Access</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkpoint 2 Publish Confirmation Modal */}
      <PublishTestConfirmationModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        testTitle={title || test?.title || "Assessment"}
        unverifiedQuestions={unverifiedQuestionsForPublish}
        onConfirmPublish={executePublish}
        onReviewQuestions={() => {
          setPublishModalOpen(false);
          setActiveTab("PROBLEMS");
        }}
        isPublishing={savingGeneralSettings}
      />

      {/* Time Extension Modal */}
      <ExtendTimeModal
        isOpen={isExtendTimeModalOpen}
        session={candidateForTimeExtension}
        onClose={() => {
          setIsExtendTimeModalOpen(false);
          setCandidateForTimeExtension(null);
        }}
        onSuccess={() => {
          toast.success("Candidate session time successfully extended!");
          loadCandidatesData();
        }}
      />
    </div>
  );
}
