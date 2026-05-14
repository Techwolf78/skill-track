import { useEffect, useState } from "react";
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
  Loader2, Save, FileText, Code2, Database, Lightbulb
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Editor from "@monaco-editor/react";
import { apiClient } from "@/lib/api-client";
import { testService, CodeTemplateEntry } from "@/lib/test-service";

// Types
interface Question {
  id: string;
  type: "MCQ" | "CODING";
  prompt: string;
  marks: number;
  options?: string[];
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

interface TestSession {
  id: string;
  testId: string;
  candidateId: string;
  status: "ACTIVE" | "SUBMITTED" | "EXPIRED";
  startedAt: string;
  endedAt?: string;
  remainingTimeSecs: number;
  answers?: Record<string, any>;
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

// Language mapping for display
const LANGUAGE_MAP = {
  python3: { name: "Python 3", slug: "python3", monaco: "python" },
  javascript: { name: "JavaScript", slug: "javascript", monaco: "javascript" },
  java: { name: "Java", slug: "java", monaco: "java" },
  cpp: { name: "C++", slug: "cpp", monaco: "cpp" },
} as const;

type LanguageKey = keyof typeof LANGUAGE_MAP;

export default function TestInterface() {
  const { testId, sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<TestDetails | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
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
  const [testCaseResults, setTestCaseResults] = useState<any[]>([]);
  const [submissionPhase, setSubmissionPhase] = useState<"idle" | "running" | "result">("idle");

  useEffect(() => {
    if (sessionId) {
      fetchTestSession();
    } else if (testId) {
      fetchTestDirect();
    }
  }, [sessionId, testId]);

  const fetchTestDirect = async () => {
    try {
      setLoading(true);
      const testResponse = await apiClient.get(`/tests/${testId}`);
      const testData = testResponse.data?.data || testResponse.data;
      setTest(testData);
    } catch (error: any) {
      console.error("Failed to fetch test:", error);
      setError(error.response?.data?.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

const fetchTestSession = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log("🚀 STEP 1: Fetching session for ID:", sessionId);
    
    const sessionResponse = await apiClient.get(`/test-sessions/${sessionId}`);
    const sessionData = sessionResponse.data?.data || sessionResponse.data;
    console.log("✅ STEP 2: Session Data:", sessionData);
    setSession(sessionData);

    console.log("🚀 STEP 3: Fetching test with ID:", sessionData.testId);
    
    const testResponse = await apiClient.get(`/tests/${sessionData.testId}`);
    let testData = testResponse.data?.data || testResponse.data;
    console.log("✅ STEP 4: Raw Test Data:", testData);
    
    console.log("📋 STEP 5: Test questions array:", testData.questions);
    console.log("📋 STEP 5.1: Number of questions:", testData.questions?.length);
    
    // Log first question structure
    if (testData.questions && testData.questions.length > 0) {
      console.log("📋 STEP 5.2: First question (raw):", testData.questions[0]);
      console.log("📋 STEP 5.3: Does first question have 'question' property?", testData.questions[0].question);
    }
    
    // Fetch question details if not populated
    if (testData.questions && testData.questions.length > 0) {
      const hasQuestionDetails = testData.questions.some((tq: any) => tq.question?.prompt);
      console.log("🔍 STEP 6: Questions already have details?", hasQuestionDetails);
      
      if (!hasQuestionDetails) {
        console.log("🚀 STEP 7: Fetching individual question details for", testData.questions.length, "questions");
        
        const questionsWithDetails = await Promise.all(
          testData.questions.map(async (tq: any, idx: number) => {
            console.log(`  📥 Fetching question ${idx + 1}: ${tq.questionId}`);
            try {
              const questionData = await testService.getQuestionById(tq.questionId);
              console.log(`  ✅ Question ${idx + 1} details:`, {
                id: questionData.id,
                type: questionData.questionType,
                prompt: questionData.prompt?.substring(0, 50),
                hasCodeTemplate: !!questionData.codeTemplate
              });
              return { ...tq, question: questionData };
            } catch (err) {
              console.error(`  ❌ Failed to fetch question ${tq.questionId}:`, err);
              return tq;
            }
          })
        );
        
        testData.questions = questionsWithDetails;
        console.log("✅ STEP 8: Updated test data with question details");
      }
    }
    
    setTest(testData);
    console.log("🎯 FINAL: Test state updated:", testData);
    
  } catch (error: any) {
    console.error("❌ FATAL: Failed to fetch test session:", error);
    setError(error.response?.data?.message || "Failed to load test");
  } finally {
    setLoading(false);
  }
};

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
          options: tq.question?.mcqOptions?.map((opt: any) => opt.text),
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
  if (currentQ?.type === "CODING" && currentQ.codeTemplate) {
    console.log("🎯 Initializing code editor for language:", language);
    console.log("🎯 Available templates:", Object.keys(currentQ.codeTemplate));
    
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
        setCode(currentQ.codeTemplate[firstLang].code);
      }
    }
  }
}, [currentIndex, questions, language]);

  // Set time left from session or test
  useEffect(() => {
    if (session && session.remainingTimeSecs > 0) {
      setTimeLeft(session.remainingTimeSecs);
    } else if (test?.durationMins) {
      setTimeLeft(test.durationMins * 60);
    }
  }, [session, test]);

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
  }, [timeLeft, sessionId]);

  const handleAutoSubmit = async () => {
    toast({
      title: "Time's Up!",
      description: "Your test has been automatically submitted.",
    });
    await submitTest();
  };

  const submitTest = async () => {
    if (!sessionId) {
      navigate(`/test/${testId}/results`);
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.patch(`/test-sessions/${sessionId}`, {
        status: "SUBMITTED",
        endedAt: new Date().toISOString(),
        answers: answers
      });

      // Calculate and save test results
      try {
        await apiClient.post("/test-results", {
          sessionId: sessionId,
          candidateId: session?.candidateId
        });
        console.log("Test results calculated and saved successfully");
      } catch (calcError) {
        console.error("Failed to calculate test results:", calcError);
        // We continue anyway, as the session is already submitted
      }

      toast({ title: "Success", description: "Test submitted successfully" });
      navigate(`/test/${testId}/results?session=${sessionId}`);
    } catch (error: any) {
      console.error("Failed to submit test:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit test",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleRunCode = async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    if (!currentQ || currentQ.type !== "CODING") return;

    setIsRunning(true);
    setSubmissionPhase("running");
    setOutput(null);
    setTestCaseResults([]);

    try {
      const response = await apiClient.post("/api/code/execute/run", {
        sessionId: sessionId || "00000000-0000-0000-0000-000000000000",
        questionId: currentQ.id,
        language: LANGUAGE_MAP[language]?.slug || "python3",
        sourceCode: code,
      });
      
      console.log("Run Code Response:", response.data);

      const resultsArray = Array.isArray(response.data?.data) ? response.data.data : [];
      
      const mappedTestCases = resultsArray.map((tc: any) => ({
        passed: tc.status === "ACCEPTED",
        ...tc
      }));

      setTestCaseResults(mappedTestCases);
      const passedCount = mappedTestCases.filter((tc: any) => tc.passed).length;
      
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
    } catch (error: any) {
      console.error("Run code error:", error);
      setOutput({ 
        type: 'error', 
        message: error.response?.data?.message || "Failed to execute code. Please try again."
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    
    let answerText = "";
    
    if (currentQ.type === "CODING") {
      answerText = code;
      setIsSubmittingCode(true);
      setSubmissionPhase("running");
      setOutput(null);
    } else {
      const currentAnswer = answers[currentQ.id];
      if (!currentAnswer) {
        toast({ title: "Warning", description: "Please select an answer", variant: "destructive" });
        return;
      }
      answerText = typeof currentAnswer === 'string' ? currentAnswer : JSON.stringify(currentAnswer);
      setIsSubmittingCode(true);
    }

    try {
      const payload = {
        sessionId: sessionId,
        questionId: currentQ.id,
        answerText: answerText
      };
      
      console.log("Submitting to backend:", payload);
      
      const response = await apiClient.post("/submissions", payload);
      const result = response.data?.data || response.data;
      
      if (currentQ.type === "CODING") {
        setAnswers({ ...answers, [currentQ.id]: { code: code, language: language, result: result } });
        toast({ title: "Success", description: "Solution submitted successfully" });
        setSubmissionPhase("result");
      } else {
        toast({ title: "Saved", description: "Answer saved successfully" });
      }
      
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit answer",
        variant: "destructive",
      });
      if (currentQ.type === "CODING") {
        setOutput({ 
          type: 'error', 
          message: error.response?.data?.message || "Failed to submit solution. Please try again."
        });
      }
    } finally {
      setIsSubmittingCode(false);
    }
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{test?.title || "Test"}</h1>
          <p className="text-xs text-muted-foreground">{test?.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm font-mono font-medium",
            timeLeft < 300 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-muted"
          )}>
            <Clock className="w-4 h-4 inline mr-2" />
            {formatTime(timeLeft)}
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
                        value={answers[currentQuestion.id] || ""}
                        onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.id]: value })}
                        className="space-y-2 pt-2"
                      >
                        {currentQuestion.options.map((option, idx) => (
                          <Label 
                            key={idx} 
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              answers[currentQuestion.id] === option 
                                ? "border-primary bg-primary/5 ring-1 ring-primary" 
                                : "border-border hover:bg-muted/50 hover:border-primary/30"
                            )}
                          >
                            <RadioGroupItem value={option} id={`option-${idx}`} />
                            <span className="text-sm">{option}</span>
                          </Label>
                        ))}
                      </RadioGroup>
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={handleSubmitQuestion}
                          disabled={isSubmittingCode}
                        >
                          {isSubmittingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Submit Answer
                        </Button>
                      </div>
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

                        {((test as any)?.examples || currentQuestion.sampleInput) && (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-muted-foreground">Examples:</div>
                            {(currentQuestion.sampleInput ? [
                              { 
                                input: currentQuestion.sampleInput, 
                                output: currentQuestion.sampleOutput, 
                                explanation: currentQuestion.sampleExplanation 
                              }
                            ] : ((test as any)?.examples || [])).map((ex: any, idx: number) => (
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

                        {currentQuestion.hints && (currentQuestion.hints as any).length > 0 && (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="hints" className="border-none">
                              <AccordionTrigger className="text-xs font-semibold text-primary py-1 hover:no-underline">
                                <span className="flex items-center gap-1">
                                  <Lightbulb className="w-3 h-3" /> Need a hint?
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                <ul className="space-y-2">
                                  {(currentQuestion.hints as any).map((hint: string, hIdx: number) => (
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
            <AlertDialogCancel>Continue Testing</AlertDialogCancel>
            <AlertDialogAction onClick={submitTest} disabled={submitting} className="bg-primary text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}