import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, ChevronLeft, ChevronRight, Flag, Send,
  AlertTriangle, CheckCircle, Play, Terminal, XCircle,
  Loader2, Save, FileText, Code2, Database, Lightbulb, Monitor,
  Wifi, WifiOff
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Editor from "@monaco-editor/react";
import { apiClient } from "@/lib/api-client";
import { testService, CodeTemplateEntry, TestCaseResult } from "@/lib/test-service";
import { LANGUAGE_MAP, type LanguageKey, resolveStarterCode, getAvailableLanguages } from "@/lib/exam/languageMap";
import { formatTime } from "@/lib/exam/formatTime";
import { isTerminalStatus, mapTestCaseResults, buildSubmitOutputMessage, buildRunOutputMessage } from "@/lib/exam/codeExecution";
import { isDevToolsKey, isClipboardShortcut, isPrintScreen } from "@/lib/proctoring/keyboardSecurity";
import { countTabSwitches, shouldAutoSubmitOnTabSwitch } from "@/lib/proctoring/violationLogic";
import { computeFullscreenPolicy, tickFullscreenTimer, resetFullscreenTimer, FULLSCREEN_GRACE_PERIOD } from "@/lib/proctoring/fullscreenLogic";
import { ProctoringProvider, useProctoring, ProctoringConfigDto } from "@/proctoring/ProctoringProvider";
import { CameraPreview } from "@/proctoring/components/CameraPreview";
import { ViolationToast } from "@/proctoring/components/ViolationToast";
import { EnvironmentCheck } from "@/proctoring/components/EnvironmentCheck";
import { Shield, ShieldAlert, ShieldCheck as ShieldCheckIcon } from "lucide-react";
import { AnswerStore } from "@/lib/exam/answerStorage";

// Types
interface Question {
  id: string;
  type: "MCQ" | "CODING";
  prompt: string;
  marks: number;
  options?: unknown[];
  problemStatement?: string;
  sampleInput?: string;
  sampleOutput?: string;
  sampleExplanation?: string;
  codeTemplate?: Record<string, CodeTemplateEntry>;
  difficulty?: string;
  constraints?: string;
  timeLimitSecs?: number;
  memoryLimitMb?: number;
  hints?: string[];
  tags?: string[];
  title?: string;
}

interface RawPaperQuestion {
  snapshotQuestionId?: string;
  sourceQuestionId: string;
  orderIndex: number;
  marks: number;
  type: "MCQ" | "CODING";
  prompt: string;
  options?: unknown[];
  coding?: {
    timeLimitSecs?: number;
    memoryLimitMB?: number;
    starterCode?: Record<string, CodeTemplateEntry>;
    difficulty?: string;
    constraints?: string;
    hints?: string[];
    tags?: string[];
    title?: string;
    examples?: Array<{ input: string; expectedOutput: string; explanation?: string }>;
  };
}

interface RawTestPaper {
  testId: string;
  title: string;
  description?: string;
  durationMins: number;
  difficulty?: string;
  passMark?: number;
  questions?: RawPaperQuestion[];
}

interface RawTestPaperResponse {
  paper?: RawTestPaper;
}

interface TestSession {
  id: string;
  testId: string;
  candidateId: string;
  status: "ACTIVE" | "SUBMITTED" | "EXPIRED";
  startedAt: string;
  endedAt?: string;
  remainingTimeSecs: number;
  answers?: Record<string, unknown>;
}

interface TestDetails {
  id: string;
  title: string;
  description?: string;
  durationMins: number;
  difficulty: string;
  passMark: number;
  questions?: TestQuestion[];
}

interface TestQuestion {
  id: string;
  testId: string;
  questionId: string;
  orderIndex: number;
  marks: number;
  timeLimitSecs?: number;
  question?: {
    id: string;
    type?: "MCQ" | "CODING";
    questionType?: "MCQ" | "CODING";
    prompt: string;
    marks: number;
    mcqOptions?: { text: string; isCorrect: boolean }[];
    sampleInput?: string;
    sampleOutput?: string;
    sampleExplanation?: string;
    codeTemplate?: Record<string, CodeTemplateEntry>;
    difficulty?: "EASY" | "MEDIUM" | "HARD" | string;
    constraints?: string;
    timeLimitSecs?: number;
    memoryLimitMb?: number;
    hints?: string[];
    tags?: string[];
    title?: string;
  };
}


export default function TestInterface() {
  const { testId, sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checked, setChecked] = useState(() => {
    if (sessionId) {
      return sessionStorage.getItem(`env_checked_${sessionId}`) === "true";
    }
    return false;
  });
  const [config, setConfig] = useState<ProctoringConfigDto | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    apiClient.get(`/test-sessions/${sessionId}/proctoring-config`)
      .then(res => {
        const data = res.data?.data || res.data;
        setConfig(data);
      })
      .catch(err => {
        console.error("Failed to load proctoring config, using safe defaults", err);
        setConfig({
          camera: false,
          audio: false,
          tabSwitch: true,
          devtools: false,
          screenShare: false,
          objectDetection: false,
          llmDetector: false,
          maxTabSwitches: 2,
          snapshotIntervalSecs: 60,
          violationThresholds: { look_away: 3, multi_face: 2 }
        });
      });
  }, [sessionId]);

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProctoringProvider sessionId={sessionId || "demo-session"} config={config}>
      {!checked ? (
        <EnvironmentCheck onComplete={() => setChecked(true)} />
      ) : (
        <TestInterfaceContent testId={testId} sessionId={sessionId} navigate={navigate} toast={toast} />
      )}
    </ProctoringProvider>
  );
}

function TestInterfaceContent({ testId, sessionId, navigate, toast }: { testId?: string; sessionId?: string; navigate: (path: string) => void; toast: (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => void }) {
  const { violations, trustScore, isProctoringActive, startProctoring, syncViolations } = useProctoring();
  const lastWarnedCountRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<TestDetails | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Code editor state
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<LanguageKey>("python3");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [output, setOutput] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<Record<string, unknown>[]>([]);
  const [submissionPhase, setSubmissionPhase] = useState<"idle" | "running" | "result">("idle");

  // Fullscreen enforcement
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [fullscreenTimer, setFullscreenTimer] = useState(10);

  // Connection and caching state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);


  const enterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(err => {
      console.error("Fullscreen error:", err);
    });
  };



  // Session validation
  useEffect(() => {
    if (!sessionId) {
      toast({
        title: "Access Denied",
        description: "Direct test access is no longer permitted. Please use your secure invitation link.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [sessionId, navigate, toast]);

  const fetchTestSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🚀 STEP 1: Fetching session for ID:", sessionId);
      const sessionResponse = await apiClient.get(`/test-sessions/${sessionId}`);
      const sessionData = sessionResponse.data?.data || sessionResponse.data;
      console.log("✅ STEP 2: Session Data:", sessionData);
      setSession(sessionData);

      console.log("🚀 STEP 3: Fetching paper for session:", sessionId);
      if (!sessionId) throw new Error("No session ID provided");
      
      const testData = await testService.getTestPaper(sessionId);
      console.log("✅ STEP 4: Paper Data:", testData);
      console.log("✅ DIAGNOSTIC - testData keys:", Object.keys(testData || {}));
      console.log("✅ DIAGNOSTIC - testData stringified:", JSON.stringify(testData));
      
      const paperResponse = testData as unknown as RawTestPaperResponse;
      if (paperResponse && paperResponse.paper) {
        const paper = paperResponse.paper;
        
        // Map the snapshot questions back to the format TestInterface expects
        const mappedQuestions = (paper.questions || []).map((q: RawPaperQuestion) => {
          return {
            id: q.snapshotQuestionId || q.sourceQuestionId,
            testId: paper.testId,
            questionId: q.sourceQuestionId,
            orderIndex: q.orderIndex,
            marks: q.marks,
            timeLimitSecs: q.coding?.timeLimitSecs,
            question: {
              id: q.sourceQuestionId,
              type: q.type,
              questionType: q.type,
              prompt: q.prompt,
              marks: q.marks,
              mcqOptions: q.options as { text: string; isCorrect: boolean }[] || [],
              sampleInput: q.coding?.examples?.[0]?.input || "",
              sampleOutput: q.coding?.examples?.[0]?.expectedOutput || "",
              sampleExplanation: q.coding?.examples?.[0]?.explanation || "",
              codeTemplate: q.coding?.starterCode,
              difficulty: q.coding?.difficulty,
              constraints: q.coding?.constraints,
              timeLimitSecs: q.coding?.timeLimitSecs,
              memoryLimitMb: q.coding?.memoryLimitMB,
              hints: q.coding?.hints,
              tags: q.coding?.tags,
              title: q.coding?.title || q.prompt,
            }
          };
        });

        const mappedTestDetails: TestDetails = {
          id: paper.testId,
          title: paper.title,
          description: paper.description,
          durationMins: paper.durationMins,
          difficulty: paper.difficulty || "MEDIUM",
          passMark: paper.passMark || 40,
          questions: mappedQuestions
        };

        setTest(mappedTestDetails);
      } else {
        setTest(testData as unknown as TestDetails);
      }
      
      // Auto-start proctoring as checks were done in gateway
      startProctoring();

      if (sessionId) {
        const cachedAnswers = AnswerStore.getAnswers(sessionId);
        setAnswers(prev => ({ ...prev, ...cachedAnswers }));
        setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
      }
      
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("❌ FATAL: Failed to fetch test session:", err);
      setError(err.response?.data?.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchTestSession();
    }
  }, [sessionId, fetchTestSession]);

  // Process questions when test data is loaded
// Update this useEffect in TestInterface.tsx
useEffect(() => {
  if (test && test.questions && test.questions.length > 0) {
    console.log("🔍 Processing test data:", test);
    console.log("🔍 Test.questions:", test?.questions);
    
    const qs = test.questions
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(tq => {
        // Log the question data to debug
        console.log("🔍 Mapping test question - raw tq:", tq);
        console.log("🔍 tq.question:", tq.question);
        console.log("🔍 tq.question?.codeTemplate:", tq.question?.codeTemplate);
        
        // Check if codeTemplate exists and has content
        const hasCodeTemplate = tq.question?.codeTemplate && 
          Object.keys(tq.question.codeTemplate).length > 0;
        
        console.log("🔍 Has code template?", hasCodeTemplate);
        
        return {
          id: tq.questionId,
          type: tq.question?.questionType || tq.question?.type || "MCQ",
          prompt: tq.question?.prompt || "No prompt",
          marks: tq.marks,
          options: tq.question?.mcqOptions || [],
          problemStatement: tq.question?.prompt,
          sampleInput: tq.question?.sampleInput,
          sampleOutput: tq.question?.sampleOutput,
          sampleExplanation: tq.question?.sampleExplanation,
          codeTemplate: tq.question?.codeTemplate,
          difficulty: tq.question?.difficulty,
          constraints: tq.question?.constraints,
          timeLimitSecs: tq.question?.timeLimitSecs || tq.timeLimitSecs,
          memoryLimitMb: tq.question?.memoryLimitMb,
          hints: tq.question?.hints,
          tags: tq.question?.tags,
          title: tq.question?.title,
        };
      });
    
    console.log("🔍 Processed questions:", qs);
    console.log("🔍 First question codeTemplate:", qs[0]?.codeTemplate);
    setQuestions(qs);
  }
}, [test]);

// Initialize code editor when question changes
// Update the code editor initialization
useEffect(() => {
  const currentQ = questions[currentIndex];
  if (currentQ?.type === "CODING" && currentQ.codeTemplate && sessionId) {
    console.log("🎯 Initializing code editor for language:", language);
    
    // 1. Check if there is an answer already set in local state (which holds the submitted code)
    const submitted = answers[currentQ.id] as { code?: string; language?: string } | undefined;
    if (submitted && typeof submitted === "object" && submitted.language === language && submitted.code) {
      console.log("🎯 Setting code from submitted answer for", language);
      setCode(submitted.code);
      return;
    }
    
    // 2. Check if there is a draft in local storage
    const draft = AnswerStore.getDraft(sessionId, currentQ.id, language);
    if (draft !== null) {
      console.log("🎯 Setting code from draft for", language);
      setCode(draft);
      return;
    }

    // 3. Fallback to starter template
    const template = currentQ.codeTemplate[language];
    if (template?.code) {
      console.log("🎯 Setting code from template for", language);
      setCode(template.code);
    } else {
      // Try to get first available language
      const firstLang = Object.keys(currentQ.codeTemplate)[0];
      if (firstLang && currentQ.codeTemplate[firstLang]?.code) {
        console.log("🎯 Falling back to first available language:", firstLang);
        setLanguage(firstLang as LanguageKey);
        
        // Also check if fallback language has a draft
        const fallbackDraft = AnswerStore.getDraft(sessionId, currentQ.id, firstLang);
        if (fallbackDraft !== null) {
          setCode(fallbackDraft);
        } else {
          setCode(currentQ.codeTemplate[firstLang].code);
        }
      }
    }
  }
}, [currentIndex, questions, language, answers, sessionId]);

// Save code draft on change
useEffect(() => {
  if (questions.length === 0 || !sessionId) return;
  const currentQ = questions[currentIndex];
  if (currentQ?.type === "CODING" && code) {
    AnswerStore.saveDraft(sessionId, currentQ.id, language, code);
  }
}, [code, currentIndex, questions, language, sessionId]);

  // Set time left from session or test
  useEffect(() => {
    if (session && session.remainingTimeSecs > 0) {
      setTimeLeft(session.remainingTimeSecs);
    } else if (test?.durationMins) {
      setTimeLeft(test.durationMins * 60);
    }
  }, [session, test]);

  // Timer effect


  const submitTest = useCallback(async () => {
    if (!sessionId) {
      navigate(`/test/${testId}/results`);
      return;
    }
    
    setSubmitting(true);

    if (!navigator.onLine) {
      toast({
        title: "Submission Blocked",
        description: "You are offline. Please reconnect to the internet to submit your test.",
        variant: "destructive"
      });
      setSubmitting(false);
      setShowSubmitDialog(false);
      return;
    }

    const pendingQueue = AnswerStore.getOfflineQueue(sessionId);
    if (pendingQueue.length > 0) {
      toast({
        title: "Syncing Pending Answers",
        description: "We are uploading your remaining answers first. Please wait...",
      });
      try {
        const syncSuccess = await AnswerStore.syncOfflineQueue(sessionId);
        setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
        if (!syncSuccess) {
          toast({
            title: "Sync Failed",
            description: "Some answers failed to upload. Please try again.",
            variant: "destructive"
          });
          setSubmitting(false);
          return;
        }
      } catch (err) {
        toast({
          title: "Sync Error",
          description: "An error occurred while uploading answers.",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }
    }

    try {
      // Gracefully sync proctoring violations to backend before submission
      try {
        await syncViolations();
      } catch (syncErr) {
        console.warn("Failed to sync proctoring violations (endpoint might not be deployed yet):", syncErr);
      }

      // Use the new dedicated submit endpoint
      await testService.submitSession(sessionId, answers);

      // Clear local storage session cache
      AnswerStore.clearSession(sessionId);

      toast({ title: "Success", description: "Test submitted successfully, your responses have been recorded" });
      navigate(`/test/${testId}/results?session=${sessionId}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Failed to submit test:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to submit test",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  }, [sessionId, answers, testId, navigate, toast, syncViolations]);

  const handleAutoSubmit = useCallback(async () => {
    toast({
      title: "Time's Up!",
      description: "Your test has been automatically submitted.",
    });
    await submitTest();
  }, [toast, submitTest]);

  // Fullscreen enforcement effects
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProctoringActive && !isFullscreen) {
      if (fullscreenTimer === 10) {
        toast({
          title: "Fullscreen Required",
          description: "Please return to fullscreen mode immediately.",
          variant: "destructive"
        });
      }
      timer = setInterval(() => {
        setFullscreenTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit(); // Auto-submit if timer hits 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFullscreenTimer(10);
    }
    return () => clearInterval(timer);
  }, [isProctoringActive, isFullscreen, toast, handleAutoSubmit, fullscreenTimer]);

  // Feature 1: Clipboard & Keyboard Interception
  useEffect(() => {
    if (!isProctoringActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // DevTools keys
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.metaKey && e.altKey && (e.key === "I" || e.key === "i"))
      ) {
        e.preventDefault();
        toast({
          title: "Blocked Action",
          description: "Developer tools access is restricted during the test.",
          variant: "destructive"
        });
        return;
      }

      // Copy/Paste/Cut shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V" || e.key === "x" || e.key === "X")) {
        e.preventDefault();
        toast({
          title: "Blocked Shortcut",
          description: "Copying and pasting are disabled during the test.",
          variant: "destructive"
        });
        return;
      }

      // Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        navigator.clipboard.writeText("").catch(() => {});
        toast({
          title: "Screenshot Detected",
          description: "Screenshots are blocked and your clipboard has been cleared.",
          variant: "destructive"
        });
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: "Copy Blocked",
        description: "Exfiltrating test contents is not permitted.",
        variant: "destructive"
      });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: "Paste Blocked",
        description: "Pasting text into the editor is disabled.",
        variant: "destructive"
      });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isProctoringActive, toast]);

  // Network Status Monitoring & Auto-syncing
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You are back online. Syncing local answers...",
      });
      if (sessionId) {
        AnswerStore.syncOfflineQueue(sessionId, (qId, success, result) => {
          if (success) {
            if (result) {
              setAnswers(prev => ({ ...prev, [qId]: result }));
            }
            setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "You are offline. Your submissions will be cached locally.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (sessionId) {
      setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sessionId, toast]);

  // Feature 2: Hard "3-Strikes" Tab Switch Policy
  useEffect(() => {
    if (!isProctoringActive) return;

    const tabSwitches = violations.filter(v => v.type === "TAB_SWITCH" || v.type === "EXTENDED_TAB_SWITCH");
    const count = tabSwitches.length;

    if (count > lastWarnedCountRef.current) {
      lastWarnedCountRef.current = count;
      if (count >= 3) {
        toast({
          title: "Test Auto-Submitted",
          description: "You have exceeded the maximum of 3 allowed tab switches.",
          variant: "destructive"
        });
        submitTest();
      } else {
        toast({
          title: "Security Violation",
          description: `Warning: Tab switch detected (${count}/3). Reaching 3 switches will auto-submit your test.`,
          variant: "destructive"
        });
      }
    }
  }, [violations, isProctoringActive, submitTest, toast]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0 || !sessionId) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, sessionId, handleAutoSubmit]);

  const handleRunCode = useCallback(async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    if (!currentQ || currentQ.type !== "CODING") return;

    setIsRunning(true);
    setSubmissionPhase("running");
    setOutput(null);
    setTestCaseResults([]);

    try {
      const resultsArray = await testService.executeCode({
        sessionId: sessionId || "00000000-0000-0000-0000-000000000000",
        questionId: currentQ.id,
        language: LANGUAGE_MAP[language]?.slug || "python3",
        sourceCode: code,
      });
      
      const mappedTestCases = resultsArray.map((tc: TestCaseResult) => ({
        passed: tc.status === "ACCEPTED",
        ...tc
      }));

      setTestCaseResults(mappedTestCases);
      const passedCount = mappedTestCases.filter((tc: { passed: boolean }) => tc.passed).length;
      
      if (mappedTestCases.length > 0) {
        if (passedCount === mappedTestCases.length) {
          setOutput({ type: 'success', message: `✓ All ${passedCount} test cases passed!` });
        } else {
          setOutput({ type: 'error', message: `✗ ${passedCount}/${mappedTestCases.length} test cases passed` });
        }
      } else {
         setOutput({ type: 'error', message: "No test cases returned." });
      }
      setSubmissionPhase("result");
    } catch (error: unknown) {
      console.error("Run code error:", error);
      let errMsg = "Failed to execute code. Please try again.";
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          toast({
            title: "Rate Limit Exceeded",
            description: error.response?.data?.message || "You have reached the request limit. Please wait a moment before trying again.",
            variant: "destructive"
          });
        }
        errMsg = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      setOutput({ 
        type: 'error', 
        message: errMsg
      });
    } finally {
      setIsRunning(false);
    }
  }, [questions, currentIndex, sessionId, language, code, toast]);

  const handleSubmitQuestion = useCallback(async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    
    if (currentQ.type === "CODING") {
      if (!sessionId) {
        toast({ title: "Error", description: "No active session found", variant: "destructive" });
        return;
      }

      setIsSubmittingCode(true);
      setSubmissionPhase("running");
      setOutput(null);

      if (!isOnline) {
        // Offline handling for coding submission
        const offlineResult = {
          code: code,
          language: language,
          result: {
            submissionId: "offline-pending",
            status: "PENDING_SYNC",
            testCasesPassed: 0,
            testCasesTotal: 0,
            scoreAwarded: 0,
            maxScore: currentQ.marks,
            execTimeMs: 0
          }
        };
        const updatedAnswers = { ...answers, [currentQ.id]: offlineResult };
        setAnswers(updatedAnswers);
        AnswerStore.saveAnswer(sessionId, currentQ.id, offlineResult);
        AnswerStore.queueOfflineSubmission(sessionId, currentQ.id, "CODING", { code, language });
        setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
        
        toast({
          title: "Offline Mode",
          description: "No internet connection. Your solution has been saved locally and queued for synchronization.",
          variant: "destructive"
        });
        setOutput({ type: 'success', message: "✓ Saved locally (Pending sync)" });
        setIsSubmittingCode(false);
        setSubmissionPhase("result");
        return;
      }

      try {
        const submissionId = await testService.submitCode({
          sessionId: sessionId,
          questionId: currentQ.id,
          language: LANGUAGE_MAP[language]?.slug || "python3",
          sourceCode: code,
        });

        // Wait 10 seconds before starting to poll (grades take time to compute)
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Polling for results
        let gradingResult = null;
        for (let i = 0; i < 30; i++) { // 60 seconds max
          try {
            const res = await testService.getCodeResult(submissionId);
            if (res.status !== "PENDING" && res.status !== "PROCESSING") {
              gradingResult = res;
              break;
            }
          } catch (e) {
            // Ignore polling errors
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (gradingResult) {
          const finalResult = { code: code, language: language, result: gradingResult };
          setAnswers({ ...answers, [currentQ.id]: finalResult });
          AnswerStore.saveAnswer(sessionId, currentQ.id, finalResult);
          toast({ title: "Success", description: `Solution submitted! ${gradingResult.testCasesPassed}/${gradingResult.testCasesTotal} passed.` });
          setSubmissionPhase("result");
          
          if (gradingResult.status === "ACCEPTED") {
            setOutput({ type: 'success', message: "✓ All test cases passed!" });
          } else {
            setOutput({ type: 'error', message: `✗ ${gradingResult.status}: ${gradingResult.testCasesPassed}/${gradingResult.testCasesTotal} passed` });
          }
        } else {
          throw new Error("Grading timed out. Please try again.");
        }
      } catch (error: unknown) {
        console.error("Submit error:", error);

        // Check if network error occurred while online
        const isNetworkError = axios.isAxiosError(error) && (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED");
        if (isNetworkError) {
          const offlineResult = {
            code: code,
            language: language,
            result: {
              submissionId: "offline-pending",
              status: "PENDING_SYNC",
              testCasesPassed: 0,
              testCasesTotal: 0,
              scoreAwarded: 0,
              maxScore: currentQ.marks,
              execTimeMs: 0
            }
          };
          const updatedAnswers = { ...answers, [currentQ.id]: offlineResult };
          setAnswers(updatedAnswers);
          AnswerStore.saveAnswer(sessionId, currentQ.id, offlineResult);
          AnswerStore.queueOfflineSubmission(sessionId, currentQ.id, "CODING", { code, language });
          setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
          
          toast({
            title: "Network Error",
            description: "Connection to server failed. Your solution has been saved locally and queued for sync.",
            variant: "destructive"
          });
          setOutput({ type: 'success', message: "✓ Saved locally (Pending sync)" });
          setIsSubmittingCode(false);
          setSubmissionPhase("result");
          return;
        }

        let msg = "Failed to submit solution";
        let isRateLimit = false;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            isRateLimit = true;
            toast({
              title: "Rate Limit Exceeded",
              description: error.response?.data?.message || "You have reached the request limit. Please wait a moment before trying again.",
              variant: "destructive"
            });
          }
          msg = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          msg = error.message;
        }
        if (!isRateLimit) {
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
        setOutput({ type: 'error', message: msg });
      } finally {
        setIsSubmittingCode(false);
      }
      return;
    }

    // MCQ submission
    const currentAnswer = answers[currentQ.id];
    if (!currentAnswer) {
      toast({ title: "Warning", description: "Please select an answer", variant: "destructive" });
      return;
    }
    
    setIsSubmittingCode(true);

    if (!isOnline) {
      AnswerStore.saveAnswer(sessionId, currentQ.id, currentAnswer);
      AnswerStore.queueOfflineSubmission(sessionId, currentQ.id, "MCQ", currentAnswer);
      setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
      toast({
        title: "Offline Mode",
        description: "No internet connection. Your answer has been saved locally.",
        variant: "destructive"
      });
      setIsSubmittingCode(false);
      return;
    }

    try {
      await apiClient.post("/submissions", {
        sessionId: sessionId,
        questionId: currentQ.id,
        selectedOptionIds: [currentAnswer]
      });
      AnswerStore.saveAnswer(sessionId, currentQ.id, currentAnswer);
      toast({ title: "Saved", description: "Answer saved successfully" });
    } catch (error: unknown) {
      console.error("Submit error:", error);
      
      const isNetworkError = axios.isAxiosError(error) && (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED");
      if (isNetworkError) {
        AnswerStore.saveAnswer(sessionId, currentQ.id, currentAnswer);
        AnswerStore.queueOfflineSubmission(sessionId, currentQ.id, "MCQ", currentAnswer);
        setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
        toast({
          title: "Network Error",
          description: "Connection failed. Your answer has been saved locally and queued.",
          variant: "destructive"
        });
        setIsSubmittingCode(false);
        return;
      }

      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to submit answer",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCode(false);
    }
  }, [questions, currentIndex, sessionId, language, code, answers, toast, isOnline]);

  const handleMcqSelect = useCallback(async (questionId: string, value: string) => {
    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);

    const targetSessionId = sessionId || "demo-session";
    AnswerStore.saveAnswer(targetSessionId, questionId, value);

    if (!sessionId) return;

    if (!isOnline) {
      AnswerStore.queueOfflineSubmission(sessionId, questionId, "MCQ", value);
      setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
      return;
    }

    try {
      await apiClient.post("/submissions", {
        sessionId: sessionId,
        questionId: questionId,
        selectedOptionIds: [value]
      });
    } catch (error) {
      console.error("Auto-save MCQ error:", error);
      AnswerStore.queueOfflineSubmission(sessionId, questionId, "MCQ", value);
      setUnsyncedCount(AnswerStore.getOfflineQueue(sessionId).length);
    }
  }, [answers, sessionId, isOnline]);


  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

// Add this right after the useEffect that processes questions
useEffect(() => {
  console.log("🔍📊 FINAL QUESTIONS STATE:", {
    totalQuestions: questions.length,
    questions: questions.map(q => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt?.substring(0, 30),
      hasOptions: !!q.options?.length,
      hasCodeTemplate: !!q.codeTemplate
    }))
  });
}, [questions]);

  const isCurrentAnswered = (): boolean => {
    if (questions.length === 0) return false;
    const currentQ = questions[currentIndex];
    if (!currentQ) return false;
    
    if (currentQ.type === "MCQ") {
      return !!answers[currentQ.id];
    } else {
      return !!answers[currentQ.id];
    }
  };

  // Get available languages from current question
  const availableLanguages = (() => {
    const currentQ = questions[currentIndex];
    if (currentQ?.type === "CODING" && currentQ.codeTemplate) {
      return Object.keys(currentQ.codeTemplate) as LanguageKey[];
    }
    return ["python3", "javascript", "java", "cpp"] as LanguageKey[];
  })();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="text-red-500 mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="ml-2">Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">No questions found</h2>
            <p className="text-muted-foreground mb-4">This test doesn't have any questions yet.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Fullscreen Enforcement Overlay */}
      {!isFullscreen && isProctoringActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-background p-8 rounded-xl border-2 border-destructive shadow-2xl text-center max-w-md animate-in zoom-in duration-300">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
              <Monitor className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">FULLSCREEN EXITED</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              You must be in fullscreen mode to continue the test. The test will be auto-submitted in:
            </p>
            <div className="text-6xl font-black text-destructive mb-8 tabular-nums">
              {fullscreenTimer}s
            </div>
            <Button 
              size="lg" 
              variant="destructive" 
              className="w-full h-14 text-xl font-bold shadow-lg hover:shadow-destructive/20 transition-all hover:scale-105"
              onClick={enterFullscreen}
            >
              Go Fullscreen Now
            </Button>
          </div>
        </div>
      )}

      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        !isFullscreen && isProctoringActive && "blur-md pointer-events-none"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{test?.title || "Test"}</h1>
          <p className="text-xs text-muted-foreground">{test?.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(!isOnline || unsyncedCount > 0) && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all animate-pulse",
              !isOnline 
                ? "bg-orange-500/10 text-orange-600 border-orange-500/20" 
                : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            )}>
              {!isOnline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              <span>
                {!isOnline ? "Offline" : "Syncing..."} {unsyncedCount > 0 && `(${unsyncedCount} unsynced)`}
              </span>
            </div>
          )}

          <div className={cn(
            "rounded-lg px-3 py-2 text-sm font-mono font-medium",
            timeLeft < 300 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-muted"
          )}>
            <Clock className="w-4 h-4 inline mr-2" />
            {formatTime(timeLeft)}
          </div>
          
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all",
            trustScore > 80 ? "bg-green-500/10 text-green-600 border border-green-500/20" :
            trustScore > 50 ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
            "bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse"
          )}>
            {trustScore > 80 ? <ShieldCheckIcon className="w-4 h-4" /> : 
             trustScore > 50 ? <Shield className="w-4 h-4" /> : 
             <ShieldAlert className="w-4 h-4" />}
            <span className="hidden sm:inline">Trust Score:</span> {trustScore}%
          </div>

          <div className="text-sm text-muted-foreground">
            Q{currentIndex + 1}/{questions.length}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSubmitDialog(true)}>
            <Send className="w-4 h-4 mr-2" /> Submit
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={currentQuestion.type === "CODING" ? "default" : "secondary"}>
                          {currentQuestion.type === "CODING" ? <Code2 className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                          {currentQuestion.type}
                        </Badge>
                        <Badge variant="outline">{currentQuestion.marks} marks</Badge>
                        {currentQuestion.difficulty && (
                          <Badge variant="outline" className={cn(
                            currentQuestion.difficulty === "EASY" && "bg-green-500/10 text-green-500 border-green-500/20",
                            currentQuestion.difficulty === "MEDIUM" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                            currentQuestion.difficulty === "HARD" && "bg-red-500/10 text-red-500 border-red-500/20",
                          )}>
                            {currentQuestion.difficulty}
                          </Badge>
                        )}
                        {isCurrentAnswered() && (
                          <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" /> Answered
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-lg font-medium mt-3 whitespace-pre-wrap">
                        {currentQuestion.title || currentQuestion.prompt}
                      </h2>
                      {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentQuestion.tags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground border">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newFlagged = new Set(flagged);
                        if (newFlagged.has(currentQuestion.id)) {
                          newFlagged.delete(currentQuestion.id);
                        } else {
                          newFlagged.add(currentQuestion.id);
                        }
                        setFlagged(newFlagged);
                      }}
                    >
                      <Flag className={cn("w-4 h-4 mr-2", flagged.has(currentQuestion.id) && "fill-yellow-500 text-yellow-500")} />
                      {flagged.has(currentQuestion.id) ? "Flagged" : "Flag for review"}
                    </Button>
                  </div>

                  {currentQuestion.type === "MCQ" && currentQuestion.options && (
                    <div className="space-y-4">
                      <RadioGroup
                        value={(answers[currentQuestion.id] as string) || ""}
                        onValueChange={(value) => handleMcqSelect(currentQuestion.id, value)}
                        className="space-y-2 pt-2"
                      >
                        {currentQuestion.options.map((optionItem: unknown, idx: number) => {
                          const option = optionItem as { id?: string; text?: string } | string;
                          const optionId = (typeof option === "object" && option !== null ? (option.id || option.text || "") : option) as string;
                          const optionText = (typeof option === "object" && option !== null ? (option.text || "") : option) as string;
                          return (
                            <Label 
                              key={idx} 
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                answers[currentQuestion.id] === optionId 
                                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                                  : "border-border hover:bg-muted/50 hover:border-primary/30"
                              )}
                            >
                              <RadioGroupItem value={optionId} id={`option-${idx}`} />
                              <span className="text-sm">{optionText}</span>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                      {answers[currentQuestion.id] && (
                        <div className="flex justify-end items-center gap-1.5 text-xs text-muted-foreground font-medium pt-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          <span>Selection auto-saved</span>
                        </div>
                      )}
                    </div>
                  )}

                  {currentQuestion.type === "CODING" && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-muted/30 p-4 space-y-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {currentQuestion.problemStatement || currentQuestion.prompt}
                          </p>
                        </div>

                        {(currentQuestion.timeLimitSecs || currentQuestion.memoryLimitMb) && (
                          <div className="flex gap-4 text-xs font-semibold text-muted-foreground border-y py-2">
                            {currentQuestion.timeLimitSecs && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Time Limit: {currentQuestion.timeLimitSecs}s
                              </div>
                            )}
                            {currentQuestion.memoryLimitMb && (
                              <div className="flex items-center gap-1">
                                <Database className="w-3 h-3" /> Memory Limit: {currentQuestion.memoryLimitMb}MB
                              </div>
                            )}
                          </div>
                        )}

                        {currentQuestion.constraints && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground">Constraints:</div>
                            <div className="text-sm bg-background/50 p-2 rounded border font-mono">
                              {currentQuestion.constraints}
                            </div>
                          </div>
                        )}

                        {(((test as unknown) as { examples?: { input: string; output: string; explanation?: string }[] })?.examples || currentQuestion.sampleInput) && (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground">Examples:</div>
                            {(currentQuestion.sampleInput ? [
                              { 
                                input: currentQuestion.sampleInput, 
                                output: currentQuestion.sampleOutput, 
                                explanation: currentQuestion.sampleExplanation 
                              }
                            ] : (((test as unknown) as { examples?: { input: string; output: string; explanation?: string }[] })?.examples || [])).map((ex: { input: string; output: string; explanation?: string }, idx: number) => (
                              <div key={idx} className="space-y-2 last:border-0 border-b pb-3 border-dashed">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="rounded-lg bg-background p-2 border">
                                    <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-tight">Input:</div>
                                    <pre className="text-xs font-mono">{ex.input}</pre>
                                  </div>
                                  <div className="rounded-lg bg-background p-2 border">
                                    <div className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-tight">Output:</div>
                                    <pre className="text-xs font-mono">{ex.output}</pre>
                                  </div>
                                </div>
                                {ex.explanation && (
                                  <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border-l-2 border-primary/30">
                                    <span className="font-semibold">Explanation:</span> {ex.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {currentQuestion.hints && (currentQuestion.hints as string[]).length > 0 && (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="hints" className="border-none">
                              <AccordionTrigger className="text-xs font-semibold text-primary py-1 hover:no-underline">
                                <span className="flex items-center gap-1">
                                  <Lightbulb className="w-3 h-3" /> Need a hint?
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <ul className="space-y-2">
                                  {(currentQuestion.hints as string[]).map((hint: string, hIdx: number) => (
                                    <li key={hIdx} className="text-sm bg-yellow-500/5 p-2 rounded border border-yellow-500/10">
                                      <span className="font-semibold text-xs text-yellow-600 mr-1">Hint {hIdx + 1}:</span> {hint}
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>

                      <div className="rounded-lg border overflow-hidden">
                        <div className="flex justify-between items-center border-b px-4 py-2 bg-muted/30">
                          <div className="text-sm font-medium">Code Editor</div>
                          <div className="flex items-center gap-2">
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value as LanguageKey)}
                              className="rounded border bg-background px-2 py-1 text-xs"
                            >
                              {availableLanguages.map((lang) => (
                                <option key={lang} value={lang}>
                                  {LANGUAGE_MAP[lang]?.name || lang}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Editor
                          height="400px"
                          language={LANGUAGE_MAP[language]?.monaco || "python"}
                          value={code}
                          onChange={(value) => setCode(value || "")}
                          theme="vs-dark"
                          options={{ 
                            minimap: { enabled: false }, 
                            fontSize: 13,
                            scrollBeyondLastLine: false,
                            automaticLayout: true
                          }}
                        />
                        <div className="flex gap-2 p-3 border-t bg-muted/30">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleRunCode} 
                            disabled={isRunning || isSubmittingCode}
                          >
                            {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                            Run Code
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSubmitQuestion} 
                            disabled={isRunning || isSubmittingCode}
                          >
                            {isSubmittingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Submit Solution
                          </Button>
                        </div>

                        {(output || testCaseResults.length > 0) && (
                          <div className="border-t bg-black/5">
                            <div className="p-4 space-y-3">
                              {output && (
                                <div className={cn(
                                  "p-3 rounded-lg text-sm font-mono",
                                  output.type === 'success' 
                                    ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                                )}>
                                  {output.type === 'success' ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <XCircle className="w-4 h-4 inline mr-2" />}
                                  {output.message}
                                </div>
                              )}
                              {testCaseResults.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-2">Test Cases:</div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {testCaseResults.map((tc, idx) => (
                                      <div key={idx} className={cn(
                                        "p-2 rounded-lg text-center text-xs font-mono",
                                        tc.passed ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                                      )}>
                                        <div>Case {idx + 1}</div>
                                        <div>{tc.passed ? "✓ Passed" : "✗ Failed"}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Sidebar Navigation */}
        <aside className="lg:w-80 border-l bg-card/50 p-4 space-y-4 overflow-y-auto">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Question Navigator</div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "h-10 rounded-lg font-mono text-sm transition-all",
                      idx === currentIndex && "ring-2 ring-primary bg-primary text-white",
                      isAnswered && !flagged.has(q.id) && idx !== currentIndex && "bg-green-500/20 text-green-700",
                      flagged.has(q.id) && "bg-yellow-500/20 text-yellow-700",
                      !isAnswered && !flagged.has(q.id) && idx !== currentIndex && "bg-muted hover:bg-muted/70"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled={currentIndex === 0} 
              onClick={() => setCurrentIndex(prev => prev - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Prev
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled={currentIndex === questions.length - 1} 
              onClick={() => setCurrentIndex(prev => prev + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-semibold text-green-600">{Object.keys(answers).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Flagged:</span>
                <span className="font-semibold text-yellow-600">{flagged.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-semibold">{questions.length - Object.keys(answers).length}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-2">Legend:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500/20"></div><span className="text-xs">Answered</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-500/20"></div><span className="text-xs">Flagged</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-muted"></div><span className="text-xs">Not Answered</span></div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You have answered {Object.keys(answers).length} out of {questions.length} questions.</p>
              {Object.keys(answers).length < questions.length && (
                <p className="text-yellow-600 font-medium">
                  ⚠️ You have {questions.length - Object.keys(answers).length} unanswered questions.
                </p>
              )}
              {flagged.size > 0 && (
                <p className="text-yellow-600">
                  📌 You have {flagged.size} question(s) flagged for review.
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back to Test</AlertDialogCancel>
            <AlertDialogAction onClick={submitTest} disabled={submitting} className="bg-primary text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CameraPreview position="bottom-right" size="small" showOnHover />
      <ViolationToast />
      </div>
    </div>
  );
}