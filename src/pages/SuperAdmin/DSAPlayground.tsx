import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  Tag,
  Lightbulb,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  testService,
  Question,
  TestCase,
  CodeExecutionResponse,
  TestCaseResult,
  GradingResult,
} from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { mapFriendlyError, QuestionMetadata, ProblemType } from "@/lib/judge0";
import { useAuth } from "@/lib/auth-context";
import { ROLES } from "@/lib/roles";
import { mapBackendToFrontendLang } from "../../types/question";

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

interface ExecutionResultItem {
  status: string;
  actualOutput?: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  expectedOutput?: string;
}

interface PlaygroundExecutionResponse {
  data: ExecutionResultItem[];
}

export default function DSAPlayground() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const backRoute =
    user?.role === ROLES.SUPERADMIN && location.pathname.includes("/superadmin")
      ? "/superadmin/questions"
      : "/admin/library";

  const [question, setQuestion] = useState<QuestionUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python3");
  const [activeTab, setActiveTab] = useState("description");
  const [showTopics, setShowTopics] = useState(false);
  const [showHints, setShowHints] = useState(false);
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

        // Dynamic fallback: ensure 2-3 sample and 6-7 hidden test cases are present if DB has none
        if (testCasesData.length === 0) {
          const pText = `${backendQuestion.prompt || ""}\n${backendQuestion.sampleExplanation || ""}\n${backendQuestion.constraints || ""}`;
          const pLower = (backendQuestion.title || backendQuestion.prompt || "").toLowerCase();

          // 1. Try regex extraction of Examples from prompt
          const exampleRegex = /(?:Example\s*(\d+)|\*\*Example\s*(\d+)\*\*|###\s*Example\s*(\d+))[\s\S]*?(?:Input|\*\*Input:\*\*)\s*[:\.]?\s*`?([^`\n\r]+)`?[\s\S]*?(?:Output|\*\*Output:\*\*)\s*[:\.]?\s*`?([^`\n\r]+)`?(?:[\s\S]*?(?:Explanation|\*\*Explanation:\*\*)\s*[:\.]?\s*([^\n\r]+))?/gi;
          let match;
          while ((match = exampleRegex.exec(pText)) !== null && testCasesData.length < 3) {
            const rawIn = match[4]?.trim();
            const rawOut = match[5]?.trim();
            const rawExp = match[6]?.trim();
            if (rawIn && rawOut) {
              testCasesData.push({
                input: rawIn.replace(/^nums\s*=\s*/i, "").replace(/^coins\s*=\s*/i, "").trim(),
                expected: rawOut.trim(),
                isHidden: false,
                weight: 10,
                explanation: rawExp || undefined,
              });
            }
          }

          // 2. If fewer than 2 sample test cases, add topic-specific sample cases
          if (testCasesData.filter((t) => !t.isHidden).length < 2) {
            if (pLower.includes("coin") || pLower.includes("change")) {
              testCasesData.push(
                { input: "[1, 2, 5]\n11", expected: "3", isHidden: false, weight: 10, explanation: "11 = 5 + 5 + 1 (3 coins)" },
                { input: "[2]\n3", expected: "-1", isHidden: false, weight: 10, explanation: "Cannot make amount 3 with denomination 2" },
                { input: "[1]\n0", expected: "0", isHidden: false, weight: 10, explanation: "0 amount requires 0 coins" }
              );
            } else if (pLower.includes("subarray") || pLower.includes("sliding") || pLower.includes("k elements")) {
              testCasesData.push(
                { input: "[2, 1, 5, 1, 3, 2]\n3", expected: "9", isHidden: false, weight: 10, explanation: "Subarray [5, 1, 3] gives max sum 9" },
                { input: "[2, 3, 4, 1, 5]\n2", expected: "7", isHidden: false, weight: 10, explanation: "Subarray [3, 4] gives sum 7" },
                { input: "[1, 2, 3]\n1", expected: "3", isHidden: false, weight: 10, explanation: "Max single element is 3" }
              );
            } else {
              testCasesData.push(
                { input: "[2, 7, 11, 15]\n9", expected: "[0, 1]", isHidden: false, weight: 10, explanation: "nums[0] + nums[1] == 9" },
                { input: "[3, 2, 4]\n6", expected: "[1, 2]", isHidden: false, weight: 10, explanation: "nums[1] + nums[2] == 6" },
                { input: "[3, 3]\n6", expected: "[0, 1]", isHidden: false, weight: 10, explanation: "nums[0] + nums[1] == 6" }
              );
            }
          }

          // 3. Add 6-7 hidden test cases for robust test runner execution
          if (pLower.includes("coin") || pLower.includes("change")) {
            testCasesData.push(
              { input: "[1, 3, 4, 5]\n7", expected: "2", isHidden: true, weight: 10 },
              { input: "[186, 419, 83, 408]\n6249", expected: "20", isHidden: true, weight: 10 },
              { input: "[2, 4, 6, 8]\n15", expected: "-1", isHidden: true, weight: 10 },
              { input: "[1]\n10000", expected: "10000", isHidden: true, weight: 10 },
              { input: "[1, 2, 5, 10, 20, 50, 100]\n999", expected: "14", isHidden: true, weight: 10 },
              { input: "[3, 7, 405, 436]\n8839", expected: "25", isHidden: true, weight: 10 },
              { input: "[2, 5, 10, 1]\n27", expected: "4", isHidden: true, weight: 10 }
            );
          } else if (pLower.includes("subarray") || pLower.includes("sliding") || pLower.includes("k elements")) {
            testCasesData.push(
              { input: "[-1, -2, -3, -4]\n2", expected: "-3", isHidden: true, weight: 10 },
              { input: "[10, 20, 30, 40, 50]\n5", expected: "150", isHidden: true, weight: 10 },
              { input: "[1, 4, 2, 10, 23, 3, 1, 0, 20]\n4", expected: "39", isHidden: true, weight: 10 },
              { input: "[100, 200, 300, 400]\n2", expected: "700", isHidden: true, weight: 10 },
              { input: "[5, -10, 20, -5, 30, 40]\n3", expected: "65", isHidden: true, weight: 10 },
              { input: "[0, 0, 0, 0, 0]\n3", expected: "0", isHidden: true, weight: 10 },
              { input: "[9, 1, 8, 2, 7, 3, 6, 4, 5]\n3", expected: "18", isHidden: true, weight: 10 }
            );
          } else {
            testCasesData.push(
              { input: "[1, 5, 9, 13, 17]\n22", expected: "[1, 3]", isHidden: true, weight: 10 },
              { input: "[-3, 4, 3, 90]\n0", expected: "[0, 2]", isHidden: true, weight: 10 },
              { input: "[0, 4, 3, 0]\n0", expected: "[0, 3]", isHidden: true, weight: 10 },
              { input: "[-1, -2, -3, -4, -5]\n-8", expected: "[2, 4]", isHidden: true, weight: 10 },
              { input: "[1000000, 500, 2000000]\n3000000", expected: "[0, 2]", isHidden: true, weight: 10 },
              { input: "[2, 5, 5, 11]\n10", expected: "[1, 2]", isHidden: true, weight: 10 },
              { input: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n19", expected: "[8, 9]", isHidden: true, weight: 10 }
            );
          }

          // Balance weights to sum exactly 100
          const count = testCasesData.length;
          const bW = Math.floor(100 / count);
          const rem = 100 - bW * count;
          testCasesData = testCasesData.map((tc, idx) => ({
            ...tc,
            weight: bW + (idx === 0 ? rem : 0),
          }));
        }

        // Map backend starterCode or languageTemplates to frontend-friendly keys
        const processedStarterCode: Record<string, string> = {};
        if (backendQuestion.starterCode) {
          Object.entries(backendQuestion.starterCode).forEach(([lang, val]) => {
            const frontendLang = mapBackendToFrontendLang(lang);
            processedStarterCode[frontendLang] = val as string;
          });
        } else if (backendQuestion.languageTemplates) {
          Object.entries(backendQuestion.languageTemplates).forEach(([lang, data]) => {
            const frontendLang = mapBackendToFrontendLang(lang);
            processedStarterCode[frontendLang] = (data as { template: string }).template || "";
          });
        }

        // Create code snippets
        codeSnippetsData = [
          {
            code: processedStarterCode["python3"] || getDefaultCode("python3", backendQuestion.prompt),
            lang: "Python 3",
            langSlug: "python3",
          },
          {
            code: processedStarterCode["javascript"] || getDefaultCode("javascript", backendQuestion.prompt),
            lang: "JavaScript",
            langSlug: "javascript",
          },
          {
            code: processedStarterCode["java"] || getDefaultCode("java", backendQuestion.prompt),
            lang: "Java",
            langSlug: "java",
          },
          {
            code: processedStarterCode["cpp"] || getDefaultCode("cpp", backendQuestion.prompt),
            lang: "C++",
            langSlug: "cpp",
          },
        ];

        // Find first available snippet from custom template or default to python3
        const firstAvailableSnippet = codeSnippetsData.find(s => processedStarterCode[s.langSlug]) || codeSnippetsData[0];
        setLanguage(firstAvailableSnippet.langSlug);
        setCode(firstAvailableSnippet.code);
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
          category: ProblemType.ARRAY,
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
    } else {
      // Fallback: Fetch questions from question bank and load first coding question, or default template
      async function loadDefaultQuestion() {
        try {
          setLoading(true);
          const allQuestions = await testService.getAllQuestions();
          const firstCoding = allQuestions.find((q) => q.questionType === "CODING");
          if (firstCoding) {
            const tc = await testService.getTestCasesByCodingQuestion(firstCoding.id);
            const sampleInput = tc.find((t) => t.sample)?.input || tc[0]?.input || "nums = [2, 7, 11, 15], target = 9";
            const sampleOutput = tc.find((t) => t.sample)?.expectedOutput || tc[0]?.expectedOutput || "[0, 1]";

            setQuestion({
              id: firstCoding.id,
              type: "coding",
              question: firstCoding.prompt,
              title: firstCoding.title || "Two Sum - Algorithmic Sandbox",
              difficulty: firstCoding.difficulty || "MEDIUM",
              constraints: firstCoding.constraints || "2 <= nums.length <= 10^4",
              hints: firstCoding.hints || ["Use a hash map to look up complements in O(1) time."],
              problemStatement: firstCoding.prompt,
              sampleInput,
              sampleOutput,
              testCases: tc.map((t) => ({ input: t.input, expected: t.expectedOutput, isHidden: !t.sample })),
              marks: firstCoding.marks || 10,
              codeSnippets: [
                { code: getDefaultCode("python3", firstCoding.prompt), lang: "Python 3", langSlug: "python3" },
                { code: getDefaultCode("javascript", firstCoding.prompt), lang: "JavaScript", langSlug: "javascript" },
                { code: getDefaultCode("java", firstCoding.prompt), lang: "Java", langSlug: "java" },
                { code: getDefaultCode("cpp", firstCoding.prompt), lang: "C++", langSlug: "cpp" },
              ]
            });
            setCode(getDefaultCode("python3", firstCoding.prompt));
          } else {
            // Default sample DSA question if bank is empty
            const defaultPrompt = "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.";
            setQuestion({
              id: "sample-two-sum",
              type: "coding",
              question: defaultPrompt,
              title: "Two Sum Sandbox",
              difficulty: "EASY",
              constraints: "2 <= nums.length <= 10^4",
              hints: ["Try using a Hash Table to store numbers seen so far."],
              problemStatement: defaultPrompt,
              sampleInput: "nums = [2, 7, 11, 15], target = 9",
              sampleOutput: "[0, 1]",
              testCases: [{ input: "[2, 7, 11, 15]\n9", expected: "[0, 1]", isHidden: false }],
              marks: 10,
              codeSnippets: [
                { code: getDefaultCode("python3", defaultPrompt), lang: "Python 3", langSlug: "python3" },
                { code: getDefaultCode("javascript", defaultPrompt), lang: "JavaScript", langSlug: "javascript" },
              ]
            });
            setCode(getDefaultCode("python3", defaultPrompt));
          }
        } catch {
          // Fallback static question
          const defaultPrompt = "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.";
          setQuestion({
            id: "sample-two-sum",
            type: "coding",
            question: defaultPrompt,
            title: "Two Sum Sandbox",
            difficulty: "EASY",
            constraints: "2 <= nums.length <= 10^4",
            hints: ["Try using a Hash Table to store numbers seen so far."],
            problemStatement: defaultPrompt,
            sampleInput: "nums = [2, 7, 11, 15], target = 9",
            sampleOutput: "[0, 1]",
            testCases: [{ input: "[2, 7, 11, 15]\n9", expected: "[0, 1]", isHidden: false }],
            marks: 10,
          });
          setCode(getDefaultCode("python3", defaultPrompt));
        } finally {
          setLoading(false);
        }
      }
      loadDefaultQuestion();
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
        questionId: question.id,
        language: backendLanguage,
        sourceCode: code,
      };

      const response = await apiClient.post<PlaygroundExecutionResponse>(
        "/api/code/execute/playground",
        requestBody,
      );
      console.log("Run Code Response:", response.data);
      const resultsArray = Array.isArray(response.data.data)
        ? response.data.data
        : [];

      const statusToId: Record<string, number> = {
        ACCEPTED: 3,
        WRONG_ANSWER: 4,
        TIME_LIMIT_EXCEEDED: 5,
        COMPILATION_ERROR: 6,
        RUNTIME_ERROR: 7,
        INTERNAL_ERROR: 13,
      };

      const sampleCases = question.testCases.filter((tc) => !tc.isHidden);
      const mappedResults = resultsArray.map(
        (res: ExecutionResultItem, idx: number) => ({
          status: res.status,
          input: sampleCases[idx]?.input || "",
          output:
            res.actualOutput ||
            res.stdout ||
            res.stderr ||
            res.compileOutput ||
            "",
          expected: res.expectedOutput || sampleCases[idx]?.expected || "",
          isHidden: false,
          id: statusToId[res.status] || 4,
        }),
      );

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
          message =
            resultsArray[0]?.compileOutput ||
            resultsArray[0]?.stderr ||
            "Compilation failed";
        } else if (topLevelId === 5) {
          title = "Time Limit Exceeded";
          message = "Your code took too long to run.";
        } else if (topLevelId === 4) {
          title = "Wrong Answer";
          message = "Logic failed on sample case.";
        } else if (topLevelId >= 7) {
          title = "Runtime Error";
          message =
            resultsArray.find(
              (r: ExecutionResultItem) => r.status !== "ACCEPTED",
            )?.stderr || "Runtime error";
        }

        const friendlyHint = mapFriendlyError(message, language);
        if (friendlyHint) {
          message = friendlyHint + "\n\nOriginal Error:\n" + message;
        }

        setVerdict({ type, title, message });
        setSubmissionPhase("result");
      } else {
        const passedCount = resultsArray.filter(
          (r: ExecutionResultItem) => r.status === "ACCEPTED",
        ).length;
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
    } catch (error: unknown) {
      console.error("Judge0 Error:", error);
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      const isRateLimit = err.response?.status === 429;
      if (isRateLimit) {
        toast({
          title: "Rate Limit Exceeded",
          description:
            err.response?.data?.message ||
            "Code execution limit: 10 requests/minute. Try again in 60 seconds.",
          variant: "destructive",
        });
      }
      const errMsg = err.response?.data?.message || "Something went wrong. Please try again.";
      setVerdict({
        type: "error",
        title: isRateLimit ? "Rate Limit Exceeded" : "System Error",
        message: errMsg,
      });
      setConsoleOutput((prev) => prev + `\n> Error: ${errMsg}\n`);
      setSubmissionPhase("result");
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
      const requestBody = {
        questionId: question.id,
        language: backendLanguage,
        sourceCode: code,
        runAll: true,
      };

      const response = await apiClient.post<PlaygroundExecutionResponse>(
        "/api/code/execute/playground",
        requestBody,
      );
      console.log("Submit Code Response:", response.data);
      const resultsArray = Array.isArray(response.data.data)
        ? response.data.data
        : [];

      const statusToId: Record<string, number> = {
        ACCEPTED: 3,
        WRONG_ANSWER: 4,
        TIME_LIMIT_EXCEEDED: 5,
        COMPILATION_ERROR: 6,
        RUNTIME_ERROR: 7,
        INTERNAL_ERROR: 13,
      };

      const testCases = question.testCases;
      const mappedResults = resultsArray.map(
        (res: ExecutionResultItem, idx: number) => ({
          status: res.status,
          input: testCases[idx]?.input || "",
          output:
            res.actualOutput ||
            res.stdout ||
            res.stderr ||
            res.compileOutput ||
            "",
          expected: res.expectedOutput || testCases[idx]?.expected || "",
          isHidden: !!testCases[idx]?.isHidden,
          id: statusToId[res.status] || 4,
        }),
      );

      setTestCaseResults(mappedResults);
      setConsoleOutput("> Verification finished.\n");

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
          title = "Compilation Failed";
          message =
            resultsArray[0]?.compileOutput ||
            resultsArray[0]?.stderr ||
            "Compilation failed";
        } else if (topLevelId === 5) {
          title = "Time Limit Exceeded";
          message = "Your code took too long to run.";
        } else if (topLevelId === 4) {
          title = "Wrong Answer";
          message = "Failed on test cases.";
        } else if (topLevelId >= 7) {
          title = "Runtime Error";
          message =
            resultsArray.find(
              (r: ExecutionResultItem) => r.status !== "ACCEPTED",
            )?.stderr || "Runtime error";
        }

        const friendlyHint = mapFriendlyError(message, language);
        if (friendlyHint) {
          message = friendlyHint + "\n\nOriginal Error:\n" + message;
        }

        setVerdict({ type, title, message });
        setSubmissionPhase("result");
      } else {
        const passedCount = resultsArray.filter(
          (r: ExecutionResultItem) => r.status === "ACCEPTED",
        ).length;
        const totalCount = resultsArray.length;
        setConsoleOutput(
          (prev) =>
            prev +
            `> Verification Results: ${passedCount}/${totalCount} Passed\n`,
        );

        if (passedCount > 0 && passedCount < totalCount) {
          setVerdict({
            type: "fail",
            title: "Wrong Answer",
            message: `Failed on some hidden cases.`,
          });
        } else if (passedCount > 0) {
          setVerdict({
            type: "success",
            title: "Accepted",
            message: `All test cases passed! (${passedCount}/${totalCount})`,
          });
          toast({
            title: "Success!",
            description: `Solution accepted! (${passedCount}/${totalCount})`,
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
    } catch (error: unknown) {
      console.error("Submission error:", error);
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const isRateLimit = err.response?.status === 429;
      if (isRateLimit) {
        toast({
          title: "Rate Limit Exceeded",
          description:
            err.response?.data?.message ||
            "Code execution limit: 10 requests/minute. Try again in 60 seconds.",
          variant: "destructive",
        });
      }
      const errMsg = err.response?.data?.message || err.message || "Failed to process submission.";
      setVerdict({
        type: "error",
        title: isRateLimit ? "Rate Limit Exceeded" : "System Error",
        message: errMsg,
      });
      setConsoleOutput((prev) => prev + `\n> Verification Error: ${errMsg}\n`);
      setSubmissionPhase("result");
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
          <Button onClick={() => navigate(backRoute)}>
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
            onClick={() => navigate(backRoute)}
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
                    {/* Title + Solved Status */}
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          {question.title || question.question}
                        </h2>
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Solved</span>
                        </div>
                      </div>

                      {/* LeetCode Meta Pills */}
                      <div className="flex flex-wrap items-center gap-2 mb-5">
                        {/* Difficulty Pill */}
                        {question.difficulty && (
                          <span
                            className={cn(
                              "text-xs font-semibold px-3 py-0.5 rounded-full",
                              question.difficulty.toUpperCase() === "EASY" &&
                                "bg-[#2cbb5d]/15 text-[#2cbb5d] border border-[#2cbb5d]/30",
                              question.difficulty.toUpperCase() === "MEDIUM" &&
                                "bg-[#ffc01e]/15 text-[#ffc01e] border border-[#ffc01e]/30",
                              question.difficulty.toUpperCase() === "HARD" &&
                                "bg-[#ef4743]/15 text-[#ef4743] border border-[#ef4743]/30"
                            )}
                          >
                            {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1).toLowerCase()}
                          </span>
                        )}

                        {/* Topics Pill */}
                        <button
                          onClick={() => setShowTopics((v) => !v)}
                          className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                            showTopics
                              ? "bg-[#404040] text-white border-slate-500"
                              : "bg-[#2e2e2e] text-slate-300 border-slate-700/80 hover:bg-[#383838]"
                          }`}
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>Topics</span>
                          {question.tags && question.tags.length > 0 && (
                            <span className="text-[10px] text-slate-400">({question.tags.length})</span>
                          )}
                        </button>

                        {/* Companies Pill */}
                        <button
                          className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-[#2e2e2e] text-slate-300 border border-slate-700/80 hover:bg-[#383838] transition-colors cursor-pointer"
                        >
                          <Lock className="w-3 h-3 text-amber-400/80" />
                          <span>Companies</span>
                        </button>

                        {/* Hint Pill */}
                        <button
                          onClick={() => setShowHints((v) => !v)}
                          className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                            showHints
                              ? "bg-[#404040] text-white border-slate-500"
                              : "bg-[#2e2e2e] text-slate-300 border-slate-700/80 hover:bg-[#383838]"
                          }`}
                        >
                          <Lightbulb className="w-3 h-3 text-yellow-400" />
                          <span>Hint</span>
                          {question.hints && question.hints.length > 0 && (
                            <span className="text-[10px] text-slate-400">({question.hints.length})</span>
                          )}
                        </button>

                        {/* Marks */}
                        <span className="text-xs font-medium text-slate-400 ml-auto font-mono">
                          {question.marks} marks
                        </span>
                      </div>

                      {/* Expandable Topics Chips */}
                      {showTopics && question.tags && question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-[#1f1f1f] border border-slate-800 mb-4 animate-in fade-in">
                          {question.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2.5 py-0.5 rounded-md bg-[#2d2d2d] text-slate-300 border border-slate-700/60 font-mono"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expandable Hints */}
                      {showHints && question.hints && question.hints.length > 0 && (
                        <div className="space-y-2 p-3 rounded-lg bg-[#1f1f1f] border border-yellow-500/20 mb-4 animate-in fade-in">
                          {question.hints.map((hint, idx) => (
                            <div key={idx} className="text-xs text-slate-300">
                              <span className="font-bold text-yellow-400 mr-1.5">Hint {idx + 1}:</span>
                              {hint}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Problem Statement Body */}
                    <div className="text-sm leading-relaxed text-[#eff1f6cc] space-y-3">
                      <div className="whitespace-pre-wrap">
                        {question.problemStatement || question.question}
                      </div>
                    </div>

                    {/* Example Blocks (LeetCode Single Dark Cards) */}
                    {question.testCases.filter((tc) => !tc.isHidden).length > 0 && (
                      <div className="space-y-4 pt-1">
                        {question.testCases
                          .filter((tc) => !tc.isHidden)
                          .map((ex, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="text-xs font-bold text-white">
                                Example {idx + 1}:
                              </div>
                              <div className="rounded-lg bg-[#222222] border-l-2 border-slate-500 p-3.5 text-xs font-mono text-[#eff1f6] leading-relaxed space-y-1.5 shadow-inner">
                                <div>
                                  <span className="font-bold text-slate-300">Input: </span>
                                  <span className="text-slate-100">{ex.input}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-300">Output: </span>
                                  <span className="text-slate-100">{ex.expected}</span>
                                </div>
                                {ex.explanation && (
                                  <div>
                                    <span className="font-bold text-slate-300">Explanation: </span>
                                    <span className="text-slate-300 font-sans">{ex.explanation}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Constraints Section */}
                    {question.constraints && (
                      <div className="space-y-2.5 pt-2">
                        <div className="text-xs font-bold text-white">
                          Constraints:
                        </div>
                        <ul className="space-y-2 text-xs text-[#eff1f6cc]">
                          {question.constraints.split("\n").filter(Boolean).map((line, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-slate-500 text-sm leading-none mt-0.5">•</span>
                              <code className="bg-[#2d2d2d] text-white px-2 py-0.5 rounded font-mono text-xs border border-slate-700/50">
                                {line.trim()}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Follow-up Section */}
                    <div className="text-xs text-[#eff1f6cc] pt-4 pb-4 border-t border-[#333]">
                      <span className="font-bold text-white">Follow-up: </span>
                      Can you come up with an algorithm that is less than{" "}
                      <code className="bg-[#2d2d2d] text-white px-1.5 py-0.5 rounded font-mono text-xs">
                        O(n²)
                      </code>{" "}
                      time complexity?
                    </div>
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
                                  className="text-[10px] border-orange-500/30 text-orange-300 bg-orange-500/5"
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
