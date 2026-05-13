import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Clock,
  Code,
  ListChecks,
  ArrowLeft,
  Play,
  Settings as SettingsIcon,
  Info,
  Bug,
  Save,
  MessageSquare,
  Zap,
  Terminal,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Lock,
  Loader2,
  Database,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  testService,
  Question,
  TestCase,
  CodeExecutionResponse,
  TestCaseResult,
} from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { mapFriendlyError, QuestionMetadata } from "@/lib/judge0";

interface TestCaseUI {
  input: string;
  expected: string;
  isHidden?: boolean;
  weight?: number;
  explanation?: string;
}

interface CodeSnippet {
  code: string;
  lang: string;
  langSlug: string;
}

interface QuestionUI {
  id: string;
  type: "mcq" | "coding";
  question: string;
  title?: string;
  difficulty?: string;
  constraints?: string;
  hints?: string[];
  timeLimitSecs?: number;
  memoryLimitMb?: number;
  tags?: string[];
  options?: string[];
  problemStatement?: string;
  sampleInput?: string;
  sampleOutput?: string;
  sampleExplanation?: string;
  testCases: TestCaseUI[];
  marks: number;
  metadata?: QuestionMetadata;
  codeSnippets?: CodeSnippet[];
}

const isCorrect = (actual: string, expected: string) => {
  const clean = (s: string) => s.replace(/\s+/g, "").replace(/,$/, "");
  return clean(actual) === clean(expected);
};

// Default code snippets for different languages
const getDefaultCode = (language: string, questionPrompt?: string): string => {
  const defaultCodes: Record<string, string> = {
    python3: `# ${questionPrompt || "Write your solution here"}

def solve():
    import sys
    data = sys.stdin.read()
    # Your code here
    print(data)

if __name__ == "__main__":
    solve()
`,
    javascript: `// ${questionPrompt || "Write your solution here"}

function solve() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    let input = '';
    rl.on('line', (line) => {
        input += line + '\\n';
    });
    rl.on('close', () => {
        // Your code here
        console.log(input.trim());
    });
}

solve();
`,
    java: `// ${questionPrompt || "Write your solution here"}

import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        StringBuilder input = new StringBuilder();
        while (sc.hasNextLine()) {
            input.append(sc.nextLine()).append("\\n");
        }
        // Your code here
        System.out.print(input.toString());
    }
}
`,
    cpp: `// ${questionPrompt || "Write your solution here"}

#include <iostream>
#include <string>
using namespace std;

int main() {
    string input, line;
    while (getline(cin, line)) {
        input += line + "\\n";
    }
    // Your code here
    cout << input;
    return 0;
}
`,
  };

  return defaultCodes[language] || defaultCodes.python3;
};

export default function DSAPlayground() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [question, setQuestion] = useState<QuestionUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python3");
  const [activeTab, setActiveTab] = useState("description");
  const [consoleOutput, setConsoleOutput] = useState("");
  const [mcqAnswer, setMcqAnswer] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<CodeExecutionResponse | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<
    {
      status: string;
      input: string;
      output: string;
      expected: string;
      isHidden: boolean;
      id: number;
    }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<
    "idle" | "compiling" | "samples" | "hidden" | "result"
  >("idle");
  const [verdict, setVerdict] = useState<{
    type: "success" | "fail" | "error";
    title: string;
    message: string;
  } | null>(null);

  const fetchQuestionFromBackend = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch question from backend
      const backendQuestion = await testService.getQuestionById(id!);

      // Fetch test cases for coding questions
      let testCasesData: TestCaseUI[] = [];
      let codeSnippetsData: CodeSnippet[] = [];

      if (backendQuestion.questionType === "CODING") {
        const testCases = await testService.getTestCasesByCodingQuestion(id!);
        testCasesData = testCases.map((tc: TestCase) => ({
          input: tc.input,
          expected: tc.expectedOutput,
          isHidden: !tc.sample,
          weight: tc.weight,
          explanation: tc.explanation,
        }));

        // Create code snippets
        codeSnippetsData = [
          {
            code: getDefaultCode("python3", backendQuestion.prompt),
            lang: "Python 3",
            langSlug: "python3",
          },
          {
            code: getDefaultCode("javascript", backendQuestion.prompt),
            lang: "JavaScript",
            langSlug: "javascript",
          },
          {
            code: getDefaultCode("java", backendQuestion.prompt),
            lang: "Java",
            langSlug: "java",
          },
          {
            code: getDefaultCode("cpp", backendQuestion.prompt),
            lang: "C++",
            langSlug: "cpp",
          },
        ];

        setCode(codeSnippetsData[0].code);
      }

      const questionData: QuestionUI = {
        id: backendQuestion.id,
        type: backendQuestion.questionType === "CODING" ? "coding" : "mcq",
        question: backendQuestion.prompt,
        title: backendQuestion.title,
        difficulty: backendQuestion.difficulty,
        constraints: backendQuestion.constraints,
        hints: backendQuestion.hints,
        timeLimitSecs: backendQuestion.timeLimitSecs,
        memoryLimitMb: backendQuestion.memoryLimitMb,
        tags: backendQuestion.tags,
        problemStatement: backendQuestion.prompt,
        sampleInput: testCasesData.find((tc) => !tc.isHidden)?.input || "",
        sampleOutput: testCasesData.find((tc) => !tc.isHidden)?.expected || "",
        sampleExplanation:
          testCasesData.find((tc) => !tc.isHidden)?.explanation || "",
        testCases: testCasesData,
        marks: backendQuestion.marks || 10,
        options: backendQuestion.mcqOptions?.map((opt) => opt.text) || [],
        codeSnippets: codeSnippetsData,
        metadata: {
          functionName: "solve",
          parameterTypes: [],
          returnType: { type: "any" },
          category: "array" as any,
        },
      };

      setQuestion(questionData);
    } catch (error) {
      console.error("Error fetching question:", error);
      toast({
        title: "Error",
        description: "Failed to load question from backend",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      fetchQuestionFromBackend();
    }
  }, [id, fetchQuestionFromBackend]);

  const handleRunCode = async () => {
    if (!code || !question || question.type !== "coding") return;

    setIsExecuting(true);
    setSubmissionPhase("compiling");
    setConsoleOutput("> Compiling source code...\n");
    setActiveTab("console");
    setVerdict(null);
    setTestCaseResults([]);

    try {
      const backendLanguage = language === "python3" ? "python" : language;
      const requestBody: Record<string, unknown> = {
        sessionId: "00000000-0000-0000-0000-000000000000",
        questionId: question.id,
        language: backendLanguage,
        sourceCode: code,
      };

      const response = await apiClient.post<any>("/api/code/execute/playground", requestBody);
      console.log("Run Code Response:", response.data);
      const resultsArray = Array.isArray(response.data.data) ? response.data.data : [];

      const statusToId: Record<string, number> = {
        ACCEPTED: 3,
        WRONG_ANSWER: 4,
        TIME_LIMIT_EXCEEDED: 5,
        COMPILATION_ERROR: 6,
        RUNTIME_ERROR: 7,
        INTERNAL_ERROR: 13,
      };

      const sampleCases = question.testCases.filter((tc) => !tc.isHidden);
      const mappedResults = resultsArray.map((res: any, idx: number) => ({
        status: res.status,
        input: sampleCases[idx]?.input || "",
        output: res.actualOutput || res.stdout || res.stderr || res.compileOutput || "",
        expected: res.expectedOutput || sampleCases[idx]?.expected || "",
        isHidden: false,
        id: statusToId[res.status] || 4,
      }));

      setTestCaseResults(mappedResults);
      setConsoleOutput("> Execution finished.\n");

      let overallStatus = "ACCEPTED";
      for (const res of resultsArray) {
        if (res.status !== "ACCEPTED") {
          overallStatus = res.status;
          break;
        }
      }

      const topLevelId = statusToId[overallStatus] || 4;

      if (topLevelId !== 3) {
        const type: "fail" | "error" = "fail";
        let title = "Error";
        let message = overallStatus;

        if (topLevelId === 6) {
          title = "Compilation Error";
          message = resultsArray[0]?.compileOutput || resultsArray[0]?.stderr || "Compilation failed";
        } else if (topLevelId === 5) {
          title = "Time Limit Exceeded";
          message = "Your code took too long to run.";
        } else if (topLevelId === 4) {
          title = "Wrong Answer";
          message = "Logic failed on sample case.";
        } else if (topLevelId >= 7) {
          title = "Runtime Error";
          message = resultsArray.find((r:any) => r.status !== "ACCEPTED")?.stderr || "Runtime error";
        }

        const friendlyHint = mapFriendlyError(message, language);
        if (friendlyHint) {
          message = friendlyHint + "\n\nOriginal Error:\n" + message;
        }

        setVerdict({ type, title, message });
        setSubmissionPhase("result");
      } else {
        const passedCount = resultsArray.filter((r: any) => r.status === "ACCEPTED").length;
        const totalCount = resultsArray.length;
        setConsoleOutput(
          (prev) =>
            prev + `> Sample Results: ${passedCount}/${totalCount} Passed\n`,
        );

        if (passedCount > 0 && passedCount < totalCount) {
          setVerdict({
            type: "fail",
            title: "Wrong Answer",
            message: `Failed on some sample cases.`,
          });
        } else if (passedCount > 0) {
          setVerdict({
            type: "success",
            title: "Finished",
            message: "All sample cases passed!",
          });
        } else {
           setVerdict({
            type: "fail",
            title: "Error",
            message: "No test cases returned.",
          });
        }
        setSubmissionPhase("result");
      }
    } catch (error: any) {
      console.error("Judge0 Error:", error);
      setVerdict({
        type: "error",
        title: "System Error",
        message: error?.response?.data?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code || !question || question.type !== "coding") return;

    setIsSubmitting(true);
    setSubmissionPhase("compiling");
    setVerdict(null);
    setActiveTab("console");
    setTestCaseResults([]);
    setConsoleOutput(
      "> Initializing deep verification...\n> Compiling source code...\n",
    );

    try {
      const backendLanguage = language === "python3" ? "python" : language;
      const response = await apiClient.post<any>("/api/code/execute/submit", {
        sessionId: "00000000-0000-0000-0000-000000000000",
        questionId: question.id,
        language: backendLanguage,
        sourceCode: code,
      });

      const submissionId = response.data.data;
      if (!submissionId) {
        throw new Error("No submission ID returned");
      }

      setConsoleOutput(prev => prev + "> Submission accepted. Waiting for grading...\n");

      let executionResult: any = null;
      for (let i = 0; i < 30; i++) { // Poll for up to 60 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const res = await apiClient.get<any>(`/api/code/execute/result/${submissionId}`);
          if (res.data.data && res.data.data.status !== "PENDING" && res.data.data.status !== "PROCESSING") {
            executionResult = res.data.data;
            break;
          }
        } catch (e) {
          // ignore error while polling if it's just a 404 or temporary
        }
      }

      if (!executionResult) {
        throw new Error("Submission polling timed out.");
      }

      setTestCaseResults([]);
      setConsoleOutput("> Verification finished.\n");

      const statusToId: Record<string, number> = {
        ACCEPTED: 3,
        WRONG_ANSWER: 4,
        TIME_LIMIT_EXCEEDED: 5,
        COMPILATION_ERROR: 6,
        RUNTIME_ERROR: 7,
        INTERNAL_ERROR: 13,
      };

      const topLevelId = statusToId[executionResult.status] || 4;

      if (topLevelId !== 3) {
        let title = "Wrong Answer";
        let message = "Failed on test cases.";

        if (topLevelId === 6) {
          title = "Compilation Failed";
          message = "Compilation failed";
        } else if (topLevelId === 5) {
          title = "Time Limit Exceeded";
          message = "Exceeded time on test case.";
        } else if (topLevelId >= 7) {
          title = "Runtime Error";
          message = "Crash during validation.";
        }

        setVerdict({ type: "fail", title, message });
      } else {
        const passedCount = executionResult.testCasesPassed;
        const totalCount = executionResult.testCasesTotal;
        const score = executionResult.scoreAwarded;
        
        setVerdict({
          type: "success",
          title: "Accepted",
          message: `All test cases passed! (${passedCount}/${totalCount}). Score: ${score}`,
        });

        toast({
          title: "Success!",
          description: `Solution accepted! (${passedCount}/${totalCount})`,
        });
      }

      setSubmissionPhase("result");
    } catch (error: any) {
      console.error("Submission error:", error);
      setVerdict({
        type: "error",
        title: "System Error",
        message: error?.response?.data?.message || error?.message || "Failed to process submission.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMcqSubmit = async () => {
    if (!mcqAnswer) {
      toast({
        title: "Error",
        description: "Please select an answer",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Answer Submitted",
      description: `Your answer: ${mcqAnswer}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-[#eff1f6cc]">Loading question...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg font-semibold">
            Question not found
          </p>
          <Button onClick={() => navigate("/superadmin/questions")}>
            Back to Question Bank
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1a1a1a] text-white flex flex-col overflow-hidden">
      <header className="flex-none bg-[#282828] border-b border-[#3e3e3e] px-6 py-2 flex items-center justify-between h-[52px]">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#eff1f6cc] hover:text-white"
            onClick={() => navigate("/superadmin/questions")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Playground
          </Button>
          <div className="h-4 w-[1px] bg-[#3e3e3e]" />
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-primary/20 text-primary border-none text-[10px] px-1.5 h-5 uppercase tracking-wider font-bold"
            >
              {question.type === "coding" ? "Coding Challenge" : "MCQ Question"}
            </Badge>
            <h1 className="text-sm font-medium text-[#eff1f6cc]">
              {question.title || question.question?.substring(0, 50)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-[#eff1f6cc] border-[#3e3e3e]"
          >
            {question.marks} marks
          </Badge>
          <Button variant="ghost" size="icon" className="text-[#eff1f6cc]">
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {question.type === "mcq" ? (
          <div className="flex-1 bg-[#1a1a1a] p-8 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="rounded-xl border border-[#3e3e3e] bg-[#282828] p-8">
                <h2 className="text-xl font-semibold mb-8 text-[#eff1f6cc]">
                  {question.question}
                </h2>

                <RadioGroup
                  value={mcqAnswer}
                  onValueChange={setMcqAnswer}
                  className="space-y-4"
                >
                  {question.options?.map((option, index) => (
                    <Label
                      key={index}
                      htmlFor={`option-${index}`}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border border-[#3e3e3e] cursor-pointer transition-all",
                        mcqAnswer === option
                          ? "border-primary bg-primary/10 text-white"
                          : "hover:bg-[#333] text-[#eff1f6cc]",
                      )}
                    >
                      <RadioGroupItem
                        value={option}
                        id={`option-${index}`}
                        className="border-[#3e3e3e] text-primary"
                      />
                      <span className="flex-1">{option}</span>
                    </Label>
                  ))}
                </RadioGroup>

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={handleMcqSubmit}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Submit Answer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel
              defaultSize={40}
              minSize={20}
              className="flex flex-col bg-[#282828]"
            >
              <div className="flex border-b border-[#3e3e3e]">
                <button
                  onClick={() => setActiveTab("description")}
                  className={cn(
                    "px-4 py-2 text-xs font-medium transition-colors border-b-2",
                    activeTab === "description"
                      ? "text-white border-primary"
                      : "text-[#eff1f6cc] border-transparent hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    Description
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("testcases-editor")}
                  className={cn(
                    "px-4 py-2 text-xs font-medium transition-colors border-b-2",
                    activeTab === "testcases-editor"
                      ? "text-white border-primary"
                      : "text-[#eff1f6cc] border-transparent hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-3.5 h-3.5" />
                    Test Cases
                  </div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === "description" ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {question.title || question.question}
                      </h2>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge
                          variant="outline"
                          className="text-success border-success/30 bg-success/10 py-0 text-[10px]"
                        >
                          {question.marks} marks
                        </Badge>
                        {question.difficulty && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "py-0 text-[10px]",
                              question.difficulty === "EASY" &&
                                "bg-green-500/10 text-green-500 border-green-500/20",
                              question.difficulty === "MEDIUM" &&
                                "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                              question.difficulty === "HARD" &&
                                "bg-red-500/10 text-red-500 border-red-500/20",
                            )}
                          >
                            {question.difficulty}
                          </Badge>
                        )}
                        {question.tags &&
                          question.tags.map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="border-[#3e3e3e] text-[10px] py-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none text-[#eff1f6cc]">
                      <p className="whitespace-pre-wrap">
                        {question.problemStatement}
                      </p>
                    </div>

                    {(question.timeLimitSecs || question.memoryLimitMb) && (
                      <div className="flex gap-4 text-xs font-semibold text-[#eff1f6cc]/60 border-y border-[#3e3e3e] py-3">
                        {question.timeLimitSecs && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Time Limit:{" "}
                            {question.timeLimitSecs}s
                          </div>
                        )}
                        {question.memoryLimitMb && (
                          <div className="flex items-center gap-1">
                            <Database className="w-3 h-3" /> Memory Limit:{" "}
                            {question.memoryLimitMb}MB
                          </div>
                        )}
                      </div>
                    )}

                    {question.constraints && (
                      <div className="space-y-2">
                        <div className="text-sm font-bold text-white">
                          Constraints
                        </div>
                        <div className="text-xs bg-[#1a1a1a] p-3 rounded border border-[#3e3e3e] font-mono text-[#eff1f6cc]">
                          {question.constraints}
                        </div>
                      </div>
                    )}

                    {question.testCases.filter((tc) => !tc.isHidden).length >
                      0 && (
                      <div className="space-y-4">
                        <div className="text-sm font-bold text-white">
                          Examples
                        </div>
                        {question.testCases
                          .filter((tc) => !tc.isHidden)
                          .map((ex, idx) => (
                            <div
                              key={idx}
                              className="space-y-2 border-l-2 border-primary/30 pl-4 py-1"
                            >
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg bg-[#1a1a1a] p-3 border border-[#3e3e3e]">
                                  <div className="text-[10px] font-bold text-[#eff1f6cc]/40 mb-1 uppercase">
                                    Input
                                  </div>
                                  <pre className="text-xs font-mono">
                                    {ex.input}
                                  </pre>
                                </div>
                                <div className="rounded-lg bg-[#1a1a1a] p-3 border border-[#3e3e3e]">
                                  <div className="text-[10px] font-bold text-[#eff1f6cc]/40 mb-1 uppercase">
                                    Output
                                  </div>
                                  <pre className="text-xs font-mono">
                                    {ex.expected}
                                  </pre>
                                </div>
                              </div>
                              {ex.explanation && (
                                <div className="text-xs text-[#eff1f6cc]/70 italic">
                                  <span className="font-semibold non-italic">
                                    Explanation:
                                  </span>{" "}
                                  {ex.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}

                    {question.hints && question.hints.length > 0 && (
                      <div className="space-y-2 pb-8">
                        <div className="text-sm font-bold text-white flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          Hints
                        </div>
                        <div className="space-y-2">
                          {question.hints.map((hint, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-yellow-500/5 p-3 rounded border border-yellow-500/10 text-[#eff1f6cc]"
                            >
                              <span className="font-bold text-yellow-500 mr-2">
                                Hint {idx + 1}:
                              </span>
                              {hint}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white">
                        Sample Test Cases
                      </h4>
                      {question.testCases
                        .filter((tc) => !tc.isHidden)
                        .map((tc, idx) => (
                          <div
                            key={idx}
                            className="bg-[#1a1a1a] p-4 rounded-lg border border-[#3e3e3e] shadow-sm"
                          >
                            <div className="font-mono text-xs space-y-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-blue-400 font-bold uppercase text-[10px]">
                                  Input
                                </span>
                                <pre className="bg-[#222] p-2 rounded">
                                  {tc.input}
                                </pre>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-green-400 font-bold uppercase text-[10px]">
                                  Expected Output
                                </span>
                                <pre className="bg-[#222] p-2 rounded">
                                  {tc.expected}
                                </pre>
                              </div>
                              {tc.weight && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#3e3e3e]">
                                  <span className="text-yellow-400 font-bold uppercase text-[10px]">
                                    Weight:
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="h-5 text-[10px] bg-yellow-500/10 text-yellow-500 border-none"
                                  >
                                    {tc.weight}%
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      {question.testCases.filter((tc) => !tc.isHidden)
                        .length === 0 && (
                        <div className="text-muted-foreground text-sm py-4 text-center border-2 border-dashed border-[#3e3e3e] rounded-lg">
                          No sample test cases available
                        </div>
                      )}
                    </div>

                    {question.testCases.filter((tc) => tc.isHidden).length >
                      0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Lock className="w-4 h-4 text-primary" />
                          Hidden Test Cases
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {question.testCases
                            .filter((tc) => tc.isHidden)
                            .map((tc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-[#1a1a1a]/50 p-3 rounded border border-dashed border-[#3e3e3e]"
                              >
                                <span className="text-xs text-[#eff1f6cc]">
                                  Hidden Case #{idx + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-[#3e3e3e]"
                                >
                                  {tc.weight || 0}% weight
                                </Badge>
                              </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          Total of{" "}
                          {
                            question.testCases.filter((tc) => tc.isHidden)
                              .length
                          }{" "}
                          hidden test cases will be used for final automated
                          evaluation.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-[#3e3e3e] hover:bg-primary transition-colors w-1 cursor-col-resize">
              <div className="w-full h-8 bg-[#555] rounded-full mx-auto" />
            </ResizableHandle>

            <ResizablePanel
              defaultSize={60}
              minSize={30}
              className="flex flex-col bg-[#1a1a1a]"
            >
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#3e3e3e] bg-[#282828]">
                <select
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    const snippet = question.codeSnippets?.find(
                      (s) => s.langSlug === newLang,
                    );
                    if (snippet) setCode(snippet.code);
                  }}
                  className="h-7 px-2 rounded bg-[#333] border-none text-xs text-[#eff1f6cc] capitalize"
                >
                  {question.codeSnippets?.map((snippet) => (
                    <option key={snippet.langSlug} value={snippet.langSlug}>
                      {snippet.lang}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 text-xs text-[#eff1f6cc] hover:text-white hover:bg-[#333] transition-all",
                      (isExecuting || isSubmitting) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    onClick={handleRunCode}
                    disabled={isExecuting || isSubmitting}
                  >
                    {isExecuting ? (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1.5 animate-spin" />
                        Running...
                      </span>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1.5 text-primary" />
                        Run Code
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      "h-7 text-xs font-semibold bg-primary hover:bg-primary/90 text-white transition-all active:scale-95",
                      (isExecuting || isSubmitting) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    onClick={handleSubmitCode}
                    disabled={isExecuting || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1.5" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <ResizablePanelGroup direction="vertical" className="flex-1">
                <ResizablePanel defaultSize={65} className="flex flex-col">
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={
                        language === "python3"
                          ? "python"
                          : language === "javascript"
                            ? "javascript"
                            : language === "cpp"
                              ? "cpp"
                              : "java"
                      }
                      value={code}
                      onChange={(v) => setCode(v || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </ResizablePanel>

                <ResizablePanel
                  defaultSize={35}
                  minSize={15}
                  className="bg-[#1e1e1e] flex flex-col border-t border-[#3e3e3e]"
                >
                  <div className="flex items-center justify-between border-b border-[#3e3e3e] bg-[#282828] px-2">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab("console")}
                        className={cn(
                          "px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                          activeTab === "console"
                            ? "text-primary border-b-2 border-primary"
                            : "text-[#eff1f6cc] hover:text-white",
                        )}
                      >
                        Console
                      </button>
                      <button
                        onClick={() => setActiveTab("testcases")}
                        className={cn(
                          "px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                          activeTab === "testcases"
                            ? "text-primary border-b-2 border-primary"
                            : "text-[#eff1f6cc] hover:text-white",
                        )}
                      >
                        Test Results
                      </button>
                    </div>
                    {verdict && (
                      <div
                        className={cn(
                          "flex items-center gap-2 mr-4 px-3 py-1 rounded animate-in fade-in zoom-in duration-300",
                          verdict.type === "success"
                            ? "bg-success/20 text-success border border-success/30"
                            : "bg-destructive/20 text-destructive border border-destructive/30",
                        )}
                      >
                        {verdict.type === "success" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span className="text-sm font-bold">
                          {verdict.title}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#0d0d0d]">
                    {activeTab === "console" ? (
                      <div className="space-y-4">
                        {submissionPhase !== "idle" &&
                          submissionPhase !== "result" && (
                            <div className="flex flex-col gap-2 p-4 bg-[#1a1a1a] rounded border border-primary/20 animate-pulse">
                              <div className="flex items-center gap-3 text-primary">
                                <Terminal className="w-4 h-4" />
                                <span className="text-sm font-bold uppercase tracking-widest">
                                  {submissionPhase === "compiling"
                                    ? "Compiling..."
                                    : submissionPhase === "samples"
                                      ? "Running Sample Tests..."
                                      : "Running Hidden Tests..."}
                                </span>
                              </div>
                              <div className="h-1 bg-[#333] rounded overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full bg-primary transition-all duration-1000",
                                    submissionPhase === "compiling"
                                      ? "w-1/3"
                                      : submissionPhase === "samples"
                                        ? "w-2/3"
                                        : "w-full",
                                  )}
                                />
                              </div>
                            </div>
                          )}

                        {verdict && (
                          <div
                            className={cn(
                              "p-6 rounded-lg border flex flex-col items-center justify-center text-center gap-3 mb-6 animate-in slide-in-from-bottom duration-500",
                              verdict.type === "success"
                                ? "bg-green-500/5 border-green-500/20"
                                : "bg-red-500/5 border-red-500/20",
                            )}
                          >
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                                verdict.type === "success"
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500",
                              )}
                            >
                              {verdict.type === "success" ? (
                                <Trophy className="w-6 h-6" />
                              ) : (
                                <AlertTriangle className="w-6 h-6" />
                              )}
                            </div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">
                              {verdict.title}
                            </h1>
                            <p className="text-[#eff1f6cc] font-medium">
                              {verdict.message}
                            </p>
                          </div>
                        )}

                        <pre className="whitespace-pre-wrap p-5 bg-[#1a1a1a] rounded border border-white/5 text-[#d1d5db]">
                          {consoleOutput || "Ready to run code..."}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {testCaseResults.map((res, i) => {
                          const isPassed =
                            res.id === 3 && isCorrect(res.output, res.expected);
                          return (
                            <div
                              key={i}
                              className={cn(
                                "p-3 rounded-lg border",
                                isPassed
                                  ? "bg-green-500/10 border-green-500/20"
                                  : "bg-red-500/10 border-red-500/20",
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">
                                  {res.isHidden
                                    ? "Hidden Test"
                                    : `Test Case ${i + 1}`}
                                </span>
                                {isPassed ? (
                                  <span className="text-green-500 text-xs font-bold">
                                    ✓ PASSED
                                  </span>
                                ) : (
                                  <span className="text-red-500 text-xs font-bold">
                                    ✗ FAILED
                                  </span>
                                )}
                              </div>
                              {!res.isHidden && !isPassed && (
                                <div className="mt-2 text-xs space-y-1">
                                  <div>Expected: {res.expected}</div>
                                  <div>Got: {res.output}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {testCaseResults.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            Run your code to see test results
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
