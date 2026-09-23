import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Mail,
  Clock,
  Target,
  Award,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Grid,
  Search,
  LogOut,
  User as UserIcon,
  Lock,
  Check,
  X,
  Layers,
  FileQuestion,
  ExternalLink,
  Loader2,
  Code2,
  Copy,
  Terminal,
  Users,
  UserX,
  EyeOff,
  Maximize2,
  Mic,
  Monitor,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  RotateCcw,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { testService, Test, TestSession, TestResult, Question, TestQuestion } from "@/lib/test-service";
import { candidateService, CandidateInvitation } from "@/lib/candidate-service";
import { GryphonLogo } from "@/components/ui/GryphonLogo";
import { AdminPinNavWidget } from "@/components/admin/AdminPinNavWidget";
import { renderFormattedContent } from "@/lib/html-utils";
import { toast } from "sonner";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface SolutionQuestionItem {
  id: string;
  title: string;
  prompt: string;
  type: "MCQ" | "CODING";
  mcqType?: string;
  marks: number;
  earnedScore: number;
  status: "ACCEPTED" | "REJECTED" | "UNSOLVED";
  sectionName: string;
  difficulty?: string;
  // MCQ specific
  options?: Array<{ id?: string; text: string; isCorrect?: boolean }>;
  candidateSelectedOption?: any;
  isCorrect?: boolean;
  // Coding specific
  submittedCode?: string;
  language?: string;
  testCasesPassed?: number;
  testCasesTotal?: number;
  executionStatus?: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput?: string;
    passed?: boolean;
    explanation?: string;
    sample?: boolean;
  }>;
  hints?: string[];
  sampleExplanation?: string;
}

interface SectionGroup {
  name: string;
  earnedScore: number;
  maxScore: number;
  questions: SolutionQuestionItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTimeTaken = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return s > 0 ? `${s}s` : "< 1m";
};

const mapLanguageToMonaco = (lang?: string): string => {
  const l = (lang || "").toLowerCase();
  if (l.includes("python") || l.includes("py")) return "python";
  if (l.includes("javascript") || l.includes("js") || l.includes("node")) return "javascript";
  if (l.includes("java")) return "java";
  if (l.includes("cpp") || l.includes("c++") || l.includes("c")) return "cpp";
  return "plaintext";
};

export default function NewAdminCandidateDetails() {
  const { testId, invitationId, candidateId } = useParams<{
    testId?: string;
    invitationId?: string;
    candidateId?: string;
  }>();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const querySessionId = searchParams.get("sessionId");
  const queryScheduleId = searchParams.get("scheduleId");
  const queryCandId = searchParams.get("candidateId") || candidateId;

  // ── States ──
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [allQuestionsList, setAllQuestionsList] = useState<Question[]>([]);
  const [groupedQuestionsMap, setGroupedQuestionsMap] = useState<Record<string, TestQuestion[]>>({});
  const [invitation, setInvitation] = useState<CandidateInvitation | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [proctoringDetail, setProctoringDetail] = useState<any | null>(null);
  const [paperData, setPaperData] = useState<any | null>(null);
  const [resumeData, setResumeData] = useState<any | null>(null);

  // ── Timeline Player State for Webcam Proctoring ──
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5, 1, 1.5, 2, 4

  // ── Expand/Collapse States for Identity & Violation Snapshot Sections ──
  const [isIdentityExpanded, setIsIdentityExpanded] = useState(false);
  const [isViolationsExpanded, setIsViolationsExpanded] = useState(false);

  // ── Timeline Player State for Violation Evidence Snapshots ──
  const [currentViolationSnapshotIndex, setCurrentViolationSnapshotIndex] = useState(0);
  const [isViolationPlaying, setIsViolationPlaying] = useState(false);
  const [violationPlaybackSpeed, setViolationPlaybackSpeed] = useState<number>(1);

  // ── Pagination State for Violation Events Log ──
  const [violationPage, setViolationPage] = useState(1);
  const [violationPageSize, setViolationPageSize] = useState(5);

  // ── Modal State for View Solution ──
  const [selectedSolutionQuestion, setSelectedSolutionQuestion] = useState<SolutionQuestionItem | null>(null);
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);

  // Load all relevant data
  const loadCandidateData = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedTestId = testId;
      let resolvedCandidateId = queryCandId;
      let resolvedScheduleId = queryScheduleId;
      let resolvedSessionId = querySessionId;
      let resolvedInvitation: CandidateInvitation | null = null;

      // 1. Fetch Test details and questions if testId is available
      if (resolvedTestId) {
        try {
          const [t, groupedQs, allQs] = await Promise.all([
            testService.getTestById(resolvedTestId).catch(() => null),
            testService.getGroupedTestQuestions(resolvedTestId).catch(() => ({})),
            testService.getAllQuestions().catch(() => []),
          ]);
          if (t) setTest(t);
          if (groupedQs) setGroupedQuestionsMap(groupedQs);
          if (allQs) setAllQuestionsList(allQs);
        } catch (e) {
          console.warn("[NewAdminCandidateDetails] Failed to load test data:", e);
        }
      }

      // 2. If invitationId provided, lookup invitation details
      if (invitationId && invitationId !== "detail" && invitationId !== "report") {
        try {
          const invRes = await apiClient.get(`/candidate-invitations/${invitationId}`).catch(() => null);
          if (invRes?.data) {
            resolvedInvitation = invRes.data?.data || invRes.data;
            if (resolvedInvitation) {
              setInvitation(resolvedInvitation);
              resolvedTestId = resolvedTestId || resolvedInvitation.testId;
              resolvedCandidateId = resolvedCandidateId || resolvedInvitation.candidateId;
              resolvedScheduleId = resolvedScheduleId || resolvedInvitation.scheduleId;
            }
          }
        } catch {
          // continue fallback
        }
      }

      // If invitation not found yet and scheduleId is known, try schedule invitations list
      if (!resolvedInvitation && resolvedScheduleId) {
        try {
          const scheduleInvs = await candidateService.getInvitationsBySchedule(resolvedScheduleId).catch(() => []);
          const matched = (scheduleInvs || []).find(
            (i: CandidateInvitation) => i.id === invitationId || (resolvedCandidateId && i.candidateId === resolvedCandidateId)
          );
          if (matched) {
            resolvedInvitation = matched;
            setInvitation(matched);
            resolvedCandidateId = resolvedCandidateId || matched.candidateId;
            resolvedTestId = resolvedTestId || matched.testId;
          }
        } catch {
          // continue
        }
      }

      // 3. If scheduleId and candidateId available, fetch proctoring detail
      if (resolvedCandidateId) {
        try {
          const url = resolvedScheduleId
            ? `/api/admin/proctoring/candidates/${resolvedCandidateId}/details?scheduleId=${resolvedScheduleId}`
            : `/api/admin/proctoring/candidates/${resolvedCandidateId}/details`;
          const detailRes = await apiClient.get(url).catch(() => null);
          const d = detailRes?.data?.data || detailRes?.data;
          if (d) {
            setProctoringDetail(d);
            resolvedSessionId = resolvedSessionId || d?.systemInfo?.sessionId || d?.sessionId;
          }
        } catch {
          // fallback
        }
      }

      // 4. If sessionId available (or resolved), fetch session, result, paper, resume
      if (resolvedSessionId) {
        const [sessionRes, resultRes, paperRes, resumeRes] = await Promise.allSettled([
          apiClient.get(`/test-sessions/${resolvedSessionId}`),
          apiClient.get(`/test-results/session/${resolvedSessionId}`),
          apiClient.get(`/test-sessions/${resolvedSessionId}/paper`),
          apiClient.get(`/test-sessions/${resolvedSessionId}/resume`),
        ]);

        if (sessionRes.status === "fulfilled") {
          const s = sessionRes.value.data?.data || sessionRes.value.data;
          setSession(s);
        }
        if (resultRes.status === "fulfilled") {
          const r = resultRes.value.data?.data || resultRes.value.data;
          setTestResult(r);
        }
        if (paperRes.status === "fulfilled") {
          setPaperData(paperRes.value.data?.data || paperRes.value.data);
        }
        if (resumeRes.status === "fulfilled") {
          setResumeData(resumeRes.value.data?.data || resumeRes.value.data);
        }
      } else if (resolvedTestId && resolvedCandidateId) {
        // Search session from test sessions
        try {
          const allSessions = await testService.getAllSessions().catch(() => []);
          const matchedSession = (allSessions || []).find(
            (s) => s.testId === resolvedTestId && s.candidateId === resolvedCandidateId
          );
          if (matchedSession) {
            setSession(matchedSession);
            const [resultRes, paperRes, resumeRes] = await Promise.allSettled([
              apiClient.get(`/test-results/session/${matchedSession.id}`),
              apiClient.get(`/test-sessions/${matchedSession.id}/paper`),
              apiClient.get(`/test-sessions/${matchedSession.id}/resume`),
            ]);
            if (resultRes.status === "fulfilled") setTestResult(resultRes.value.data?.data || resultRes.value.data);
            if (paperRes.status === "fulfilled") setPaperData(paperRes.value.data?.data || paperRes.value.data);
            if (resumeRes.status === "fulfilled") setResumeData(resumeRes.value.data?.data || resumeRes.value.data);
          }
        } catch {
          // continue
        }
      }
    } catch (err: any) {
      console.error("[NewAdminCandidateDetails] Failed to load candidate details:", err);
      toast.error("Failed to load candidate details: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [testId, invitationId, queryCandId, queryScheduleId, querySessionId]);

  useEffect(() => {
    loadCandidateData();
  }, [loadCandidateData]);

  // ── Candidate Metadata ──
  const candidateName = useMemo(() => {
    return (
      invitation?.candidateName ||
      invitation?.candidate?.user?.name ||
      invitation?.candidate?.name ||
      proctoringDetail?.candidate?.candidateName ||
      proctoringDetail?.candidate?.name ||
      proctoringDetail?.name ||
      "Candidate"
    );
  }, [proctoringDetail, invitation]);

  const candidateInitials = useMemo(() => {
    if (!candidateName || candidateName === "Candidate") return "CA";
    const parts = candidateName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return candidateName.slice(0, 2).toUpperCase();
  }, [candidateName]);

  const candidateEmail = useMemo(() => {
    return (
      invitation?.candidateEmail ||
      invitation?.candidate?.user?.email ||
      invitation?.candidate?.email ||
      proctoringDetail?.candidate?.email ||
      proctoringDetail?.email ||
      "—"
    );
  }, [proctoringDetail, invitation]);

  const testTitle = useMemo(() => {
    return test?.title || invitation?.test?.title || "Assessment";
  }, [test, invitation]);

  const submissionDateFormatted = useMemo(() => {
    const rawDate =
      testResult?.evaluatedAt ||
      session?.submittedAt ||
      session?.startedAt ||
      invitation?.updatedAt ||
      invitation?.createdAt;
    if (!rawDate) return "Not Submitted Yet";
    try {
      const dt = new Date(rawDate);
      if (isNaN(dt.getTime())) return "Not Submitted Yet";
      return dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Not Submitted Yet";
    }
  }, [testResult, session, invitation]);

  // ── Compute Section-Wise Questions & Candidate Solutions ──
  const sectionGroups: SectionGroup[] = useMemo(() => {
    const submissions = resumeData?.submissions || resumeData?.data?.submissions || [];
    const answers = resumeData?.answers || resumeData?.data?.answers || [];

    // Helper to find question object by ID
    const findQuestion = (qId: string): Question | undefined => {
      return allQuestionsList.find((q) => q.id === qId);
    };

    // Determine raw list of sections & test questions
    const rawGrouped = groupedQuestionsMap && Object.keys(groupedQuestionsMap).length > 0
      ? groupedQuestionsMap
      : null;

    let groupsObj: Record<string, any[]> = {};

    if (rawGrouped) {
      groupsObj = rawGrouped;
    } else if (paperData?.paper?.questions?.length) {
      // From paper data
      paperData.paper.questions.forEach((q: any) => {
        const sec = q.sectionName || "Ungrouped";
        if (!groupsObj[sec]) groupsObj[sec] = [];
        groupsObj[sec].push(q);
      });
    } else if (test?.questions?.length) {
      test.questions.forEach((tq) => {
        const sec = tq.sectionName || "Ungrouped";
        if (!groupsObj[sec]) groupsObj[sec] = [];
        groupsObj[sec].push(tq);
      });
    }

    const resultSections: SectionGroup[] = [];

    // Order section names
    const secKeys = Object.keys(groupsObj).sort((a, b) => {
      if (a === "Ungrouped") return 1;
      if (b === "Ungrouped") return -1;
      return a.localeCompare(b);
    });

    secKeys.forEach((secName) => {
      const tqList = groupsObj[secName] || [];
      let secEarned = 0;
      let secMax = 0;
      const questionItems: SolutionQuestionItem[] = [];

      tqList.forEach((tq: any, idx: number) => {
        const qId = tq.questionId || tq.question?.id || tq.id;
        const fullQ = tq.question || findQuestion(qId) || tq;
        const qType: "MCQ" | "CODING" = (fullQ.questionType || tq.type || "MCQ").toUpperCase() === "CODING" ? "CODING" : "MCQ";
        const maxMarks = Number(tq.marks ?? fullQ.marks ?? (qType === "CODING" ? 10 : 1));
        secMax += maxMarks;

        const title = fullQ.title || tq.title || `Question #${idx + 1}`;
        const prompt = fullQ.prompt || tq.prompt || "";
        const difficulty = fullQ.difficulty || tq.difficulty || "MEDIUM";

        if (qType === "MCQ") {
          const opts = fullQ.mcqOptions || tq.mcqOptions || fullQ.options || tq.options || [];
          // Find answer in resumeData answers or submissions
          const ansEntry = (Array.isArray(answers) ? answers : []).find(
            (a: any) => a.questionId === qId || a.id === qId
          ) || (Array.isArray(submissions) ? submissions : []).find(
            (s: any) => s.questionId === qId || s.id === qId
          );

          let candidateChoice: any = null;
          let isCorrect = false;
          let status: "ACCEPTED" | "REJECTED" | "UNSOLVED" = "UNSOLVED";
          let earned = 0;

          if (ansEntry) {
            candidateChoice = ansEntry.selectedOption ?? ansEntry.selectedOptionId ?? ansEntry.answer ?? ansEntry.optionIndex;
            if (ansEntry.isCorrect !== undefined) {
              isCorrect = ansEntry.isCorrect === true;
            } else if (ansEntry.score !== undefined && ansEntry.score > 0) {
              isCorrect = true;
            } else if (typeof candidateChoice === "number" && opts[candidateChoice]) {
              isCorrect = Boolean(opts[candidateChoice].isCorrect);
            } else if (typeof candidateChoice === "string") {
              const matchedOpt = opts.find((o: any) => o.id === candidateChoice || o.text === candidateChoice);
              isCorrect = Boolean(matchedOpt?.isCorrect);
            }

            status = isCorrect ? "ACCEPTED" : "REJECTED";
            earned = isCorrect ? maxMarks : 0;
          }

          secEarned += earned;

          questionItems.push({
            id: qId,
            title,
            prompt,
            type: "MCQ",
            mcqType: fullQ.mcqType,
            marks: maxMarks,
            earnedScore: earned,
            status,
            sectionName: secName,
            difficulty,
            options: opts,
            candidateSelectedOption: candidateChoice,
            isCorrect,
            hints: fullQ.hints,
            sampleExplanation: fullQ.sampleExplanation,
          });
        } else {
          // CODING question
          const subEntry = (Array.isArray(submissions) ? submissions : []).find(
            (s: any) => s.questionId === qId || s.codingQuestionId === qId || s.id === qId
          );

          let status: "ACCEPTED" | "REJECTED" | "UNSOLVED" = "UNSOLVED";
          let earned = 0;
          let submittedCode = "";
          let language = "python3";
          let passedTC = 0;
          let totalTC = fullQ.testCases?.length || 5;
          let execStatus = "";

          if (subEntry) {
            submittedCode = subEntry.sourceCode || subEntry.code || subEntry.submission || "";
            language = subEntry.language || "python3";
            passedTC = subEntry.testCasesPassed ?? (subEntry.status === "ACCEPTED" ? totalTC : 0);
            totalTC = subEntry.testCasesTotal || totalTC;
            execStatus = subEntry.status || "COMPLETED";

            if (subEntry.scoreAwarded !== undefined && subEntry.scoreAwarded !== null) {
              earned = Number(subEntry.scoreAwarded);
              status = earned >= maxMarks || subEntry.status === "ACCEPTED" ? "ACCEPTED" : "REJECTED";
            } else if (subEntry.status === "ACCEPTED" || subEntry.status === "PASSED") {
              earned = maxMarks;
              status = "ACCEPTED";
            } else {
              earned = 0;
              status = "REJECTED";
            }
          }

          secEarned += earned;

          questionItems.push({
            id: qId,
            title,
            prompt,
            type: "CODING",
            marks: maxMarks,
            earnedScore: earned,
            status,
            sectionName: secName,
            difficulty,
            submittedCode,
            language,
            testCasesPassed: passedTC,
            testCasesTotal: totalTC,
            executionStatus: execStatus,
            testCases: fullQ.testCases,
            hints: fullQ.hints,
            sampleExplanation: fullQ.sampleExplanation,
          });
        }
      });

      resultSections.push({
        name: secName,
        earnedScore: secEarned,
        maxScore: secMax,
        questions: questionItems,
      });
    });

    return resultSections;
  }, [allQuestionsList, groupedQuestionsMap, paperData, test, resumeData]);

  // Total questions count
  const totalQuestionsCount = useMemo(() => {
    return sectionGroups.reduce((acc, sec) => acc + sec.questions.length, 0);
  }, [sectionGroups]);

  // Attempted, correct, incorrect, unsolved counts
  const { attemptedCount, correctCount, incorrectCount, unsolvedCount } = useMemo(() => {
    let attempted = 0;
    let correct = 0;
    let incorrect = 0;
    let unsolved = 0;

    sectionGroups.forEach((sec) => {
      sec.questions.forEach((q) => {
        if (q.status === "ACCEPTED") {
          attempted++;
          correct++;
        } else if (q.status === "REJECTED") {
          attempted++;
          incorrect++;
        } else {
          unsolved++;
        }
      });
    });

    return {
      attemptedCount: attempted,
      correctCount: correct,
      incorrectCount: incorrect,
      unsolvedCount: unsolved,
    };
  }, [sectionGroups]);

  // Duration / Time Taken
  const timeTakenDisplay = useMemo(() => {
    if (testResult && (testResult as any).timeTakenSeconds) {
      return formatTimeTaken((testResult as any).timeTakenSeconds);
    }
    if ((session as any)?.timeTakenSeconds) {
      return formatTimeTaken((session as any).timeTakenSeconds);
    }

    const started =
      session?.startedAt ||
      (session as any)?.startTime ||
      (session as any)?.createdAt ||
      proctoringDetail?.systemInfo?.startedAt ||
      proctoringDetail?.startedAt ||
      invitation?.startedAt ||
      (invitation as any)?.startTime ||
      invitation?.createdAt ||
      (testResult as any)?.startedAt ||
      proctoringDetail?.createdAt;

    const ended =
      session?.submittedAt ||
      (session as any)?.endedAt ||
      (session as any)?.endTime ||
      (session as any)?.updatedAt ||
      proctoringDetail?.systemInfo?.endedAt ||
      proctoringDetail?.systemInfo?.submittedAt ||
      proctoringDetail?.submittedAt ||
      proctoringDetail?.endedAt ||
      proctoringDetail?.systemInfo?.lastActivityAt ||
      testResult?.evaluatedAt ||
      (testResult as any)?.createdAt ||
      invitation?.updatedAt;

    if (started && ended) {
      const s = new Date(started).getTime();
      const e = new Date(ended).getTime();
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        const diffSec = Math.max(0, Math.floor((e - s) / 1000));
        return formatTimeTaken(diffSec);
      }
    }

    if (testResult && (testResult as any).timeTaken) {
      return String((testResult as any).timeTaken);
    }
    if (proctoringDetail && (proctoringDetail as any).timeTaken) {
      return String((proctoringDetail as any).timeTaken);
    }
    if (session && (session as any).timeTaken) {
      return String((session as any).timeTaken);
    }

    if (session?.status === "IN_PROGRESS" || session?.status === "STARTED" || proctoringDetail?.testStatus === "IN_PROGRESS") {
      return "In Progress";
    }
    return "—";
  }, [testResult, session, proctoringDetail, invitation]);

  // Score & Percentages
  const maxScore = useMemo(() => {
    const calculatedMax = sectionGroups.reduce((acc, sec) => acc + sec.maxScore, 0);
    return testResult?.maxScore || test?.totalMarks || (calculatedMax > 0 ? calculatedMax : 100);
  }, [testResult, test, sectionGroups]);

  const scoreValue = useMemo(() => {
    if (testResult?.totalScore !== undefined && testResult?.totalScore !== null) {
      return Number(testResult.totalScore);
    }
    const calculatedEarned = sectionGroups.reduce((acc, sec) => acc + sec.earnedScore, 0);
    if (calculatedEarned > 0 || (session?.submittedAt && attemptedCount > 0)) {
      return calculatedEarned;
    }
    return null;
  }, [testResult, sectionGroups, session, attemptedCount]);

  const percentageValue = useMemo(() => {
    if (testResult?.percentage !== undefined && testResult?.percentage !== null) {
      return Math.round(testResult.percentage);
    }
    if (scoreValue !== null && maxScore > 0) {
      return Math.round((scoreValue / maxScore) * 100);
    }
    return null;
  }, [testResult, scoreValue, maxScore]);

  const passCutoff = useMemo(() => {
    return test?.passMark || 40;
  }, [test]);

  const isEvaluated = testResult !== null && testResult !== undefined;
  const isPassed = useMemo(() => {
    if (testResult?.passed !== undefined && testResult?.passed !== null) {
      return testResult.passed;
    }
    if (percentageValue !== null) {
      return percentageValue >= passCutoff;
    }
    return false;
  }, [testResult, percentageValue, passCutoff]);

  // Status Badge Label & Subtext
  const statusDisplay = useMemo(() => {
    if (isEvaluated) {
      return {
        label: isPassed ? "Passed" : "Failed",
        subtext: `in the assignment (Cut-off score >= ${passCutoff}%)`,
        isPassed: isPassed,
        isEvaluated: true,
      };
    }
    if (session?.status === "IN_PROGRESS" || session?.status === "STARTED") {
      return {
        label: "In Progress",
        subtext: "Assessment is currently ongoing",
        isPassed: false,
        isEvaluated: false,
      };
    }
    if (invitation?.status === "PENDING") {
      return {
        label: "Invited",
        subtext: "Candidate has not started assessment",
        isPassed: false,
        isEvaluated: false,
      };
    }
    return {
      label: invitation?.status || "Pending",
      subtext: `Cut-off score >= ${passCutoff}%`,
      isPassed: false,
      isEvaluated: false,
    };
  }, [isEvaluated, isPassed, passCutoff, session, invitation]);

  // Violations
  const violationsDisplay = useMemo(() => {
    const vCount =
      proctoringDetail?.violationsCount ??
      proctoringDetail?.violations?.length ??
      session?.fullscreenViolations ??
      0;

    if (!session && !proctoringDetail) {
      return {
        label: "0 Violations",
        subtext: "flag by proctoring engine",
      };
    }

    if (vCount === 0) {
      return {
        label: "Negligible Violation",
        subtext: "flag by proctoring engine",
      };
    }
    if (vCount <= 2) {
      return {
        label: `${vCount} Minor Violation${vCount > 1 ? "s" : ""}`,
        subtext: "flag by proctoring engine",
      };
    }
    return {
      label: `${vCount} Critical Violations`,
      subtext: "flag by proctoring engine",
    };
  }, [proctoringDetail, session]);

  // ── Granular Proctoring Analysis Metrics & Event Timeline ──
  const proctoringAnalysis = useMemo(() => {
    const rawViolations: any[] = proctoringDetail?.violations || proctoringDetail?.events || [];

    let tabSwitchCount = session?.tabSwitches || 0;
    let multiFaceCount = 0;
    let noFaceCount = 0;
    let lookAwayCount = 0;
    let devtoolsCount = 0;
    let copyPasteCount = 0;
    let speechCount = 0;
    let fullscreenCount = session?.fullscreenViolations || 0;

    const formattedEvents: Array<{
      id: string;
      time: string;
      eventType: string;
      displayType: string;
      severity: string;
      description: string;
    }> = [];

    rawViolations.forEach((v: any, idx: number) => {
      const typeStr = (v.eventType || v.type || "").toUpperCase();
      let displayType = v.eventType || v.type || "Violation";

      if (typeStr.includes("TAB_SWITCH") || typeStr.includes("WINDOW_BLUR")) {
        tabSwitchCount++;
        displayType = "Tab Switch";
      } else if (typeStr.includes("MULTI_FACE") || typeStr.includes("MULTIPLE_FACES")) {
        multiFaceCount++;
        displayType = "Multiple Faces";
      } else if (typeStr.includes("NO_FACE") || typeStr.includes("FACE_NOT_VISIBLE")) {
        noFaceCount++;
        displayType = "No Face Detected";
      } else if (typeStr.includes("LOOK_AWAY") || typeStr.includes("FACE_TURNED")) {
        lookAwayCount++;
        displayType = "Look Away";
      } else if (typeStr.includes("DEVTOOLS") || typeStr.includes("INSPECT")) {
        devtoolsCount++;
        displayType = "DevTools Opened";
      } else if (typeStr.includes("COPY_PASTE") || typeStr.includes("CLIPBOARD")) {
        copyPasteCount++;
        displayType = "Copy / Paste Blocked";
      } else if (typeStr.includes("SPEECH") || typeStr.includes("AUDIO") || typeStr.includes("VOICE")) {
        speechCount++;
        displayType = "Audio / Speech Detected";
      } else if (typeStr.includes("FULLSCREEN")) {
        fullscreenCount++;
        displayType = "Fullscreen Exit";
      } else {
        displayType = typeStr.replace(/_/g, " ");
      }

      const eventTime = v.occurredAt || v.timestamp || v.time;
      let timeFormatted = "—";
      if (eventTime) {
        try {
          const d = new Date(typeof eventTime === "number" ? eventTime : eventTime);
          timeFormatted = isNaN(d.getTime())
            ? String(eventTime)
            : d.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              });
        } catch {
          timeFormatted = "—";
        }
      }

      formattedEvents.push({
        id: v.id || v.eventId || `evt-${idx}`,
        time: timeFormatted,
        eventType: typeStr,
        displayType,
        severity:
          v.severity ||
          (typeStr.includes("DEVTOOLS") || typeStr.includes("MULTI_FACE")
            ? "HIGH"
            : typeStr.includes("NO_FACE") || typeStr.includes("LOOK_AWAY")
            ? "MEDIUM"
            : "LOW"),
        description: v.metadata?.description || v.description || `Triggered ${displayType}`,
      });
    });

    const totalViolationsCount =
      tabSwitchCount +
      multiFaceCount +
      noFaceCount +
      lookAwayCount +
      devtoolsCount +
      copyPasteCount +
      speechCount +
      fullscreenCount;

    const trustScore =
      proctoringDetail?.trustScore !== undefined
        ? Math.max(0, Math.min(100, Math.round(proctoringDetail.trustScore)))
        : proctoringDetail?.riskScore !== undefined
        ? Math.max(0, Math.min(100, Math.round(proctoringDetail.riskScore)))
        : totalViolationsCount === 0
        ? 100
        : Math.max(
            0,
            100 -
              (tabSwitchCount * 2 +
                multiFaceCount * 10 +
                noFaceCount * 5 +
                lookAwayCount * 2 +
                devtoolsCount * 10 +
                copyPasteCount * 5 +
                speechCount * 5 +
                fullscreenCount * 5)
          );

    return {
      tabSwitchCount,
      multiFaceCount,
      noFaceCount,
      lookAwayCount,
      devtoolsCount,
      copyPasteCount,
      speechCount,
      fullscreenCount,
      totalViolationsCount,
      trustScore,
      events: formattedEvents,
    };
  }, [proctoringDetail, session]);

  // ── Pagination Calculation for Violation Events Log ──
  const totalViolationEvents = proctoringAnalysis.events.length;
  const totalViolationPages = Math.max(1, Math.ceil(totalViolationEvents / violationPageSize));
  const safeViolationPage = Math.min(violationPage, totalViolationPages);
  const startViolationRecord = totalViolationEvents === 0 ? 0 : (safeViolationPage - 1) * violationPageSize + 1;
  const endViolationRecord = Math.min(safeViolationPage * violationPageSize, totalViolationEvents);

  const paginatedViolationEvents = useMemo(() => {
    const startIndex = (safeViolationPage - 1) * violationPageSize;
    return proctoringAnalysis.events.slice(startIndex, startIndex + violationPageSize);
  }, [proctoringAnalysis.events, safeViolationPage, violationPageSize]);

  // ── Normalized Timeline Snapshots for Webcam Player (Periodic Snapshots Only) ──
  const timelineSnapshots = useMemo(() => {
    const snaps: Array<{
      id: string;
      url: string;
      capturedAt?: string;
      timestamp?: number;
      type: string;
    }> = [];

    // Strictly from proctoringDetail.snapshots (periodic audit snapshots only)
    if (Array.isArray(proctoringDetail?.snapshots)) {
      proctoringDetail.snapshots.forEach((s: any, idx: number) => {
        const rawUrl =
          s.imageUrl ||
          (s.s3Key && s.s3Key.startsWith("http")
            ? s.s3Key
            : s.imageData
            ? s.imageData.startsWith("data:")
              ? s.imageData
              : `data:image/jpeg;base64,${s.imageData}`
            : s.s3Key || "");
        if (rawUrl) {
          snaps.push({
            id: s.id || `snap-${idx}`,
            url: rawUrl,
            capturedAt: s.capturedAt,
            timestamp: s.capturedAt ? new Date(s.capturedAt).getTime() : idx,
            type: "Periodic Snapshot",
          });
        }
      });
    }

    // Sort chronologically by timestamp
    return snaps.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [proctoringDetail]);

  // Ensure current index is valid
  useEffect(() => {
    if (currentSnapshotIndex >= timelineSnapshots.length && timelineSnapshots.length > 0) {
      setCurrentSnapshotIndex(timelineSnapshots.length - 1);
    }
  }, [timelineSnapshots.length, currentSnapshotIndex]);

  // Autoplay Timer for Timeline Player
  useEffect(() => {
    if (!isPlaying || timelineSnapshots.length <= 1) return;

    const intervalMs = Math.max(200, Math.floor(1000 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentSnapshotIndex((prev) => {
        if (prev >= timelineSnapshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, timelineSnapshots.length]);

  const handleNextSnapshot = () => {
    if (timelineSnapshots.length === 0) return;
    setCurrentSnapshotIndex((prev) => Math.min(timelineSnapshots.length - 1, prev + 1));
  };

  const handlePrevSnapshot = () => {
    if (timelineSnapshots.length === 0) return;
    setCurrentSnapshotIndex((prev) => Math.max(0, prev - 1));
  };

  const handleJumpForward = () => {
    if (timelineSnapshots.length === 0) return;
    setCurrentSnapshotIndex((prev) => Math.min(timelineSnapshots.length - 1, prev + 5));
  };

  const handleJumpBackward = () => {
    if (timelineSnapshots.length === 0) return;
    setCurrentSnapshotIndex((prev) => Math.max(0, prev - 5));
  };

  const handleRestartTimeline = () => {
    setCurrentSnapshotIndex(0);
    setIsPlaying(false);
  };

  // ── Candidate Identity Verification Photo ──
  const identityPhoto = useMemo(() => {
    const cp = proctoringDetail?.candidatePhoto;
    if (!cp) return null;
    const rawUrl =
      cp.imageUrl ||
      (cp.s3Key && cp.s3Key.startsWith("http")
        ? cp.s3Key
        : cp.imageData
        ? cp.imageData.startsWith("data:")
          ? cp.imageData
          : `data:image/jpeg;base64,${cp.imageData}`
        : cp.storagePath || cp.s3Key || "");
    if (!rawUrl) return null;
    return {
      id: cp.id || "identity-photo",
      url: rawUrl,
      capturedAt: cp.capturedAt,
    };
  }, [proctoringDetail]);

  // ── Violation Evidence Snapshots (Strictly Violation Evidence Only) ──
  const violationSnapshots = useMemo(() => {
    const snaps: Array<{
      id: string;
      url: string;
      capturedAt?: string;
      timestamp?: number;
      eventType?: string;
      severity?: string;
    }> = [];

    // Strictly from proctoringDetail.evidence (images captured upon violation events)
    if (Array.isArray(proctoringDetail?.evidence)) {
      proctoringDetail.evidence.forEach((ev: any, idx: number) => {
        // Exclude periodic audit snapshots or candidate photo if present
        if (ev.snapshotType === "AUDIT" || ev.snapshotType === "CANDIDATE_PHOTO") return;
        const rawUrl =
          ev.imageUrl ||
          (ev.s3Key && ev.s3Key.startsWith("http")
            ? ev.s3Key
            : ev.imageData
            ? ev.imageData.startsWith("data:")
              ? ev.imageData
              : `data:image/jpeg;base64,${ev.imageData}`
            : ev.storagePath || ev.s3Key || "");
        if (rawUrl) {
          snaps.push({
            id: ev.id || `ev-${idx}`,
            url: rawUrl,
            capturedAt: ev.capturedAt,
            timestamp: ev.capturedAt ? new Date(ev.capturedAt).getTime() : idx,
            eventType: ev.snapshotType === "VIOLATION" ? "VIOLATION" : ev.snapshotType || "VIOLATION_EVIDENCE",
            severity: ev.severity || "HIGH",
          });
        }
      });
    }

    return snaps.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [proctoringDetail]);

  // Ensure current violation snapshot index is valid
  useEffect(() => {
    if (currentViolationSnapshotIndex >= violationSnapshots.length && violationSnapshots.length > 0) {
      setCurrentViolationSnapshotIndex(violationSnapshots.length - 1);
    }
  }, [violationSnapshots.length, currentViolationSnapshotIndex]);

  // Autoplay Timer for Violation Timeline Player
  useEffect(() => {
    if (!isViolationPlaying || violationSnapshots.length <= 1) return;

    const intervalMs = Math.max(200, Math.floor(1000 / violationPlaybackSpeed));
    const timer = setInterval(() => {
      setCurrentViolationSnapshotIndex((prev) => {
        if (prev >= violationSnapshots.length - 1) {
          setIsViolationPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isViolationPlaying, violationPlaybackSpeed, violationSnapshots.length]);

  const handleNextViolationSnapshot = () => {
    if (violationSnapshots.length === 0) return;
    setCurrentViolationSnapshotIndex((prev) => Math.min(violationSnapshots.length - 1, prev + 1));
  };

  const handlePrevViolationSnapshot = () => {
    if (violationSnapshots.length === 0) return;
    setCurrentViolationSnapshotIndex((prev) => Math.max(0, prev - 1));
  };

  const handleJumpForwardViolation = () => {
    if (violationSnapshots.length === 0) return;
    setCurrentViolationSnapshotIndex((prev) => Math.min(violationSnapshots.length - 1, prev + 5));
  };

  const handleJumpBackwardViolation = () => {
    if (violationSnapshots.length === 0) return;
    setCurrentViolationSnapshotIndex((prev) => Math.max(0, prev - 5));
  };

  const handleRestartViolationTimeline = () => {
    setCurrentViolationSnapshotIndex(0);
    setIsViolationPlaying(false);
  };

  const togglePlaybackSpeed = () => {
    const speeds = [0.5, 1, 2, 4];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const handleReturnToCandidates = () => {
    if (testId) {
      navigate(`/admin/tests/edit/${testId}?tab=candidates`);
    } else {
      navigate(-1);
    }
  };

  const handleReturnToTest = () => {
    if (testId) {
      navigate(`/admin/tests/edit/${testId}`);
    } else {
      navigate("/admin/tests");
    }
  };

  const openSolutionModal = (q: SolutionQuestionItem) => {
    setSelectedSolutionQuestion(q);
    setIsSolutionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading candidate details report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased">
      {/* ── 1. Top Navbar (DoSelect / Learn Dark Header) ── */}
      <header className="h-14 bg-[#0f172a] border-b border-slate-800/90 px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-xs">
        {/* Left Side: Learn / Gryphon Logo + Breadcrumb Trail */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div
            onClick={() => navigate("/admin/home")}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <GryphonLogo variant="dark" size="sm" />
          </div>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          {/* Breadcrumb Trail: Learn > Test Name > All candidates > Candidate Name */}
          <div className="flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5 overflow-hidden">
            <button
              onClick={handleReturnToTest}
              className="hover:text-slate-200 cursor-pointer transition-colors max-w-[180px] truncate text-left"
              title={testTitle}
            >
              {testTitle}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <button
              onClick={handleReturnToCandidates}
              className="hover:text-slate-200 cursor-pointer transition-colors shrink-0"
            >
              All candidates
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-200 font-semibold max-w-[200px] truncate">
              {candidateName}
            </span>
          </div>
        </div>

        {/* Right Side: Invite Pins Widget + Profile Dropdown */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <AdminPinNavWidget />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800/70 transition-colors focus:outline-none cursor-pointer rounded-md">
                <Avatar className="w-7 h-7 border border-slate-700 bg-slate-800 text-slate-200">
                  <AvatarFallback className="bg-slate-700 text-white text-[11px] font-bold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex items-center">
                  <span className="text-xs font-medium text-slate-200">
                    {user?.name || "Admin User"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border border-slate-200 shadow-2xl p-1 text-xs"
            >
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-bold text-slate-900 leading-none">
                    {user?.name || "Admin User"}
                  </p>
                  <p className="text-xs text-slate-500 leading-none truncate mt-1">
                    {user?.email || "admin@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => navigate("/admin/settings")}
                className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                Profile Settings
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

      {/* ── 2. Dark Navy Hero Banner with Candidate Profile Backdrop ── */}
      <div className="bg-[#0B1028] text-white pt-6 md:pt-8 pb-16 md:pb-18 px-4 md:px-6 border-b border-slate-900 shadow-inner relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          {/* Back to Report Link above title (matching Create Question style) */}
          <button
            onClick={handleReturnToCandidates}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Report</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Avatar Silhouette + Name + Metadata */}
            <div className="flex items-center gap-3.5 md:gap-4">
            {/* Candidate Capital Initials Avatar (matching table style) */}
            <Avatar className="w-12 h-12 md:w-14 md:h-14 border border-slate-700 bg-slate-800 text-slate-100 shrink-0">
              <AvatarFallback className="bg-slate-800 text-white text-base md:text-lg font-extrabold tracking-wider">
                {candidateInitials}
              </AvatarFallback>
            </Avatar>

            {/* Name, Email, Report Subtitle */}
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {candidateName}
              </h1>

              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{candidateEmail}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">
                    Report for {testTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{submissionDateFormatted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ── 3. Main Workspace Container with Cards ── */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 -mt-10 md:-mt-12 pb-12 w-full relative z-20 space-y-3.5">
        {/* ── CARD 1: OVERALL CARD ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs p-4 sm:p-5">
          <div className="border-b border-slate-100 pb-2.5 mb-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Overall
            </h2>
          </div>

          {/* 2 Rows x 3 Columns Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-4 sm:gap-x-6">
            {/* Metric 1: Time Taken */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                  {timeTakenDisplay}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  time taken for completion
                </p>
              </div>
            </div>

            {/* Metric 2: Score (Based on Latest Score) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                  {scoreValue !== null ? (
                    <>
                      {scoreValue.toFixed(1)} / {maxScore}{" "}
                      <span className="text-sm md:text-base font-bold text-slate-700">
                        ({percentageValue}%)
                      </span>
                    </>
                  ) : (
                    `— / ${maxScore}`
                  )}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Based on Latest Score
                </p>
              </div>
            </div>

            {/* Metric 3: Score (Based on Best Score) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                  {scoreValue !== null ? `${scoreValue.toFixed(1)} / ${maxScore}` : `— / ${maxScore}`}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Based on Best Score
                </p>
              </div>
            </div>

            {/* Metric 4: Passed / Failed Status */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                {statusDisplay.isEvaluated ? (
                  statusDisplay.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <XCircle className="w-4 h-4 stroke-[2]" />
                  )
                ) : (
                  <Clock className="w-4 h-4 stroke-[2]" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">
                  {statusDisplay.label}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {statusDisplay.subtext}
                </p>
              </div>
            </div>

            {/* Metric 5: Problems Attempted */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                  {attemptedCount}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  problems attempted out of {totalQuestionsCount}
                </p>
              </div>
            </div>

            {/* Metric 6: Violations */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900">
                  {violationsDisplay.label}
                </p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {violationsDisplay.subtext}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: PERFORMANCE SUMMARY CARD ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs p-4 sm:p-5">
          <div className="border-b border-slate-100 pb-2.5 mb-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Performance summary
            </h2>
          </div>

          {/* 3 Columns Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* 1. Problem Unsolved */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <FileQuestion className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {unsolvedCount}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {unsolvedCount === 1 ? "problem unsolved" : "problems unsolved"}
                </p>
              </div>
            </div>

            {/* 2. Solutions Accepted */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {correctCount}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  solutions accepted
                </p>
              </div>
            </div>

            {/* 3. Solutions Rejected */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-none bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {incorrectCount}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  solutions rejected
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 3: SOLUTIONS SECTION (Section-wise Breakdown & View Solution Modal) ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              Solutions
            </h2>
          </div>

          {sectionGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No questions or sections found for this assessment.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* Table Column Headers */}
              <div className="grid grid-cols-12 px-6 py-3.5 bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <div className="col-span-5">Problem</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {/* Sections & Question Rows */}
              {sectionGroups.map((section, sIdx) => {
                const secPercentage = section.maxScore > 0 ? Math.round((section.earnedScore / section.maxScore) * 100) : 0;
                return (
                  <div key={section.name || sIdx}>
                    {/* Section Header Row */}
                    <div className="bg-[#F8F9FB] px-6 py-3 flex items-center justify-between border-t border-b border-slate-200 text-xs">
                      <span className="font-bold text-slate-700 tracking-tight">{section.name}</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {section.earnedScore} / {section.maxScore}{" "}
                        <span className="font-semibold text-slate-800">({secPercentage}%)</span>
                      </span>
                    </div>

                    {/* Question Rows in this Section */}
                    {section.questions.map((q) => (
                      <div
                        key={q.id}
                        className="grid grid-cols-12 px-6 py-4 items-center border-b border-slate-100 hover:bg-slate-50/40 transition-colors text-xs"
                      >
                        {/* Problem Title */}
                        <div className="col-span-5 pr-4">
                          <p className="font-bold text-slate-900 line-clamp-1">
                            {q.title}
                          </p>
                        </div>

                        {/* Type */}
                        <div className="col-span-2">
                          <span className="font-medium text-slate-600 uppercase text-[11px]">
                            {q.type === "CODING" ? "CODING" : "MCQ"}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="col-span-2">
                          {q.status === "ACCEPTED" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-600 border border-emerald-500 bg-white rounded-none">
                              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                              <span>ACCEPTED</span>
                            </span>
                          ) : q.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-rose-600 border border-rose-500 bg-white rounded-none">
                              <XCircle className="w-3 h-3 stroke-[2.5]" />
                              <span>REJECTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-400 border border-slate-300 bg-white rounded-none">
                              UNSOLVED
                            </span>
                          )}
                        </div>

                        {/* Score */}
                        <div className="col-span-1 text-center font-mono text-xs">
                          <strong className="text-slate-900 font-bold">{q.earnedScore}</strong>{" "}
                          <span className="text-slate-400 font-normal">/ {q.marks}</span>
                        </div>

                        {/* Action: VIEW SOLUTION button */}
                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            onClick={() => openSolutionModal(q)}
                            className="text-xs font-bold text-[#3949ab] hover:text-[#283593] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            VIEW SOLUTION
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CARD 4: PROCTORING ANALYSIS SECTION ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Proctoring analysis
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold font-mono tracking-tight bg-slate-100 border border-slate-200 text-slate-800 rounded-none">
                Trust Score: {proctoringAnalysis.trustScore}%
              </span>
            </div>
          </div>

          {/* Active Violation Metric Tiles Grid (Only shown if count > 0) */}
          <div className="p-6 border-b border-slate-100">
            {(() => {
              const activeTiles = [
                {
                  id: "tab-switch",
                  label: "Tab switches",
                  count: proctoringAnalysis.tabSwitchCount,
                  icon: Monitor,
                },
                {
                  id: "multi-face",
                  label: "Multiple faces",
                  count: proctoringAnalysis.multiFaceCount,
                  icon: Users,
                },
                {
                  id: "no-face",
                  label: "No face detected",
                  count: proctoringAnalysis.noFaceCount,
                  icon: UserX,
                },
                {
                  id: "look-away",
                  label: "Look away",
                  count: proctoringAnalysis.lookAwayCount,
                  icon: EyeOff,
                },
                {
                  id: "devtools",
                  label: "DevTools opened",
                  count: proctoringAnalysis.devtoolsCount,
                  icon: Terminal,
                },
                {
                  id: "copy-paste",
                  label: "Copy / Paste blocked",
                  count: proctoringAnalysis.copyPasteCount,
                  icon: Copy,
                },
                {
                  id: "speech",
                  label: "Speech / Audio detected",
                  count: proctoringAnalysis.speechCount,
                  icon: Mic,
                },
                {
                  id: "fullscreen",
                  label: "Fullscreen exits",
                  count: proctoringAnalysis.fullscreenCount,
                  icon: Maximize2,
                },
              ].filter((tile) => tile.count > 0);

              if (activeTiles.length === 0) {
                return (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-2.5">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      No proctoring violations recorded
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      The candidate maintained full test compliance throughout the session.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {activeTiles.map((tile) => {
                    const IconComponent = tile.icon;
                    return (
                      <div
                        key={tile.id}
                        className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-none flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-none bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <IconComponent className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                            {tile.count}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {tile.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Violation Events Log Breakdown */}
          {proctoringAnalysis.events.length > 0 ? (
            <div className="w-full">
              <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Recorded Violation Log</span>
                <span className="font-mono text-slate-500 text-[11px] font-normal">
                  {proctoringAnalysis.events.length} {proctoringAnalysis.events.length === 1 ? "event" : "events"}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {paginatedViolationEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-slate-50/50 transition-colors text-xs text-slate-700"
                  >
                    <div className="col-span-2 font-mono text-[11px] text-slate-500">
                      {evt.time}
                    </div>
                    <div className="col-span-3 font-bold text-slate-900">
                      {evt.displayType}
                    </div>
                    <div className="col-span-2">
                      {evt.severity === "HIGH" || evt.severity === "CRITICAL" ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider text-rose-700 bg-rose-50 border border-rose-200 rounded-none">
                          {evt.severity}
                        </span>
                      ) : evt.severity === "MEDIUM" ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-none">
                          MEDIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-none">
                          LOW
                        </span>
                      )}
                    </div>
                    <div className="col-span-5 text-slate-600 truncate">
                      {evt.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar Matching Library Design */}
              {totalViolationEvents > 0 && (
                <div className="bg-white border-t border-slate-200 p-2.5 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600">
                  {/* Page Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
                      PAGE:
                    </span>
                    <div className="relative flex items-center">
                      <select
                        value={safeViolationPage}
                        onChange={(e) => setViolationPage(Number(e.target.value))}
                        className="appearance-none bg-transparent pr-4 pl-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      >
                        {Array.from({ length: totalViolationPages }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    </div>
                  </div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
                      ROWS PER PAGE:
                    </span>
                    <div className="relative flex items-center">
                      <select
                        value={violationPageSize}
                        onChange={(e) => {
                          setViolationPageSize(Number(e.target.value));
                          setViolationPage(1);
                        }}
                        className="appearance-none bg-transparent pr-4 pl-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    </div>
                  </div>

                  {/* Record range badge */}
                  <span className="px-2 py-0.5 bg-slate-100 text-[11px] font-medium text-slate-600">
                    {startViolationRecord} - {endViolationRecord} OF {totalViolationEvents}
                  </span>

                  {/* Navigation Arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViolationPage((p) => Math.max(1, p - 1))}
                      disabled={safeViolationPage <= 1}
                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViolationPage((p) => Math.min(totalViolationPages, p + 1))}
                      disabled={safeViolationPage >= totalViolationPages}
                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-5 bg-slate-50/40 flex items-center gap-3 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>No proctoring violations recorded during this candidate's assessment session.</span>
            </div>
          )}
        </div>

        {/* ── CARD 4.1: CANDIDATE IDENTITY VERIFICATION IMAGE SECTION ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Candidate identity verification image
            </h2>
            <button
              type="button"
              onClick={() => setIsIdentityExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 border border-indigo-200 transition-colors cursor-pointer rounded-none"
            >
              <span>{isIdentityExpanded ? "Collapse" : "Expand"}</span>
              {isIdentityExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expanded Content */}
          {isIdentityExpanded && (
            <div className="p-6 border-t border-slate-100 flex flex-col items-center justify-center space-y-4">
              {identityPhoto ? (
                <>
                  <div className="w-full max-w-xl aspect-4/3 bg-slate-900 border border-slate-200 rounded-none overflow-hidden relative flex items-center justify-center shadow-xs">
                    <img
                      src={identityPhoto.url}
                      alt="Candidate Identity Verification"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const rawUrl = identityPhoto.url;
                        if (rawUrl && !e.currentTarget.src.includes("/snapshots/proxy")) {
                          e.currentTarget.src = `/api/admin/proctoring/snapshots/proxy?url=${encodeURIComponent(rawUrl)}`;
                        }
                      }}
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-mono tracking-wider">
                      Identity Verification Photo
                    </div>
                  </div>

                  {/* Timestamp info */}
                  <div className="w-full max-w-xl flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {identityPhoto.capturedAt
                        ? new Date(identityPhoto.capturedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })
                        : submissionDateFormatted}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">No initial identity verification photo captured for this candidate.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CARD 4.2: VIOLATION EVIDENCE SNAPSHOTS SECTION ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-slate-700">
                Violation evidence snapshots
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {violationSnapshots.length} {violationSnapshots.length === 1 ? "snapshot" : "snapshots"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsViolationsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 border border-indigo-200 transition-colors cursor-pointer rounded-none"
            >
              <span>{isViolationsExpanded ? "Collapse" : "Expand"}</span>
              {isViolationsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expanded Content */}
          {isViolationsExpanded && (
            <div className="p-6 border-t border-slate-100 flex flex-col items-center justify-center space-y-4">
              {violationSnapshots.length > 0 ? (
                <>
                  {/* Snapshot Image Display */}
                  <div className="w-full max-w-xl aspect-4/3 bg-slate-900 border border-slate-200 rounded-none overflow-hidden relative flex items-center justify-center shadow-xs">
                    <img
                      src={violationSnapshots[currentViolationSnapshotIndex]?.url}
                      alt={`Violation Snapshot ${currentViolationSnapshotIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const rawUrl = violationSnapshots[currentViolationSnapshotIndex]?.url;
                        if (rawUrl && !e.currentTarget.src.includes("/snapshots/proxy")) {
                          e.currentTarget.src = `/api/admin/proctoring/snapshots/proxy?url=${encodeURIComponent(rawUrl)}`;
                        }
                      }}
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-rose-900/90 text-white text-[10px] font-mono tracking-wider">
                      Violation Frame {currentViolationSnapshotIndex + 1} / {violationSnapshots.length}
                    </div>
                  </div>

                  {/* Frame Timestamp info */}
                  <div className="w-full max-w-xl flex items-center justify-between text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {violationSnapshots[currentViolationSnapshotIndex]?.capturedAt
                          ? new Date(violationSnapshots[currentViolationSnapshotIndex].capturedAt!).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })
                          : submissionDateFormatted}
                      </span>
                    </div>
                    {violationSnapshots[currentViolationSnapshotIndex]?.eventType && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                        {violationSnapshots[currentViolationSnapshotIndex].eventType}
                      </span>
                    )}
                  </div>

                  {/* Progress bar line */}
                  <div className="w-full max-w-xl bg-slate-100 h-1 rounded-none overflow-hidden">
                    <div
                      className="bg-rose-600 h-full transition-all duration-200"
                      style={{
                        width: `${((currentViolationSnapshotIndex + 1) / violationSnapshots.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Controls Bar Centered with Speed Dropdown */}
                  <div className="w-full max-w-xl relative flex items-center justify-center pt-1">
                    <div className="flex items-center justify-center gap-2.5 sm:gap-3 text-slate-700">
                      {/* Jump Back 5 Frames */}
                      <button
                        type="button"
                        onClick={handleJumpBackwardViolation}
                        disabled={currentViolationSnapshotIndex === 0}
                        className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        title="Rewind 5 frames"
                      >
                        <Rewind className="w-4 h-4 fill-current" />
                      </button>

                      {/* Previous Frame */}
                      <button
                        type="button"
                        onClick={handlePrevViolationSnapshot}
                        disabled={currentViolationSnapshotIndex === 0}
                        className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        title="Previous frame"
                      >
                        <SkipBack className="w-4 h-4 fill-current" />
                      </button>

                      {/* Play / Pause Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (currentViolationSnapshotIndex >= violationSnapshots.length - 1) {
                            setCurrentViolationSnapshotIndex(0);
                          }
                          setIsViolationPlaying(!isViolationPlaying);
                        }}
                        className="p-2 bg-[#0B1028] text-white hover:bg-slate-800 transition-colors cursor-pointer rounded-none shadow-xs"
                        title={isViolationPlaying ? "Pause" : "Play"}
                      >
                        {isViolationPlaying ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>

                      {/* Next Frame */}
                      <button
                        type="button"
                        onClick={handleNextViolationSnapshot}
                        disabled={currentViolationSnapshotIndex >= violationSnapshots.length - 1}
                        className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        title="Next frame"
                      >
                        <SkipForward className="w-4 h-4 fill-current" />
                      </button>

                      {/* Jump Forward 5 Frames */}
                      <button
                        type="button"
                        onClick={handleJumpForwardViolation}
                        disabled={currentViolationSnapshotIndex >= violationSnapshots.length - 1}
                        className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        title="Fast-forward 5 frames"
                      >
                        <FastForward className="w-4 h-4 fill-current" />
                      </button>

                      {/* Restart Timeline */}
                      <button
                        type="button"
                        onClick={handleRestartViolationTimeline}
                        className="p-1.5 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Restart timeline"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Snapshot count display */}
                      <span className="text-xs font-mono text-slate-700 font-semibold ml-1.5">
                        ({currentViolationSnapshotIndex + 1} / {violationSnapshots.length})
                      </span>
                    </div>

                    {/* Absolute Right: Playback Speed Dropdown Menu */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-mono text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer rounded-none bg-white"
                            title="Select playback speed"
                          >
                            <span>{violationPlaybackSpeed}X</span>
                            <ChevronDown className="w-3 h-3 text-slate-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-24 bg-white border border-slate-200 shadow-lg p-1 text-xs rounded-none">
                          {[0.5, 1, 1.5, 2, 4].map((spd) => (
                            <DropdownMenuItem
                              key={spd}
                              onClick={() => setViolationPlaybackSpeed(spd)}
                              className={`cursor-pointer px-2.5 py-1.5 text-xs font-mono flex items-center justify-between ${violationPlaybackSpeed === spd ? "bg-slate-100 font-bold text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                              <span>{spd}X</span>
                              {violationPlaybackSpeed === spd && <Check className="w-3 h-3 text-slate-900 stroke-[2.5]" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">No violation evidence snapshots recorded for this session.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CARD 5: WEBCAM PROCTORING TIMELINE SECTION ── */}
        <div className="bg-white rounded-none border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Webcam proctoring timeline
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {timelineSnapshots.length} {timelineSnapshots.length === 1 ? "snapshot" : "snapshots"}
            </span>
          </div>

          <div className="p-6 flex flex-col items-center justify-center space-y-4">
            {timelineSnapshots.length > 0 ? (
              <>
                {/* Snapshot Image Display */}
                <div className="w-full max-w-xl aspect-4/3 bg-slate-900 border border-slate-200 rounded-none overflow-hidden relative flex items-center justify-center shadow-xs">
                  <img
                    src={timelineSnapshots[currentSnapshotIndex]?.url}
                    alt={`Proctoring Snapshot ${currentSnapshotIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const rawUrl = timelineSnapshots[currentSnapshotIndex]?.url;
                      if (rawUrl && !e.currentTarget.src.includes("/snapshots/proxy")) {
                        e.currentTarget.src = `/api/admin/proctoring/snapshots/proxy?url=${encodeURIComponent(rawUrl)}`;
                      }
                    }}
                  />
                  {/* Overlay Frame Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-mono tracking-wider">
                    Frame {currentSnapshotIndex + 1} / {timelineSnapshots.length}
                  </div>
                </div>

                {/* Frame Timestamp info */}
                <div className="w-full max-w-xl flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {timelineSnapshots[currentSnapshotIndex]?.capturedAt
                      ? new Date(timelineSnapshots[currentSnapshotIndex].capturedAt!).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })
                      : submissionDateFormatted}
                  </span>
                </div>

                {/* Progress bar line */}
                <div className="w-full max-w-xl bg-slate-100 h-1 rounded-none overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-200"
                    style={{
                      width: `${((currentSnapshotIndex + 1) / timelineSnapshots.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Controls Bar Centered with Speed Dropdown */}
                <div className="w-full max-w-xl relative flex items-center justify-center pt-1">
                  {/* Centered Playback Buttons & Frame Steppers */}
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3 text-slate-700">
                    {/* Jump Back 5 Frames */}
                    <button
                      type="button"
                      onClick={handleJumpBackward}
                      disabled={currentSnapshotIndex === 0}
                      className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Rewind 5 frames"
                    >
                      <Rewind className="w-4 h-4 fill-current" />
                    </button>

                    {/* Previous Frame */}
                    <button
                      type="button"
                      onClick={handlePrevSnapshot}
                      disabled={currentSnapshotIndex === 0}
                      className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Previous frame"
                    >
                      <SkipBack className="w-4 h-4 fill-current" />
                    </button>

                    {/* Play / Pause Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (currentSnapshotIndex >= timelineSnapshots.length - 1) {
                          setCurrentSnapshotIndex(0);
                        }
                        setIsPlaying(!isPlaying);
                      }}
                      className="p-2 bg-[#0B1028] text-white hover:bg-slate-800 transition-colors cursor-pointer rounded-none shadow-xs"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>

                    {/* Next Frame */}
                    <button
                      type="button"
                      onClick={handleNextSnapshot}
                      disabled={currentSnapshotIndex >= timelineSnapshots.length - 1}
                      className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Next frame"
                    >
                      <SkipForward className="w-4 h-4 fill-current" />
                    </button>

                    {/* Jump Forward 5 Frames */}
                    <button
                      type="button"
                      onClick={handleJumpForward}
                      disabled={currentSnapshotIndex >= timelineSnapshots.length - 1}
                      className="p-1.5 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                      title="Fast-forward 5 frames"
                    >
                      <FastForward className="w-4 h-4 fill-current" />
                    </button>

                    {/* Restart Timeline */}
                    <button
                      type="button"
                      onClick={handleRestartTimeline}
                      className="p-1.5 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Restart timeline"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Snapshot count display: ( 1 / 1000 ) */}
                    <span className="text-xs font-mono text-slate-700 font-semibold ml-1.5">
                      ({currentSnapshotIndex + 1} / {timelineSnapshots.length})
                    </span>
                  </div>

                  {/* Absolute Right: Playback Speed Dropdown Menu */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-mono text-slate-700 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer rounded-none bg-white"
                          title="Select playback speed"
                        >
                          <span>{playbackSpeed}X</span>
                          <ChevronDown className="w-3 h-3 text-slate-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-24 bg-white border border-slate-200 shadow-lg p-1 text-xs rounded-none">
                        {[0.5, 1, 1.5, 2, 4].map((spd) => (
                          <DropdownMenuItem
                            key={spd}
                            onClick={() => setPlaybackSpeed(spd)}
                            className={`cursor-pointer px-2.5 py-1.5 text-xs font-mono flex items-center justify-between ${playbackSpeed === spd ? "bg-slate-100 font-bold text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
                          >
                            <span>{spd}X</span>
                            {playbackSpeed === spd && <Check className="w-3 h-3 text-slate-900 stroke-[2.5]" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Camera className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No periodic webcam audit snapshots recorded for this session.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── 4. VIEW SOLUTION MODAL (MCQ & Coding Support) ── */}
      <Dialog open={isSolutionModalOpen} onOpenChange={setIsSolutionModalOpen}>
        <DialogContent hideDefaultClose className="max-w-3xl max-h-[85vh] flex flex-col bg-white border border-slate-200 shadow-2xl p-0 overflow-hidden rounded-none">
          {selectedSolutionQuestion && (
            <>
              {/* Modal Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-slate-200 text-slate-700 rounded-none">
                      {selectedSolutionQuestion.type}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Section: {selectedSolutionQuestion.sectionName}
                    </span>
                  </div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {selectedSolutionQuestion.title}
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {selectedSolutionQuestion.status === "ACCEPTED" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold tracking-wider text-emerald-700 border border-emerald-500 bg-emerald-50 rounded-none">
                      <Check className="w-3 h-3 stroke-[2.8]" />
                      <span>ACCEPTED</span>
                    </span>
                  ) : selectedSolutionQuestion.status === "REJECTED" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold tracking-wider text-rose-700 border border-rose-500 bg-rose-50 rounded-none">
                      <X className="w-3 h-3 stroke-[2.8]" />
                      <span>REJECTED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold tracking-wider text-slate-600 border border-slate-300 bg-slate-100 rounded-none">
                      UNSOLVED
                    </span>
                  )}

                  <span className="px-2.5 py-0.5 bg-slate-900 text-white text-xs font-bold font-mono rounded-none">
                    Score: {selectedSolutionQuestion.earnedScore} / {selectedSolutionQuestion.marks}
                  </span>

                  {/* Modal Close Cross Button */}
                  <button
                    type="button"
                    onClick={() => setIsSolutionModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-none transition-colors cursor-pointer ml-1"
                    title="Close"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
                {/* 1. Problem Statement */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Problem Statement
                  </h4>
                  <div
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-none text-slate-800 leading-relaxed text-xs sm:text-sm prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: renderFormattedContent(selectedSolutionQuestion.prompt || "No prompt available."),
                    }}
                  />
                </div>

                {/* 2. If MCQ: Display options with Selected & Correct / Incorrect Highlight */}
                {selectedSolutionQuestion.type === "MCQ" && (
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Options & Candidate Answer
                    </h4>

                    {(!selectedSolutionQuestion.options || selectedSolutionQuestion.options.length === 0) ? (
                      <p className="text-slate-400 italic">No option choices available for this problem.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedSolutionQuestion.options.map((opt, oIdx) => {
                          const isCandidateChosen =
                            selectedSolutionQuestion.candidateSelectedOption !== null &&
                            selectedSolutionQuestion.candidateSelectedOption !== undefined &&
                            (selectedSolutionQuestion.candidateSelectedOption === oIdx ||
                              selectedSolutionQuestion.candidateSelectedOption === opt.id ||
                              selectedSolutionQuestion.candidateSelectedOption === opt.text);

                          const isOptionCorrect = Boolean(opt.isCorrect);

                          let borderClass = "border-slate-200 bg-white";
                          let badgeEl: React.ReactNode = null;

                          if (isCandidateChosen && isOptionCorrect) {
                            borderClass = "border-emerald-500 bg-emerald-50/50 shadow-2xs";
                            badgeEl = (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[2.8]" />
                                Selected & Correct
                              </span>
                            );
                          } else if (isCandidateChosen && !isOptionCorrect) {
                            borderClass = "border-rose-500 bg-rose-50/50 shadow-2xs";
                            badgeEl = (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200">
                                <X className="w-3 h-3 stroke-[2.8]" />
                                Selected & Incorrect
                              </span>
                            );
                          } else if (isOptionCorrect) {
                            borderClass = "border-emerald-500/70 bg-emerald-50/30";
                            badgeEl = (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[2.8]" />
                                Correct Answer
                              </span>
                            );
                          }

                          return (
                            <div
                              key={opt.id || oIdx}
                              className={`p-2.5 border rounded-none flex items-center justify-between gap-3 transition-all ${borderClass}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-none bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span
                                  className="text-slate-800 font-medium text-xs sm:text-sm leading-snug"
                                  dangerouslySetInnerHTML={{
                                    __html: renderFormattedContent(opt.text || ""),
                                  }}
                                />
                              </div>

                              {badgeEl && <div className="shrink-0">{badgeEl}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. If Coding: Display Candidate Code & Test Cases */}
                {selectedSolutionQuestion.type === "CODING" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Submitted Code ({selectedSolutionQuestion.language || "python3"})
                      </h4>
                      {selectedSolutionQuestion.submittedCode && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedSolutionQuestion.submittedCode || "");
                            toast.success("Code copied to clipboard!");
                          }}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </button>
                      )}
                    </div>

                    {selectedSolutionQuestion.submittedCode ? (
                      <div className="border border-slate-200 rounded-none overflow-hidden">
                        <Editor
                          height="240px"
                          language={mapLanguageToMonaco(selectedSolutionQuestion.language)}
                          value={selectedSolutionQuestion.submittedCode}
                          theme="vs-light"
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 13,
                            lineNumbers: "on",
                            domReadOnly: true,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-none text-center text-slate-400 italic">
                        No code was submitted by candidate for this problem.
                      </div>
                    )}

                    {/* Test Cases Results */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Test Cases Evaluation
                        </h4>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {selectedSolutionQuestion.testCasesPassed || 0} / {selectedSolutionQuestion.testCasesTotal || 0} Passed
                        </span>
                      </div>

                      {selectedSolutionQuestion.testCases && selectedSolutionQuestion.testCases.length > 0 ? (
                        <div className="space-y-2">
                          {selectedSolutionQuestion.testCases.map((tc, tcIdx) => (
                            <div
                              key={tcIdx}
                              className="p-2.5 bg-slate-50 border border-slate-200 rounded-none space-y-1 font-mono text-[11px]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700">
                                  Test Case #{tcIdx + 1} {tc.sample ? "(Sample)" : ""}
                                </span>
                                {selectedSolutionQuestion.status === "ACCEPTED" ? (
                                  <span className="text-emerald-700 font-bold">Passed</span>
                                ) : (
                                  <span className="text-slate-600 font-medium">Checked</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-0.5">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Input:</span>
                                  <pre className="bg-white p-1 border border-slate-200 rounded-none mt-0.5 whitespace-pre-wrap">{tc.input || "—"}</pre>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Expected Output:</span>
                                  <pre className="bg-white p-1 border border-slate-200 rounded-none mt-0.5 whitespace-pre-wrap">{tc.expectedOutput || "—"}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-none text-slate-500 text-xs">
                          Overall Status: <strong className="text-slate-900">{selectedSolutionQuestion.executionStatus || "Evaluated"}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

