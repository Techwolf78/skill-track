import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  FileText,
  Calendar,
  HelpCircle,
  Info,
  Play,
  MessageSquare,
  ChevronRight,
  Shield,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { testService, Test, TestQuestion, TestScheduleExtended } from "@/lib/test-service";
import NewCandidateOnboardingWizard from "./NewCandidateOnboardingWizard";

import { apiClient } from "@/lib/api-client";

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
  const { login: loginToContext, user, isAuthenticated } = useAuth();

  const effectiveTestId =
    testIdProp || routeTestId || routeId || searchParams.get("testId") || searchParams.get("id");

  const [invitationId, setInvitationId] = useState<string>(routeId || "");
  const [invitationToken, setInvitationToken] = useState<string>(searchParams.get("token") || routeToken || "");
  const [magicToken, setMagicToken] = useState<string>(searchParams.get("magicToken") || "");

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [schedule, setSchedule] = useState<TestScheduleExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Magic link / OTP login drawer states
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

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

  const handleAuthResponse = (authData: { accessToken: string; sessionId?: string; sessionStatus?: string; testId?: string }) => {
    const decoded = parseJwt(authData.accessToken);
    if (!decoded) return;
    loginToContext(authData.accessToken, { id: decoded.id, name: decoded.name, email: decoded.sub, role: decoded.role });
    if (
      authData.sessionId &&
      authData.sessionStatus &&
      ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED", "FLAGGED"].includes(authData.sessionStatus)
    ) {
      navigate(`/test/${authData.testId || effectiveTestId}/results?session=${authData.sessionId}&submitted=true`);
      return;
    }
    // Close drawer — the effect will re-run because isAuthenticated changed
    setShowAuthDrawer(false);
  };

  /**
   * Phase 2: Fetch all protected data (invitation → schedule → test → questions).
   * Only called AFTER the candidate is authenticated (has a valid JWT in localStorage).
   * Mirrors the old TestAccess.tsx validateToken() logic exactly.
   */
  const fetchProtectedData = async (decoded: any) => {
    // 403 Bypass/Fallback strategy: Try direct GET, fall back to list, then to JWT claims
    let invitation: any = null;
    if (routeId) {
      try {
        const invitationResponse = await apiClient.get(`/candidate-invitations/${routeId}`);
        invitation = invitationResponse.data?.data || invitationResponse.data;
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number } };
        console.warn("Direct invitation fetch failed with status:", axiosError.response?.status, err);

        // Fallback 1: Try list endpoint
        try {
          const listResponse = await apiClient.get("/candidate-invitations");
          const listData = listResponse.data?.data || listResponse.data;
          const items = Array.isArray(listData)
            ? listData
            : listData?.content && Array.isArray(listData.content)
            ? listData.content
            : [];
          invitation = items.find((item: any) => item.id === routeId) || null;
          if (invitation) {
            console.log("Found invitation in list fallback:", invitation);
          }
        } catch (listErr) {
          console.warn("List invitation fetch failed:", listErr);
        }

        // Fallback 2: Check JWT decoded claims
        if (!invitation && decoded) {
          console.log("Decoded JWT payload for fallback:", decoded);
          const scheduleId = decoded.scheduleId || decoded.schedule_id || decoded.schedId;
          const candidateId = decoded.candidateId || decoded.candidate_id || decoded.candId || decoded.id;
          const testId = decoded.testId || decoded.test_id;
          const invId = decoded.invitationId || decoded.invitation_id || decoded.invId || routeId;

          if (scheduleId) {
            invitation = { id: invId, scheduleId, candidateId, testId };
            console.log("Constructed invitation from JWT claims:", invitation);
          }
        }

        // Fallback 3: Construct invitation manually using decoded JWT if still null
        if (!invitation) {
          invitation = {
            id: routeId,
            scheduleId: decoded?.scheduleId || decoded?.schedule_id || decoded?.schedId,
            candidateId: decoded?.candidateId || decoded?.candidate_id || decoded?.id,
            testId: decoded?.testId || decoded?.test_id,
          };
          console.log("Constructed manual fallback invitation:", invitation);
        }
      }
    }

    let resolvedSchedule: any = null;
    let testObj: any = null;

    if (invitation && invitation.scheduleId) {
      try {
        const scheduleResponse = await apiClient.get(`/test-schedules/${invitation.scheduleId}`);
        resolvedSchedule = scheduleResponse.data?.data || scheduleResponse.data;
      } catch (schedErr) {
        console.warn("Failed to fetch schedule details, continuing with defaults:", schedErr);
      }
    }

    const targetTestId = invitation?.testId || resolvedSchedule?.testId || decoded?.testId || decoded?.test_id || effectiveTestId;
    if (targetTestId) {
      try {
        testObj = await testService.getTestById(targetTestId);
      } catch (testErr) {
        console.warn("Failed to fetch test details, continuing with defaults:", testErr);
      }
    }

    // Block DRAFT/ARCHIVED tests
    if (testObj && testObj.status && testObj.status !== "PUBLISHED") {
      throw new Error("This test is currently in Draft or Archived state and cannot be accessed.");
    }

    // Resolve questions: prefer questions embedded in the test object (from getTestById),
    // then fall back to the separate /test-questions endpoint
    let resolvedQuestions: TestQuestion[] = [];
    if (testObj?.testQuestions && testObj.testQuestions.length > 0) {
      resolvedQuestions = testObj.testQuestions;
    } else if (testObj?.questions && testObj.questions.length > 0) {
      resolvedQuestions = testObj.questions;
    } else if (targetTestId) {
      try {
        resolvedQuestions = await testService.getTestQuestions(targetTestId);
      } catch (qErr) {
        console.warn("Failed to fetch test questions (restricted access), continuing with defaults:", qErr);
      }
    }

    // Populate test object falling back to decoded claims or default assessment
    const fallbackTest: Test = {
      id: targetTestId || "assessment",
      title: testObj?.title || decoded?.testTitle || decoded?.test_title || "Technical Assessment",
      durationMins: testObj?.durationMins || decoded?.durationMins || decoded?.duration_mins || 45,
      proctoringMode: testObj?.proctoringMode || "STANDARD",
      description: testObj?.description || testObj?.instructions || decoded?.instructions,
      organisation: testObj?.organisation,
    };

    setTest(fallbackTest);
    setQuestions(resolvedQuestions);
    setSchedule(resolvedSchedule || null);
  };

  /**
   * Phase 1: Public status check → Auth flow → fetchProtectedData().
   * Mirrors old TestAccess.tsx mount effect + validateToken() exactly.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;

    const validateAccessAndFetch = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!routeId) {
          setError("Invalid link parameters. No invitation ID found.");
          return;
        }

        // ─── Phase 1a: Public status check (no auth needed) ───
        try {
          const statusRes = await apiClient.get(`/candidate-invitations/${routeId}/status`);
          const statusData = statusRes.data?.data || statusRes.data;
          const expired = !!statusData?.scheduleExpired;
          const submitted = !!statusData?.hasSubmittedSession;

          if (submitted) {
            navigate(`/test/${effectiveTestId || "assessment"}/results?submitted=true`);
            return;
          }
          if (expired) {
            if (isMounted) setError("This assessment schedule has expired. Please contact your administrator.");
            return;
          }
        } catch (e) {
          // If status endpoint fails, fall through to normal auth flow
          console.warn("Public status endpoint bypassed/failed:", e);
        }

        // ─── Phase 1b: Magic Link Verification ───
        const searchParams = new URLSearchParams(window.location.search);
        const currentMagicToken = magicToken || searchParams.get("magicToken");
        if (routeId && currentMagicToken) {
          try {
            const response = await apiClient.post(`/candidate-invitations/${routeId}/access/verify`, { magicToken: currentMagicToken });
            const authData = response.data?.data || response.data;
            if (authData?.accessToken) {
              window.history.replaceState({}, "", `/test/access/${routeId}`);
              handleAuthResponse(authData);
              // handleAuthResponse will login → isAuthenticated changes → effect re-runs → Phase 2 executes
              return;
            }
          } catch (err: any) {
            console.error("Magic link verification failed:", err);
          }
        }

        // ─── Phase 1c: Token validation (URL token or stored session) ───
        let decoded: any = null;

        if (routeToken) {
          // Validate invitation token via POST /candidate-invitations/validate
          try {
            const authResponse = await apiClient.post("/candidate-invitations/validate", {
              id: routeId,
              token: routeToken,
            });
            const authData = authResponse.data?.data || authResponse.data;
            if (authData?.accessToken) {
              decoded = parseJwt(authData.accessToken);
              if (decoded) {
                loginToContext(authData.accessToken, {
                  id: decoded.id,
                  name: decoded.name,
                  email: decoded.sub,
                  role: decoded.role,
                });
              } else {
                throw new Error("Failed to parse authentication token.");
              }
            }
          } catch (err: any) {
            console.warn("Invitation token validation failed:", err);
          }
        } else {
          // No URL token — check stored session (same as old TestAccess lines 396-404)
          const storedToken = localStorage.getItem("token");
          if (storedToken) {
            decoded = parseJwt(storedToken);
          }
          if (!isAuthenticated || !decoded) {
            // Not authenticated and no token in URL → stop loading, show page
            // (the page will display with whatever data is available)
            return;
          }
        }

        // ─── Phase 2: Fetch protected data (only if we have a valid decoded JWT) ───
        if (decoded) {
          await fetchProtectedData(decoded);
        }
      } catch (err: any) {
        console.error("Token validation error:", err);
        if (isMounted) {
          setError(err?.response?.data?.message || err?.message || "Invalid or expired invitation link");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    validateAccessAndFetch();

    return () => {
      isMounted = false;
    };
  }, [routeId, routeToken, magicToken, isAuthenticated]);

  // Dynamic Question Type Breakdown calculation
  const questionStats = useMemo(() => {
    const total = questions.length;
    let mcqCount = 0;
    let codingCount = 0;
    let otherCount = 0;

    questions.forEach((q) => {
      const type = q.question?.questionType || (q as any).type;
      if (type === "MCQ") mcqCount++;
      else if (type === "CODING") codingCount++;
      else otherCount++;
    });

    return { total, mcqCount, codingCount, otherCount };
  }, [questions]);

  // Derived display values with "Not Available" fallbacks
  const displayTitle = test?.title || titleProp || "Not Available";
  const displayAuthor =
    test?.organisation?.name ||
    user?.organisationData?.name ||
    authorProp ||
    "Not Available";

  const displayDuration =
    test?.durationMins != null
      ? `${test.durationMins} mins`
      : durationProp != null
      ? `${durationProp} mins`
      : "Not Available";

  const displayTotalProblems =
    questionStats.total > 0
      ? questionStats.total
      : problemsProp != null
      ? problemsProp
      : "Not Available";

  // Schedule dates from backend TestSchedule
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const displayStartTime =
    formatDateTime(schedule?.startTime) ||
    formatDateTime(test?.testSchedules?.[0]?.startTime) ||
    startProp ||
    "Not Available";

  const displayEndTime =
    formatDateTime(schedule?.endTime) ||
    formatDateTime(test?.testSchedules?.[0]?.endTime) ||
    endProp ||
    "Not Available";

  // Extract instructions strictly from backend (if not present, return null)
  const extractBackendInstructions = (testObj: Test | null) => {
    if (!testObj) return null;
    if (instructionsProp && instructionsProp.trim()) return instructionsProp;

    if (typeof testObj.instructions === "string" && testObj.instructions.trim()) {
      return testObj.instructions;
    }
    if (testObj.instructions && typeof testObj.instructions === "object") {
      const inst = testObj.instructions as Record<string, any>;
      if (typeof inst.text === "string" && inst.text.trim()) return inst.text;
      if (typeof inst.description === "string" && inst.description.trim()) return inst.description;
      if (typeof inst.rules === "string" && inst.rules.trim()) return inst.rules;
      if (typeof inst.instructions === "string" && inst.instructions.trim()) return inst.instructions;
      if (Array.isArray(inst.rules) && inst.rules.length > 0) {
        return inst.rules.join("\n");
      }
    }
    if (typeof testObj.description === "string" && testObj.description.trim()) {
      return testObj.description;
    }
    return null;
  };

  const resolvedInstructions = extractBackendInstructions(test);

  const handleStart = () => {
    if (onStartAssessment) {
      onStartAssessment();
    } else {
      setIsOnboardingOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#edf2f7] flex flex-col items-center justify-center font-sans text-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-[#4353a4] mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading assessment preview...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white relative">
      {/* ── Top Header / Dark Navbar ── */}
      <header className="h-16 bg-[#081225] text-white px-4 md:px-8 flex items-center justify-between border-b border-[#142340] shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img
              src="/Gryphon360logo.png"
              alt="Gryphon 360"
              className="h-10 md:h-11 w-auto object-contain shrink-0"
            />
          </div>
          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
          <span className="text-xs md:text-sm text-slate-300 font-medium truncate max-w-[200px] sm:max-w-md">
            {displayTitle}
          </span>
        </div>

        <div className="flex items-center gap-5 text-xs text-slate-300">
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="hover:text-white flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
          >
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
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Header Section (Title + Subtitle) */}
          <div className="text-left space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {displayTitle}
            </h1>
          </div>

          {/* 2. Test Info Metadata Banner (White Box) */}
          <div className="bg-white border border-slate-200/90 rounded-sm shadow-xs p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Duration */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] shrink-0">
                <Clock className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm md:text-base font-bold text-slate-900">
                  {displayDuration}
                </div>
                <div className="text-xs text-slate-500 font-normal">
                  to take this assessment
                </div>
              </div>
            </div>

            {/* Total Problems */}
            <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] shrink-0">
                <FileText className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm md:text-base font-bold text-slate-900">
                  {displayTotalProblems}
                </div>
                <div className="text-xs text-slate-500 font-normal">
                  {displayTotalProblems === 1 ? "problem to be solved" : "problems to be solved"}
                </div>
              </div>
            </div>

            {/* Schedule Window */}
            <div className="flex items-center gap-3.5 md:border-l md:border-slate-100 md:pl-6">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4353a4] shrink-0">
                <Calendar className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div className="space-y-0.5 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">Starts:</span> {displayStartTime}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Ends:</span> {displayEndTime}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Assessment Instructions Section */}
          <div className="bg-white border border-slate-200/90 rounded-sm shadow-xs overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                Assessment Instructions
              </h2>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {resolvedInstructions ? (
                <div className="text-xs md:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                  {resolvedInstructions}
                </div>
              ) : (
                <div className="text-xs md:text-sm text-slate-400 italic">
                  null
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
                  <span>
                    Go through environment details, FAQs, and the help section before you start taking this assessment.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Help / Information Modal ── */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-sm max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Assessment Information
              </h3>
              <button
                onClick={() => setHelpOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <strong className="text-slate-800">Test:</strong> {displayTitle}
              </div>
              <div>
                <strong className="text-slate-800">Organization:</strong> {displayAuthor}
              </div>
              <div>
                <strong className="text-slate-800">Duration:</strong> {displayDuration}
              </div>
              <div>
                <strong className="text-slate-800">Total Problems:</strong> {displayTotalProblems}
              </div>
              <div>
                <strong className="text-slate-800">Proctoring Mode:</strong>{" "}
                {test?.proctoringMode || "STANDARD"}
              </div>
              <p className="pt-2 text-slate-500 leading-relaxed border-t border-slate-100">
                Make sure your device has a functional camera and microphone if proctoring is enabled. For assistance, reach out to your administrator.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHelpOpen(false)}
                className="text-xs uppercase font-bold tracking-wider"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Right Support Bubble ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setHelpOpen(true)}
          className="w-12 h-12 rounded-full bg-[#4353a4] hover:bg-[#344287] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
          title="Need Help?"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* ── 4. Full-Screen Onboarding Wizard Overlay ── */}
      {isOnboardingOpen && (
        <NewCandidateOnboardingWizard
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          test={test}
          testQuestions={questions}
          testTitle={displayTitle}
          invitationId={routeId || invitationId}
          testId={effectiveTestId}
          isWebcamMonitored={
            !!(
              test?.requireWebcam ||
              test?.proctoringMode === "HIGH" ||
              test?.proctoringMode === "MEDIUM" ||
              test?.proctoringMode === "CUSTOM"
            )
          }
        />
      )}
    </div>
  );
}
