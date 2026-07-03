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
} from "lucide-react";
import { testService, Test, CreateTestRequest, TestQuestion, Question, ProctoringMode } from "@/lib/test-service";
import { candidateService } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

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

  const formatDuration = (secs: number) => {
    if (secs <= 0) return "N/A";
    if (secs % 60 === 0) {
      const mins = secs / 60;
      return `${mins} min${mins > 1 ? "s" : ""}`;
    }
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
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
  const [questionsData, setQuestionsData] = useState<(TestQuestion & { question?: Question })[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<(TestQuestion & { question?: Question }) | null>(null);
  const [activeTab, setActiveTab] = useState<string>(location.state?.activeTab || "details");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Invitation states
  const [candidates, setCandidates] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [selectedScheduleData, setSelectedScheduleData] = useState<any>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
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

  const isScheduleDirty = useMemo(() => {
    if (!test) return false;

    const getLocalISOTime = (isoString?: string) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      const tzOffset = date.getTimezoneOffset() * 60000;
      return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    };

    const testSchedules = test.testSchedules || [];
    const activeOrFirst = testSchedules.find((s: any) => s.status === "SCHEDULED" || s.status === "LIVE") || testSchedules[0];
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
    const currentGeneral = (formData.instructions as any)?.general || "";
    const originalGeneral = (test.instructions as any)?.general || "";
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

      // Fetch full question details for each question in the test
      if (data.questions && data.questions.length > 0) {
        const allQuestions = await testService.getAllQuestions();
        const enrichedQuestions = data.questions.map((tq) => ({
          ...tq,
          question: allQuestions.find((q) => q.id === tq.questionId),
        }));
        setQuestionsData(enrichedQuestions);
      } else {
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
To refer to the FAQ document, you can click on the HELP button which is present in the top right corner of the test environment.
Best wishes from GRYPHON ACADEMY PRIVATE LIMITED!`
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
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

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
        const activeOrFirst = testSchedules.find((s: any) => s.status === "SCHEDULED" || s.status === "LIVE") || testSchedules[0];
        
        let newSchedules;
        if (activeOrFirst) {
          newSchedules = testSchedules.map(s => s.id === activeOrFirst.id ? { ...s, startTime: startISO, endTime: endISO } : s);
        } else {
          newSchedules = [...testSchedules, { id: selectedSchedule || "new-id", startTime: startISO, endTime: endISO }];
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
        const date = new Date(selectedScheduleData.startTime);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        setScheduleStartTime(localISOTime);
      } else {
        setScheduleStartTime("");
      }
      if (selectedScheduleData.endTime) {
        const date = new Date(selectedScheduleData.endTime);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        setScheduleEndTime(localISOTime);
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
      // Call API to remove question from test
      await testService.removeQuestionFromTest(selectedQuestion.id);

      toast({
        title: "Success",
        description: `Question has been removed from the test.`,
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
      const testSchedules = schedulesData.filter((s: any) => s.testId === id);
      
      // Auto-select the first schedule if available
      if (testSchedules.length > 0) {
        const activeOrFirst = testSchedules.find((s: any) => s.status === "SCHEDULED" || s.status === "LIVE") || testSchedules[0];
        setSelectedSchedule(activeOrFirst.id);
        setSelectedScheduleData(activeOrFirst);
        if (activeOrFirst.startTime) {
          const date = new Date(activeOrFirst.startTime);
          const tzOffset = date.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
          setScheduleStartTime(localISOTime);
        }
        if (activeOrFirst.endTime) {
          const date = new Date(activeOrFirst.endTime);
          const tzOffset = date.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
          setScheduleEndTime(localISOTime);
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
        } else if (invData && typeof invData === "object" && "content" in invData && Array.isArray((invData as any).content)) {
          setInvitations((invData as any).content);
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
      await apiClient.post("/candidate-invitations", {
        scheduleId: selectedSchedule,
        candidateId: selectedCandidate.id,
      });

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
          (error as any).response?.data?.message || "Failed to send invitation",
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

  const copyTestLink = (testId: string, token: string) => {
    const baseUrl = window.location.origin;
    const testUrl = `${baseUrl}/test/access/${testId}/${token}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedToken(token);
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
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="details">Basic Information</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questionCount})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="invite">Invite Candidates</TabsTrigger>
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
                    value={(formData.instructions as any)?.general || ""}
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
                            {item.question?.title || "Unknown Question"}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span className="capitalize">
                              {item.question?.type?.toLowerCase()}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduleStartTime">Start Time *</Label>
                  <Input
                    id="scheduleStartTime"
                    type="datetime-local"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduleEndTime">End Time *</Label>
                  <Input
                    id="scheduleEndTime"
                    type="datetime-local"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                  />
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
                                  {invitation?.token ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyTestLink(test.id, invitation.token)}
                                      className="h-8 px-2"
                                      disabled={displayStatus === "EXPIRED"}
                                    >
                                      {copiedToken === invitation.token ? (
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
    </div>
  );
}
