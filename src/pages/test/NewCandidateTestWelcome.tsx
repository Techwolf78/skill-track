import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  FileText,
  Calendar,
  Info,
  Play,
  MessageSquare,
  Shield,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { testService, Test, TestQuestion, TestScheduleExtended } from "@/lib/test-service";
import NewCandidateOnboardingWizard from "./NewCandidateOnboardingWizard";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

/* ──────────────────────────── Types ──────────────────────────── */

type ProctoringMode = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CUSTOM";

interface ProctoringFlags {
  proctoringMode: ProctoringMode;
  tabSwitchTrackingEnabled: boolean;
  copyPasteBlocked: boolean;
  rightClickBlocked: boolean;
  fullscreenExitTrackingEnabled: boolean;
  webcamRequired: boolean;
  microphoneRequired: boolean;
  screenShareRequired: boolean;
  faceNotVisibleDetectionEnabled: boolean;
  multipleFaceDetectionEnabled: boolean;
  suspiciousAudioDetectionEnabled: boolean;
  objectDetectionEnabled: boolean;
  devtoolsDetectionEnabled: boolean;
  periodicSnapshotsEnabled: boolean;
  evidenceCaptureEnabled: boolean;
  liveProctoringEnabled: boolean;
  autoSubmitOnCriticalViolation: boolean;
  maxWarningsAllowed: number;
  maxCriticalViolationsAllowed: number;
}

interface TestData {
  valid: boolean;
  invitationId: string;
  candidateId: string;
  testId: string;
  testTitle: string;
  durationMins: number;
  scheduleId: string;
  endTime: string;
  startTime?: string;
  token?: string;
  proctoring: ProctoringFlags;
  instructions?: Record<string, unknown>;
  questionCount?: number;
  organisationName?: string;
}

interface CandidateInvitation {
  id: string;
  scheduleId?: string;
  candidateId?: string;
  testId?: string;
  token?: string;
}

interface TestSchedule {
  id: string;
  testId?: string;
  startTime?: string;
  endTime?: string;
}

interface TestAssessment {
  id: string;
  title?: string;
  durationMins?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  proctoringMode?: ProctoringMode;
  tabSwitchTrackingEnabled?: boolean;
  copyPasteBlocked?: boolean;
  rightClickBlocked?: boolean;
  fullscreenExitTrackingEnabled?: boolean;
  webcamRequired?: boolean;
  microphoneRequired?: boolean;
  screenShareRequired?: boolean;
  faceNotVisibleDetectionEnabled?: boolean;
  multipleFaceDetectionEnabled?: boolean;
  suspiciousAudioDetectionEnabled?: boolean;
  objectDetectionEnabled?: boolean;
  devtoolsDetectionEnabled?: boolean;
  periodicSnapshotsEnabled?: boolean;
  evidenceCaptureEnabled?: boolean;
  liveProctoringEnabled?: boolean;
  autoSubmitOnCriticalViolation?: boolean;
  maxWarningsAllowed?: number;
  maxCriticalViolationsAllowed?: number;
  instructions?: Record<string, unknown>;
  organisation?: { name?: string };
  testQuestions?: TestQuestion[];
  questions?: TestQuestion[];
  testSchedules?: TestSchedule[];
}

/* ──────────────────────────── Component ──────────────────────────── */

interface TestWelcomeProps {
  testId?: string;
  testTitle?: string;
  authorName?: string;
  durationMins?: number;
  totalProblems?: number;
  startTimeStr?: string;
  endTimeStr?: string;
  instructionsText?: string;
  onStartAssessment?: () => void;
}

export default function NewCandidateTestWelcome({
  testId: testIdProp,
  testTitle: titleProp,
  authorName: authorProp,
  durationMins: durationProp,
  totalProblems: problemsProp,
  startTimeStr: startProp,
  endTimeStr: endProp,
  instructionsText: instructionsProp,
  onStartAssessment,
}: TestWelcomeProps) {
  const [searchParams] = useSearchParams();
  const { testId: routeTestId, id: routeId, token: routeToken } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login: loginToContext, user, isAuthenticated } = useAuth();

  const effectiveTestId =
    testIdProp || routeTestId || routeId || searchParams.get("testId") || searchParams.get("id");

  /* ────── Core State ────── */
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  /* ────── Auth / Login State ────── */
  const [showColdStartMessage, setShowColdStartMessage] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  /* ────── Invitation Status (public, no auth) ────── */
  const [invitationStatus, setInvitationStatus] = useState<{
    scheduleExpired: boolean;
    hasSubmittedSession: boolean;
    isEarly?: boolean;
    startTime?: string;
    endTime?: string;
    testTitle?: string;
  } | null>(null);

  /* ────── Timers ────── */
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (loading || isLoggingIn) {
      timer = setTimeout(() => setShowColdStartMessage(true), 4000);
    } else {
      setShowColdStartMessage(false);
    }
    return () => clearTimeout(timer);
  }, [loading, isLoggingIn]);

  /* ────── JWT Parser ────── */
  const parseJwt = (tokenStr: string) => {
    try {
      const base64Url = tokenStr.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  /* ────── Auth Handlers (ported from TestAccess.tsx) ────── */

  const handleAuthResponse = useCallback(
    (authData: { accessToken: string; sessionId?: string; sessionStatus?: string; testId?: string }) => {
      const decoded = parseJwt(authData.accessToken);
      if (!decoded) throw new Error("Failed to parse authentication token.");
      loginToContext(authData.accessToken, {
        id: decoded.id,
        name: decoded.name,
        email: decoded.sub,
        role: decoded.role,
      });
      if (
        authData.sessionId &&
        authData.sessionStatus &&
        ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED", "FLAGGED"].includes(authData.sessionStatus)
      ) {
        navigate(`/test/${authData.testId || effectiveTestId}/results?session=${authData.sessionId}&submitted=true`);
        return;
      }
      // Auth succeeded — the useEffect will re-run because isAuthenticated changed
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginToContext, navigate, effectiveTestId]
  );

  const verifyMagicToken = useCallback(
    async (magicTokenStr: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.post(`/candidate-invitations/${routeId}/access/verify`, {
          magicToken: magicTokenStr,
        });
        const authData = response.data?.data || response.data;
        if (!authData || !authData.accessToken) throw new Error("Authentication failed.");
        window.history.replaceState({}, "", `/test/access/${routeId}`);
        toast({ title: "Verification Successful", description: "Magic link authenticated successfully." });
        handleAuthResponse(authData);
      } catch (err: unknown) {
        const errorVal = err as { response?: { data?: { message?: string } }; message?: string };
        console.error("Magic token verification failed:", err);
        window.history.replaceState({}, "", `/test/access/${routeId}`);
        setError(errorVal.response?.data?.message || errorVal.message || "Failed to verify magic access link");
      } finally {
        setLoading(false);
      }
    },
    [routeId, toast, handleAuthResponse]
  );

  const handleSendAccessCode = async () => {
    if (!routeId) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await apiClient.post(`/candidate-invitations/${routeId}/access/request`);
      setOtpRequested(true);
      setOtpCooldown(60);
      toast({ title: "Access Link Sent", description: "A secure access link and OTP have been sent to your email." });
    } catch (err: unknown) {
      const errorVal = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorVal.response?.data?.message || errorVal.message || "Failed to send access link");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOtpSubmit = async (codeVal: string) => {
    if (!routeId || isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    setError(null);
    try {
      const response = await apiClient.post(`/candidate-invitations/${routeId}/access/verify`, { otpCode: codeVal });
      const authData = response.data?.data || response.data;
      if (!authData || !authData.accessToken) throw new Error("Authentication failed.");
      toast({ title: "Verification Successful", description: "Access code verified successfully." });
      handleAuthResponse(authData);
    } catch (err: unknown) {
      const errorVal = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorVal.response?.data?.message || errorVal.message || "Invalid or expired access code.");
      setOtpCode("");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /* ────── Token Validation + Data Resolution (ported from TestAccess.tsx) ────── */

  const validateToken = useCallback(async () => {
    try {
      setLoading(true);
      if (!routeId) {
        throw new Error("Invalid link parameters.");
      }

      let decoded: Record<string, unknown> | null = null;

      if (routeToken) {
        const authResponse = await apiClient.post("/candidate-invitations/validate", {
          id: routeId,
          token: routeToken,
        });
        const authData = authResponse.data?.data || authResponse.data;
        if (!authData || !authData.accessToken) throw new Error("Authentication failed.");
        decoded = parseJwt(authData.accessToken);
        if (decoded) {
          loginToContext(authData.accessToken, {
            id: decoded.id as string,
            name: decoded.name as string,
            email: decoded.sub as string,
            role: decoded.role as string,
          });
        } else {
          throw new Error("Failed to parse authentication token.");
        }
      } else {
        const storedToken = localStorage.getItem("token");
        if (storedToken) decoded = parseJwt(storedToken);
        if (!isAuthenticated || !decoded) {
          setLoading(false);
          return;
        }
      }

      // ── Fetch invitation (with fallback chain from TestAccess) ──
      let invitation: CandidateInvitation | null = null;
      try {
        const invitationResponse = await apiClient.get(`/candidate-invitations/${routeId}`);
        invitation = invitationResponse.data?.data || invitationResponse.data;
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number } };
        console.warn("Direct invitation fetch failed:", axiosError.response?.status);
        try {
          const listResponse = await apiClient.get("/candidate-invitations");
          const listData = listResponse.data?.data || listResponse.data;
          const items = Array.isArray(listData)
            ? listData
            : listData?.content && Array.isArray(listData.content)
            ? listData.content
            : [];
          invitation = items.find((item: CandidateInvitation) => item.id === routeId) || null;
        } catch (listErr) {
          console.warn("List invitation fetch failed:", listErr);
        }

        if (!invitation && decoded) {
          const scheduleId = (decoded.scheduleId || decoded.schedule_id || decoded.schedId) as string | undefined;
          const candidateId = (decoded.candidateId || decoded.candidate_id || decoded.candId || decoded.id) as string | undefined;
          const testId = (decoded.testId || decoded.test_id) as string | undefined;
          if (scheduleId) {
            invitation = { id: routeId, scheduleId, candidateId, testId };
          }
        }
        if (!invitation) {
          invitation = {
            id: routeId,
            scheduleId: (decoded?.scheduleId || decoded?.schedule_id || decoded?.schedId) as string | undefined,
            candidateId: (decoded?.candidateId || decoded?.candidate_id || decoded?.id) as string | undefined,
            testId: (decoded?.testId || decoded?.test_id) as string | undefined,
          };
        }
      }

      // ── Fetch schedule ──
      let schedule: TestSchedule | null = null;
      if (invitation?.scheduleId) {
        try {
          const scheduleResponse = await apiClient.get(`/test-schedules/${invitation.scheduleId}`);
          schedule = scheduleResponse.data?.data || scheduleResponse.data;
        } catch (schedErr) {
          console.warn("Failed to fetch schedule:", schedErr);
        }
      }

      // ── Fetch test ──
      let testObj: TestAssessment | null = null;
      const testId = invitation?.testId || schedule?.testId || (decoded?.testId as string) || (decoded?.test_id as string);
      if (testId) {
        try {
          testObj = await testService.getTestById(testId);
        } catch (testErr) {
          console.warn("Failed to fetch test:", testErr);
        }
      }

      if (testObj && testObj.status && testObj.status !== "PUBLISHED") {
        throw new Error("This test is currently in Draft or Archived state and cannot be accessed.");
      }

      // ── Resolve questions ──
      let resolvedQuestions: TestQuestion[] = [];
      if (testObj?.testQuestions?.length) resolvedQuestions = testObj.testQuestions;
      else if (testObj?.questions?.length) resolvedQuestions = testObj.questions;
      else if (testId) {
        try {
          resolvedQuestions = await testService.getTestQuestions(testId);
        } catch { /* restricted */ }
      }
      setQuestions(resolvedQuestions);

      // ── Build proctoring flags (same logic as TestAccess lines 495-533) ──
      const mode: ProctoringMode = testObj?.proctoringMode ?? "NONE";
      const isLow = mode === "LOW" || mode === "MEDIUM" || mode === "HIGH";
      const isMedHigh = mode === "MEDIUM" || mode === "HIGH";
      const isHigh = mode === "HIGH";

      const testTitle = testObj?.title || (decoded?.testTitle as string) || (decoded?.test_title as string) || "Technical Assessment";
      const durationMins = testObj?.durationMins || (decoded?.durationMins as number) || (decoded?.duration_mins as number) || 45;
      const endTime = schedule?.endTime || (decoded?.endTime as string) || (decoded?.end_time as string) || "";
      const startTime = schedule?.startTime || "";
      const finalCandidateId = invitation?.candidateId || (decoded?.candidateId as string) || (decoded?.id as string);
      const finalScheduleId = invitation?.scheduleId || schedule?.id || (decoded?.scheduleId as string);

      // Store the full test object for the onboarding wizard
      if (testObj) {
        setTest(testObj as unknown as Test);
      }

      setTestData({
        valid: true,
        invitationId: invitation?.id || routeId,
        candidateId: finalCandidateId || "",
        testId: testId || "default-test-id",
        testTitle,
        durationMins: Number(durationMins),
        scheduleId: finalScheduleId || "",
        endTime,
        startTime,
        token: routeToken,
        questionCount: resolvedQuestions.length,
        organisationName: testObj?.organisation?.name || "",
        proctoring: {
          proctoringMode: mode,
          tabSwitchTrackingEnabled: testObj?.tabSwitchTrackingEnabled ?? isLow,
          copyPasteBlocked: testObj?.copyPasteBlocked ?? isLow,
          rightClickBlocked: testObj?.rightClickBlocked ?? false,
          fullscreenExitTrackingEnabled: testObj?.fullscreenExitTrackingEnabled ?? isLow,
          webcamRequired: testObj?.webcamRequired ?? isMedHigh,
          microphoneRequired: testObj?.microphoneRequired ?? isHigh,
          screenShareRequired: testObj?.screenShareRequired ?? isHigh,
          faceNotVisibleDetectionEnabled: testObj?.faceNotVisibleDetectionEnabled ?? isMedHigh,
          multipleFaceDetectionEnabled: testObj?.multipleFaceDetectionEnabled ?? isMedHigh,
          suspiciousAudioDetectionEnabled: testObj?.suspiciousAudioDetectionEnabled ?? isHigh,
          objectDetectionEnabled: false,
          devtoolsDetectionEnabled: testObj?.devtoolsDetectionEnabled ?? isHigh,
          periodicSnapshotsEnabled: testObj?.periodicSnapshotsEnabled ?? isMedHigh,
          evidenceCaptureEnabled: testObj?.evidenceCaptureEnabled ?? isMedHigh,
          liveProctoringEnabled: testObj?.liveProctoringEnabled ?? isMedHigh,
          autoSubmitOnCriticalViolation: false,
          maxWarningsAllowed: testObj?.maxWarningsAllowed ?? (mode === "NONE" ? 0 : 3),
          maxCriticalViolationsAllowed: testObj?.maxCriticalViolationsAllowed ?? (isHigh ? 1 : 2),
        },
        instructions: testObj?.instructions,
      });

      setError(null);
    } catch (error: unknown) {
      const validationErr = error as { response?: { data?: { message?: string } }; message?: string };
      console.error("Token validation error:", error);
      setError(validationErr.response?.data?.message || validationErr.message || "Invalid or expired invitation link");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, routeToken, isAuthenticated, loginToContext]);

  /* ────── Mount Effect (ported from TestAccess lines 197-262) ────── */

  useEffect(() => {
    const isMobileOrTablet =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && /Macintosh/i.test(navigator.userAgent));

    if (isMobileOrTablet) {
      setIsMobile(true);
      setLoading(false);
      return;
    }

    const urlSearchParams = new URLSearchParams(window.location.search);
    const magicToken = urlSearchParams.get("magicToken");

    if (routeId) {
      apiClient
        .get(`/candidate-invitations/${routeId}/status`)
        .then((res) => {
          const s = res.data?.data || res.data;
          const expired = !!s?.scheduleExpired;
          const submitted = !!s?.hasSubmittedSession;
          const isEarly = !!s?.isEarly;
          setInvitationStatus({
            scheduleExpired: expired,
            hasSubmittedSession: submitted,
            isEarly,
            startTime: s?.startTime,
            endTime: s?.endTime,
            testTitle: s?.testTitle,
          });

          if (submitted || expired || isEarly) {
            setLoading(false);
            return;
          }
          if (magicToken) verifyMagicToken(magicToken);
          else if (routeToken || isAuthenticated) validateToken();
          else setLoading(false);
        })
        .catch(() => {
          if (magicToken) verifyMagicToken(magicToken);
          else if (routeToken || isAuthenticated) validateToken();
          else setLoading(false);
        });
    } else if (routeToken && !routeId) {
      setError("This link is outdated. Please use the secure invitation link.");
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, routeToken, isAuthenticated]);

  /* ────── Derived Display Values ────── */

  const questionStats = useMemo(() => {
    const total = questions.length;
    let mcqCount = 0, codingCount = 0, otherCount = 0;
    questions.forEach((q) => {
      const type = q.question?.questionType || (q as Record<string, unknown>).type;
      if (type === "MCQ") mcqCount++;
      else if (type === "CODING") codingCount++;
      else otherCount++;
    });
    return { total, mcqCount, codingCount, otherCount };
  }, [questions]);

  const displayTitle = testData?.testTitle || titleProp || "Not Available";
  const displayAuthor = testData?.organisationName || user?.organisationData?.name || authorProp || "Not Available";
  const displayDuration = testData ? `${testData.durationMins} mins` : durationProp != null ? `${durationProp} mins` : "Not Available";
  const displayTotalProblems = testData?.questionCount || questionStats.total || problemsProp || "Not Available";

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  };

  const displayStartTime = formatDateTime(testData?.startTime) || startProp || "Not Available";
  const displayEndTime = formatDateTime(testData?.endTime) || endProp || "Not Available";

  // Instructions extraction
  const resolvedInstructions = useMemo(() => {
    const isValid = (val: unknown): val is string =>
      typeof val === "string" && val.trim().length > 0 && val.trim() !== "null" && val.trim() !== "undefined";

    if (isValid(instructionsProp)) return instructionsProp;

    const inst = testData?.instructions;
    if (!inst) return null;

    if (isValid((inst as Record<string, unknown>).general)) return (inst as Record<string, unknown>).general as string;
    if (isValid((inst as Record<string, unknown>).text)) return (inst as Record<string, unknown>).text as string;
    if (isValid((inst as Record<string, unknown>).description)) return (inst as Record<string, unknown>).description as string;

    if (test) {
      if (isValid((test as Record<string, unknown>).instructions)) return (test as Record<string, unknown>).instructions as string;
      if (isValid(test.description)) return test.description;
    }
    return null;
  }, [instructionsProp, testData?.instructions, test]);

  const handleStart = () => {
    if (onStartAssessment) {
      onStartAssessment();
    } else {
      setIsOnboardingOpen(true);
    }
  };

  /* ──────────────────────────── Renders ──────────────────────────── */

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col items-center justify-center font-sans text-slate-800 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#4353a4]" />
        <p className="text-sm font-semibold text-slate-600 animate-pulse">Preparing your secure environment...</p>
        {showColdStartMessage && (
          <p className="text-center text-xs text-amber-600 animate-pulse max-w-xs px-4">
            ⏳ Backend is waking up... Cold start can take up to 50 seconds. Please wait.
          </p>
        )}
      </div>
    );
  }

  // Already submitted
  if (invitationStatus?.hasSubmittedSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in duration-300">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 w-full" />
          <CardHeader className="text-center pt-10">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-slate-100">Assessment Submitted</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              You have already completed and submitted this assessment. Your responses are securely recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300">All responses are securely stored and cannot be modified.</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-slate-300">Results will be shared by your administrator once evaluation is complete.</span>
            </div>
          </CardContent>
          <CardFooter className="pb-8 flex justify-center">
            <div className="w-full text-center p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono text-xs text-slate-400">
              You can close this tab now
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Candidate is early — schedule has not started yet
  if (invitationStatus?.isEarly && invitationStatus?.startTime) {
    return (
      <EarlyScheduleCountdown
        startTime={invitationStatus.startTime}
        testTitle={invitationStatus.testTitle}
        onStart={() => {
          setInvitationStatus(prev => prev ? { ...prev, isEarly: false } : null);
          window.location.reload();
        }}
      />
    );
  }

  // Schedule expired
  if (invitationStatus?.scheduleExpired && !invitationStatus?.hasSubmittedSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in duration-300">
          <div className="h-1 bg-gradient-to-r from-red-500 via-rose-400 to-orange-400 w-full" />
          <CardHeader className="text-center pt-10">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-slate-100">Schedule Ended</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              The schedule for this assessment has ended. This test cannot be taken now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {invitationStatus.endTime && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs text-slate-300">
                  Ended at: <strong className="text-slate-200">{new Date(invitationStatus.endTime).toLocaleString()}</strong>
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-400">Please reach out to your administrator to request a new assessment window.</span>
            </div>
          </CardContent>
          <CardFooter className="pb-8 flex justify-center">
            <div className="w-full text-center p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono text-xs text-slate-400">
              You can close this tab now
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Mobile device
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#edf2f7]">
        <Card className="max-w-md w-full border-red-200 shadow-2xl overflow-hidden">
          <div className="h-2 bg-red-500" />
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Device Not Supported</CardTitle>
            <CardDescription className="text-base mt-2">
              This assessment requires screen sharing and proctoring features not supported on mobile or tablet browsers.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500">
              Please open the invitation link on a <strong>desktop or laptop computer</strong> with a webcam, microphone, and a modern browser.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth screen: Not authenticated and no testData → show Send Access Link / OTP
  if ((error || !testData) && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <Card className="max-w-md w-full border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="h-1 bg-emerald-500 w-full" />
          <CardHeader className="text-center pt-8 pb-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-xl border border-emerald-500/20 bg-emerald-950/20 flex items-center justify-center shadow-lg shadow-emerald-950/30">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight font-mono text-emerald-400">
              {otpRequested ? "SECURITY VERIFICATION" : "SECURE TEST ACCESS"}
            </CardTitle>
            <CardDescription className="text-slate-400 font-sans mt-2">
              {otpRequested
                ? "Enter the 6-digit access code sent to your registered email."
                : "Identity verification is required to start your secure test."}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/30 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {otpRequested ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-xs uppercase tracking-widest font-mono text-slate-400">
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setOtpCode(val);
                      if (val.length === 6) handleOtpSubmit(val);
                    }}
                    disabled={isVerifyingOtp}
                    className="text-center text-2xl tracking-[0.3em] font-mono h-12 bg-slate-950 border-slate-800 text-emerald-400 focus-visible:ring-emerald-500"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleOtpSubmit(otpCode)}
                    disabled={otpCode.length !== 6 || isVerifyingOtp}
                    className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider"
                  >
                    {isVerifyingOtp ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {isVerifyingOtp ? "VERIFYING..." : "SUBMIT CODE"}
                  </Button>
                  <Button
                    onClick={handleSendAccessCode}
                    disabled={otpCooldown > 0 || isLoggingIn}
                    variant="outline"
                    className="w-full h-11 border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 font-medium"
                  >
                    {otpCooldown > 0 ? `RESEND IN ${otpCooldown}S` : "RESEND EMAIL"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 text-center leading-relaxed">
                  We will send a one-click magic login link and a fallback 6-digit verification code to the email associated with your invitation.
                </p>
                <Button
                  onClick={handleSendAccessCode}
                  disabled={isLoggingIn}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold tracking-wider"
                >
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isLoggingIn ? "SENDING LINK..." : "SEND ACCESS LINK"}
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-slate-800/40 bg-slate-950/20 px-6 py-4 flex justify-between">
            <Button
              onClick={() => { setOtpRequested(false); setError(null); setOtpCode(""); }}
              variant="ghost"
              className="text-xs text-slate-500 hover:text-slate-300 font-mono hover:bg-transparent"
              disabled={!otpRequested}
            >
              &larr; BACK
            </Button>
            <Button onClick={() => navigate("/")} variant="ghost" className="text-xs text-slate-500 hover:text-slate-300 font-mono hover:bg-transparent">
              Return to Homepage
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state after auth (testData failed to load)
  if (error && !testData) {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col items-center justify-center font-sans text-slate-800 p-4">
        <div className="bg-white border border-red-200 rounded-lg shadow-lg max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Error</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-2">
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  /* ────── Main Welcome Screen (DoSelect White Theme) ────── */
  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white relative">
      {/* ── Top Header / Dark Navbar ── */}
      <header className="h-16 bg-[#081225] text-white px-4 md:px-8 flex items-center justify-between border-b border-[#142340] shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/Gryphon360logo.png" alt="Gryphon 360" className="h-10 md:h-11 w-auto object-contain shrink-0" />
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <span className="text-xs md:text-sm text-slate-300 font-medium truncate max-w-[200px] sm:max-w-md">
            {displayTitle}
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-300">
          <button onClick={() => setHelpOpen(!helpOpen)} className="hover:text-white flex items-center gap-1.5 font-medium transition-colors cursor-pointer">
            <span>Help</span>
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[10px] font-bold hover:border-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Assessment Information"
          >
            i
          </button>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col items-center justify-start py-8 md:py-12 px-4 sm:px-6 w-full max-w-5xl mx-auto">
        <div className="w-full space-y-6">
          {/* 1. Header Section */}
          <div className="text-left space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{displayTitle}</h1>
            {displayAuthor !== "Not Available" && (
              <p className="text-sm text-slate-500">by {displayAuthor}</p>
            )}
          </div>

          {/* 2. Test Info Metadata Banner */}
          <div className="bg-white border border-slate-200/90 rounded-sm shadow-xs p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] shrink-0">
                <Clock className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm md:text-base font-bold text-slate-900">{displayDuration}</div>
                <div className="text-xs text-slate-500 font-normal">to take this assessment</div>
              </div>
            </div>
            <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] shrink-0">
                <FileText className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm md:text-base font-bold text-slate-900">{displayTotalProblems}</div>
                <div className="text-xs text-slate-500 font-normal">
                  {displayTotalProblems === 1 ? "problem to be solved" : "problems to be solved"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] shrink-0">
                <Calendar className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5 text-xs text-slate-600">
                <div><span className="font-semibold text-slate-800">Starts:</span> {displayStartTime}</div>
                <div><span className="font-semibold text-slate-800">Ends:</span> {displayEndTime}</div>
              </div>
            </div>
          </div>

          {/* 3. Assessment Instructions */}
          <div className="bg-white border border-slate-200/90 rounded-sm shadow-xs overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">Assessment Instructions</h2>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              {resolvedInstructions ? (
                /<[a-z][\s\S]*>/i.test(resolvedInstructions) ? (
                  <div
                    className="text-xs md:text-sm text-slate-700 leading-relaxed font-sans prose prose-slate max-w-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:my-1.5 [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3.5 [&_pre]:rounded-xs [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-xs [&_code]:bg-slate-100 [&_code]:text-pink-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-xs [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0 [&_a]:text-[#4353a4] [&_a]:underline [&_a]:font-medium hover:[&_a]:text-[#344287] [&_blockquote]:border-none [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:my-1.5 [&_blockquote]:px-1 [&_blockquote]:before:content-['\\201C'] [&_blockquote]:after:content-['\\201D'] [&_blockquote]:before:font-serif [&_blockquote]:after:font-serif [&_blockquote]:before:text-[#4353a4] [&_blockquote]:after:text-[#4353a4] [&_blockquote]:before:font-bold [&_blockquote]:after:font-bold [&_sup]:text-[9px] [&_sub]:text-[9px]"
                    dangerouslySetInnerHTML={{ __html: resolvedInstructions }}
                  />
                ) : (
                  <div className="text-xs md:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                    {resolvedInstructions}
                  </div>
                )
              ) : (
                <div className="text-xs md:text-sm text-slate-500 leading-relaxed font-sans">
                  <p className="font-medium text-slate-700 mb-2">General Assessment Guidelines:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Ensure a stable internet connection throughout the test.</li>
                    <li>Read all questions carefully before submitting answers.</li>
                    <li>Do not refresh or navigate away from the test window during the session.</li>
                  </ul>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 flex flex-col items-center justify-center gap-3">
                <Button
                  onClick={handleStart}
                  className="bg-[#4353a4] hover:bg-[#344287] text-white px-8 py-5 text-xs md:text-sm font-bold tracking-wider uppercase rounded-xs shadow-sm hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Assessment</span>
                </Button>
                <p className="text-[11px] md:text-xs text-slate-500 flex items-center gap-1.5 text-center font-normal pt-1">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Go through environment details, FAQs, and the help section before you start taking this assessment.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Help Modal ── */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-sm max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Assessment Information</h3>
              <button onClick={() => setHelpOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div><strong className="text-slate-800">Test:</strong> {displayTitle}</div>
              <div><strong className="text-slate-800">Organization:</strong> {displayAuthor}</div>
              <div><strong className="text-slate-800">Duration:</strong> {displayDuration}</div>
              <div><strong className="text-slate-800">Total Problems:</strong> {displayTotalProblems}</div>
              <div><strong className="text-slate-800">Proctoring Mode:</strong> {testData?.proctoring?.proctoringMode || "STANDARD"}</div>
              <p className="pt-2 text-slate-500 leading-relaxed border-t border-slate-100">
                Make sure your device has a functional camera and microphone if proctoring is enabled.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setHelpOpen(false)} className="text-xs uppercase font-bold tracking-wider">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Support Bubble ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setHelpOpen(true)}
          className="w-12 h-12 rounded-full bg-[#4353a4] hover:bg-[#344287] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
          title="Need Help?"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* ── Onboarding Wizard Overlay ── */}
      {isOnboardingOpen && (
        <NewCandidateOnboardingWizard
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          test={test}
          testQuestions={questions}
          testTitle={displayTitle}
          invitationId={testData?.invitationId || routeId}
          testId={testData?.testId || effectiveTestId}
          isWebcamMonitored={
            !!(
              testData?.proctoring?.webcamRequired ||
              testData?.proctoring?.proctoringMode === "HIGH" ||
              testData?.proctoring?.proctoringMode === "MEDIUM" ||
              testData?.proctoring?.proctoringMode === "CUSTOM"
            )
          }
        />
      )}
    </div>
  );
}

/* ──────────────────────────── Early Schedule Countdown Component ──────────────────────────── */

function EarlyScheduleCountdown({
  startTime,
  testTitle,
  onStart,
}: {
  startTime: string;
  testTitle?: string;
  onStart: () => void;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const diff = Math.max(0, Math.floor((new Date(startTime).getTime() - Date.now()) / 1000));
    return diff;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(startTime).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onStart();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, onStart]);

  const days = Math.floor(secondsRemaining / (3600 * 24));
  const hours = Math.floor((secondsRemaining % (3600 * 24)) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="max-w-lg w-full border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in duration-300">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 w-full" />
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold font-mono text-slate-100">
            Assessment Not Started
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2">
            You are early! <strong className="text-slate-200">{testTitle || "This assessment"}</strong> is scheduled to begin soon.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {/* Live Countdown Display */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3">
              <span className="text-2xl md:text-3xl font-black font-mono text-white block">
                {String(days).padStart(2, "0")}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Days</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3">
              <span className="text-2xl md:text-3xl font-black font-mono text-indigo-300 block">
                {String(hours).padStart(2, "0")}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hours</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3">
              <span className="text-2xl md:text-3xl font-black font-mono text-indigo-300 block">
                {String(minutes).padStart(2, "0")}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mins</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-3">
              <span className="text-2xl md:text-3xl font-black font-mono text-emerald-400 block">
                {String(seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Secs</span>
            </div>
          </div>

          {/* Scheduled Time Banner */}
          <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-300">
              Starts on: <strong className="text-white font-mono">{new Date(startTime).toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-slate-800/40 border border-slate-700/30 px-4 py-3 text-xs text-slate-400">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span>This page will automatically refresh when the scheduled time arrives.</span>
          </div>
        </CardContent>

        <CardFooter className="pb-6 flex justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider"
          >
            Check Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
