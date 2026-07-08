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
} from "lucide-react";
import { testService, Test, CreateTestRequest, TestQuestion, Question, ProctoringMode, TestScheduleExtended } from "@/lib/test-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
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

interface EnrichedTestQuestion extends TestQuestion {
  question?: Question & { type?: string; avgTimeSeconds?: number; avg_time_seconds?: number };
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
    status: "DRAFT",
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
  const [reportCandidates, setReportCandidates] = useState<any[]>([]);
  const [reportSchedules, setReportSchedules] = useState<any[]>([]);
  const [candidateResults, setCandidateResults] = useState<Record<string, any>>({});
  const [selectedReportCandidate, setSelectedReportCandidate] = useState<any>(null);
  const [reportCandidateDetails, setReportCandidateDetails] = useState<any>(null);
  const [loadingAdvancedDetails, setLoadingAdvancedDetails] = useState(false);
  const [candidatePaperSubmissions, setCandidatePaperSubmissions] = useState<any[]>([]);
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
    if (formData.proctoringMode !== test.proctoringMode) return true;
    
    // Check instructions general text
    const currentGeneral = (formData.instructions as Record<string, unknown> | undefined)?.general || "";
    const originalGeneral = (test.instructions as Record<string, unknown> | undefined)?.general || "";
    if (currentGeneral !== originalGeneral) return true;

    // Check schedule times
    if (isScheduleDirty) return true;

    // Proctoring settings
    if (formData.enableTabSwitchTracking !== test.enableTabSwitchTracking) return true;
    if (formData.blockCopyPaste !== test.blockCopyPaste) return true;
    if (formData.blockRightClick !== test.blockRightClick) return true;
    if (formData.warnOnFullscreenExit !== test.warnOnFullscreenExit) return true;
    if (formData.maxWarnings !== test.maxWarnings) return true;
    if (formData.requireWebcam !== test.requireWebcam) return true;
    if (formData.detectFaceNotVisible !== test.detectFaceNotVisible) return true;
    if (formData.detectMultipleFaces !== test.detectMultipleFaces) return true;
    if (formData.detectSuspiciousAudio !== test.detectSuspiciousAudio) return true;
    if (formData.detectObjects !== test.detectObjects) return true;
    if (formData.periodicSnapshots !== test.periodicSnapshots) return true;
    if (formData.evidenceCapture !== test.evidenceCapture) return true;
    if (formData.requireMicrophone !== test.requireMicrophone) return true;
    if (formData.requireScreenShare !== test.requireScreenShare) return true;
    if (formData.detectDevTools !== test.detectDevTools) return true;
    if (formData.detectScreenShareStop !== test.detectScreenShareStop) return true;
    if (formData.enableLiveProctoring !== test.enableLiveProctoring) return true;
    if (formData.autoSubmitOnCriticalViolations !== test.autoSubmitOnCriticalViolations) return true;
    if (formData.maxCriticalViolations !== test.maxCriticalViolations) return true;

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

      // Fetch detailed test questions from the backend/database
      try {
        const response = await apiClient.get(`/test-questions/test/${id}`);
        const detailedQuestions = response.data?.data || [];
        const enrichedQuestions = detailedQuestions.map((tq: EnrichedTestQuestion) => ({
          ...tq,
          timeLimitSecs: tq.timeLimitSecs ?? tq.question?.timeLimitSecs ?? tq.question?.avgTimeSeconds ?? tq.question?.avg_time_seconds ?? 0,
        }));
        setQuestionsData(enrichedQuestions);
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
        instructions: data.instructions?.general ? data.instructions : {
          general: `This is an online test.
Please make sure that you are using the latest version of the browser. We recommend using Google Chrome.
It's mandatory to disable all the browser extensions and enabled Add-ons or open the assessment in incognito mode.
If you are solving a coding problem, you will either be required to choose a programming language from the options that have been enabled by the administrator or choose your preferred programming language in case no options have been enabled by the administrator. Note: In case you're solving coding problems: All inputs are from STDIN and output to STDOUT.
 If test mandates you to use the webcam, please provide the required permissions and access.
To know the results, please contact the administrator.
To refer to the FAQ document, you can click on the HELP button which is present in the top right corner of the test environment.`
        },
        proctoringMode: data.proctoringMode || "NONE",
        enableTabSwitchTracking: data.enableTabSwitchTracking || false,
        blockCopyPaste: data.blockCopyPaste || false,
        blockRightClick: data.blockRightClick || false,
        warnOnFullscreenExit: data.warnOnFullscreenExit || false,
        maxWarnings: data.maxWarnings || 0,
        requireWebcam: data.requireWebcam || false,
        detectFaceNotVisible: data.detectFaceNotVisible || false,
        detectMultipleFaces: data.detectMultipleFaces || false,
        detectSuspiciousAudio: data.detectSuspiciousAudio || false,
        detectObjects: data.detectObjects || false,
        periodicSnapshots: data.periodicSnapshots || false,
        evidenceCapture: data.evidenceCapture || false,
        requireMicrophone: data.requireMicrophone || false,
        requireScreenShare: data.requireScreenShare || false,
        detectDevTools: data.detectDevTools || false,
        detectScreenShareStop: data.detectScreenShareStop || false,
        enableLiveProctoring: data.enableLiveProctoring || false,
        autoSubmitOnCriticalViolations: data.autoSubmitOnCriticalViolations || false,
        maxCriticalViolations: data.maxCriticalViolations || 0,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load test. Please try again.";
      console.error("Failed to fetch test:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
      toast({
        title: "Validation Error",
        description: "Test title is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.durationMins && formData.durationMins <= 0) {
      toast({
        title: "Validation Error",
        description: "Duration must be greater than 0 minutes.",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.passMark &&
      (formData.passMark < 0 || formData.passMark > 100)
    ) {
      toast({
        title: "Validation Error",
        description: "Passing mark must be between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    if (scheduleStartTime && scheduleEndTime) {
      const startDate = new Date(scheduleStartTime);
      const endDate = new Date(scheduleEndTime);
      if (endDate <= startDate) {
        toast({
          title: "Validation Error",
          description: "Schedule end time must be after start time.",
          variant: "destructive",
        });
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
        status: formData.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
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
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleStartTime || !scheduleEndTime) {
      toast({
        title: "Validation Error",
        description: "Both start time and end time are required.",
        variant: "destructive",
      });
      return false;
    }

    const startDate = new Date(scheduleStartTime);
    const endDate = new Date(scheduleEndTime);
    if (endDate <= startDate) {
      toast({
        title: "Validation Error",
        description: "Schedule end time must be after start time.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete test. Please try again.",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: `Question has been removed from the test.`,
      });

      // Update local state immediately to reflect removal in UI
      setQuestionsData((prev) => prev.filter((q) => q.id !== selectedQuestion.id));
      setTest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions?.filter((q) => q.id !== selectedQuestion.id),
          testQuestions: prev.testQuestions?.filter((q) => q.id !== selectedQuestion.id),
        };
      });

      // Refresh the test data
      await fetchTest();
    } catch (error: unknown) {
      console.error("Failed to remove question:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to remove question. Please try again.",
        variant: "destructive",
      });
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
            return list.map((c: any) => ({ ...c, scheduleId: s.id }));
          } catch {
            return [];
          }
        })
      );
      
      const candidatesList = candidatesLists.flat();
      setReportCandidates(candidatesList);

      const resultsMap: Record<string, any> = {};
      await Promise.allSettled(
        candidatesList.map(async (c: any) => {
          try {
            const detailRes = await apiClient.get(
              `/api/admin/proctoring/candidates/${c.candidateId}/details?scheduleId=${c.scheduleId}`
            );
            const detail = detailRes.data?.data || detailRes.data;
            const sessionId = detail?.systemInfo?.sessionId;
            
            if (sessionId) {
              const resultRes = await apiClient.get(`/test-results/session/${sessionId}`);
              const result = resultRes.data?.data || resultRes.data;
              resultsMap[c.candidateId] = {
                sessionId,
                detail,
                scheduleId: c.scheduleId,
                result: result && result.id ? result : null
              };
            } else {
              resultsMap[c.candidateId] = {
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
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (activeTab === "reports" && id) {
      loadReportData();
    }
  }, [activeTab, id, loadReportData]);

  const handleOpenAdvancedReport = async (candidate: any) => {
    setSelectedReportCandidate(candidate);
    setIsAdvancedReportOpen(true);
    const candidateData = candidateResults[candidate.candidateId];
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

        const mappedSubmissions = questionsList.map((q: any) => {
          const questionId = q.sourceQuestionId || q.id;
          const submission = submissionsList.find((s: any) => s.questionId === questionId);
          
          const normalizedQuestion = {
            id: questionId,
            prompt: q.prompt,
            title: q.coding?.title || q.prompt || "Question",
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
      toast({
        title: "Error",
        description: "Failed to load detailed submissions data.",
        variant: "destructive",
      });
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
      toast({
        title: "Download Failed",
        description: "Failed to generate or download the scorecard.",
        variant: "destructive",
      });
    }
  };

  const handleInvite = async () => {
    if (!selectedSchedule) {
      toast({
        title: "Error",
        description: "Please create a schedule for this test first.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCandidate) {
      toast({
        title: "Error",
        description: "No candidate selected",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description:
          (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!selectedSchedule) {
      toast({
        title: "Error",
        description: "Please create a schedule for this test first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCandidates.length === 0) {
      toast({
        title: "Error",
        description: "No candidates selected",
        variant: "destructive",
      });
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

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const name = candidate.user?.name || "";
      const email = candidate.user?.email || "";
      const matchesSearch =
        name.toLowerCase().includes(inviteSearchTerm.toLowerCase()) ||
        email.toLowerCase().includes(inviteSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [candidates, inviteSearchTerm]);

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
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => handleSelectChange("status", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
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
                              {((item.question as Record<string, unknown> | undefined)?.type as string || item.question?.questionType || "")?.toLowerCase()}
                            </span>
                            <span>•</span>
                            <span>{item.marks} marks</span>
                            <span>•</span>
                            <span>{formatDuration(item.timeLimitSecs)}</span>
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

                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="maxWarnings">Max warnings allowed</Label>
                      <Input
                        id="maxWarnings"
                        type="number"
                        value={formData.maxWarnings}
                        onChange={(e) =>
                          handleNumberChange("maxWarnings", e.target.value)
                        }
                        disabled={formData.proctoringMode !== "CUSTOM"}
                        min="0"
                      />
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
                            id="detectObjects"
                            checked={formData.detectObjects}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange("detectObjects", !!checked)
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="detectObjects"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Detect objects (phone/book/etc.)
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

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="autoSubmitOnCriticalViolations"
                            checked={formData.autoSubmitOnCriticalViolations}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(
                                "autoSubmitOnCriticalViolations",
                                !!checked
                              )
                            }
                            disabled={formData.proctoringMode !== "CUSTOM"}
                          />
                          <Label
                            htmlFor="autoSubmitOnCriticalViolations"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Auto-submit after critical violations
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2 max-w-xs">
                        <Label htmlFor="maxCriticalViolations">
                          Max critical violations allowed
                        </Label>
                        <Input
                          id="maxCriticalViolations"
                          type="number"
                          value={formData.maxCriticalViolations}
                          onChange={(e) =>
                            handleNumberChange(
                              "maxCriticalViolations",
                              e.target.value
                            )
                          }
                          disabled={formData.proctoringMode !== "CUSTOM"}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invite" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Invite Candidates</CardTitle>
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
                  <div className="p-4 bg-primary/5 rounded-lg text-sm border border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-primary">Active Test Schedule Connected</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Schedules: {formatDateTime(selectedScheduleData?.startTime || "")} - {formatDateTime(selectedScheduleData?.endTime || "")}
                      </p>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates by name or email..."
                      value={inviteSearchTerm}
                      onChange={(e) => setInviteSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>

                  {/* Candidates Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
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
                          </TableHead>
                          <TableHead className="w-[50px] text-center">#</TableHead>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Invitation</TableHead>
                          <TableHead>Test Link</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingInvitations ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-10">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                            </TableCell>
                          </TableRow>
                        ) : filteredCandidates.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                              No candidates found.
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
                              <TableRow key={candidate.id}>
                                <TableCell>
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
                                        .join("") || "C"}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{candidate.user.name}</p>
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
                                    <div className="flex items-center gap-1.5 text-sm">
                                      {getStatusIcon(displayStatus || "")}
                                      <span className="capitalize">{displayStatus?.toLowerCase()}</span>
                                    </div>
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
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCandidate(candidate);
                                      setIsInviteDialogOpen(true);
                                    }}
                                    disabled={!!invitation || isScheduleCompleted}
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    {invitation ? "Invited" : "Send Invite"}
                                  </Button>
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCandidates.map((candidate) => {
                        const scoreData = candidateResults[candidate.candidateId];
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

                        return (
                          <TableRow key={candidate.candidateId}>
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
                              {totalScore !== undefined ? `${totalScore} / ${maxScore}` : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {passed !== undefined ? (
                                <Badge variant="outline" className={passed ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}>
                                  {passed ? "Passed" : "Failed"}
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
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAdvancedReport(candidate)}
                                >
                                  Advanced Report
                                </Button>
                                {scoreData?.sessionId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => downloadScorecard(scoreData.sessionId, candidate.candidateName)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
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
                    {candidateResults[selectedReportCandidate?.candidateId]?.result?.totalScore !== undefined
                      ? `${candidateResults[selectedReportCandidate?.candidateId].result.totalScore} / ${candidateResults[selectedReportCandidate?.candidateId].result.maxScore}`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Passed / Failed</div>
                  <div className="text-sm font-semibold">
                    {candidateResults[selectedReportCandidate?.candidateId]?.result?.passed !== undefined
                      ? (candidateResults[selectedReportCandidate?.candidateId].result.passed ? "PASSED" : "FAILED")
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
                    candidatePaperSubmissions.map((item: any, idx: number) => {
                      const q = item.question;
                      const sub = item.submission;
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
                                  {(q.mcqOptions || []).map((opt: any) => {
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
                            {reportCandidateDetails.violations.map((v: any) => {
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
                        {reportCandidateDetails.evidence.map((img: any) => (
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
