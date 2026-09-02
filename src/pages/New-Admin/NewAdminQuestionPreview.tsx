import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Check,
  AlertCircle,
  Terminal,
  Code2,
  CheckCircle2,
  Info,
  Loader2,
  Edit,
  Play,
  RotateCcw,
  Sparkles,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/lib/auth-context";
import { testService, Question, McqOption, McqType } from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { mapFrontendToBackendLang } from "@/types/question";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

const fmtMcqType = (t?: string) => {
  if (!t) return "Single Choice";
  switch (t.toUpperCase()) {
    case "SINGLE_CORRECT":
      return "Single Choice";
    case "MULTIPLE_CORRECT":
      return "Multiple Choice";
    case "TRUE_FALSE":
      return "True / False";
    case "ASSERTION_REASON":
      return "Assertion Reason";
    case "FILL_IN_THE_BLANK":
      return "Fill in Blank";
    default:
      return t;
  }
};

const DifficultyIcon = ({ level }: { level?: string }) => {
  const diff = (level || "").toUpperCase();
  const count = diff === "EASY" ? 1 : diff === "HARD" ? 3 : 2;
  return (
    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="9" width="2.5" height="5" opacity={count >= 1 ? 0.9 : 0.25} />
      <rect x="6.75" y="5" width="2.5" height="9" rx="0.5" opacity={count >= 2 ? 0.9 : 0.25} />
      <rect x="11.5" y="2" width="2.5" height="12" opacity={count >= 3 ? 0.9 : 0.25} />
    </svg>
  );
};

const getDefaultCode = (language: string, questionTitle?: string): string => {
  const defaultCodes: Record<string, string> = {
    python3: `# ${questionTitle || "Write your solution here"}

def solve():
    import sys
    data = sys.stdin.read()
    # Your code here
    print(data)

if __name__ == "__main__":
    solve()
`,
    javascript: `// ${questionTitle || "Write your solution here"}

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
    java: `// ${questionTitle || "Write your solution here"}

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
    cpp: `// ${questionTitle || "Write your solution here"}

#include <iostream>
#include <string>

using namespace std;

int main() {
    string line, input;
    while (getline(cin, line)) {
        input += line + "\\n";
    }
    // Your code here
    cout << input;
    return 0;
}
`,
  };
  return defaultCodes[language] || defaultCodes["python3"];
};

const getMonacoLanguage = (lang: string): string => {
  switch (lang) {
    case "python3":
    case "python":
      return "python";
    case "javascript":
      return "javascript";
    case "java":
      return "java";
    case "cpp":
      return "cpp";
    default:
      return "plaintext";
  }
};

interface TestCaseResultUI {
  status: string;
  input: string;
  output: string;
  expected: string;
  compileOutput?: string;
  stderr?: string;
  executionTimeMs?: number;
}

export default function NewAdminQuestionPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [question, setQuestion] = useState<Question | null>(
    (location.state as Question) || null
  );
  const [loading, setLoading] = useState(!location.state && !!id);
  const [error, setError] = useState<string | null>(null);

  // Candidate interactive preview state (MCQ)
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<number[]>([]);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // Coding interactive preview state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("python3");
  const [code, setCode] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testCaseResults, setTestCaseResults] = useState<TestCaseResultUI[]>([]);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string>("");

  useEffect(() => {
    if (id && (!question || question.id !== id)) {
      setLoading(true);
      testService
        .getQuestionById(id)
        .then((data) => {
          if (data) {
            setQuestion(data);
          } else {
            setError("Question not found.");
          }
        })
        .catch((err) => {
          console.error("Failed to load question preview", err);
          setError("Failed to load question details.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  // Load initial template when question or language changes
  useEffect(() => {
    if (question && (question.questionType ?? "").toUpperCase() === "CODING") {
      const templates = question.languageTemplates || {};
      const langKey = selectedLanguage === "python3" ? "python" : selectedLanguage;
      const tpl =
        templates[selectedLanguage]?.template ||
        templates[langKey]?.template ||
        (question.codeTemplate && (question.codeTemplate[selectedLanguage]?.code || question.codeTemplate[langKey]?.code));

      if (tpl) {
        setCode(tpl);
      } else {
        setCode(getDefaultCode(selectedLanguage, question.title || question.prompt));
      }
    }
  }, [question, selectedLanguage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081225] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading Question Preview...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-[#081225] flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-100 mb-1">Preview Unavailable</h2>
        <p className="text-xs text-slate-400 mb-6">{error || "Could not retrieve question."}</p>
        <button
          onClick={() => navigate("/admin/library")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow transition-colors"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const isCoding = (question.questionType ?? "").toUpperCase() === "CODING";
  const mcqType = (question.mcqType ?? "SINGLE_CORRECT") as McqType;
  const isMultipleCorrect =
    question.multipleCorrect ||
    mcqType === "MULTIPLE_CORRECT" ||
    mcqType === "IMAGE_MULTIPLE_CORRECT";
  const isAssertionReason = mcqType === "ASSERTION_REASON";

  // Parse assertion and reason if applicable
  let assertion = question.assertion;
  let reason = question.reason;
  if (isAssertionReason && (!assertion || !reason)) {
    const match = question.prompt?.match(/Assertion \(A\): (.*?)\.? Reason \(R\): (.*?)\.?$/);
    if (match) {
      if (!assertion) assertion = match[1];
      if (!reason) reason = match[2];
    }
  }

  const options: McqOption[] = question.mcqOptions || (question as any).options || [];

  const handleToggleOption = (index: number) => {
    if (isMultipleCorrect) {
      setSelectedOptionIndices((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedOptionIndices([index]);
    }
  };

  const handleClear = () => {
    setSelectedOptionIndices([]);
  };

  const isAttempted = selectedOptionIndices.length > 0;

  // Code Execution handler using Judge0 Playground endpoint
  const handleRunCode = async (isVerify = false) => {
    if (!code || !question) return;

    setIsExecuting(true);
    setConsoleOutput("> Compiling & executing source code on sandbox...\n");
    setOverallStatus(null);
    setTestCaseResults([]);

    try {
      const backendLanguage = mapFrontendToBackendLang(selectedLanguage);
      const requestBody: Record<string, unknown> = {
        questionId: question.id,
        language: backendLanguage,
        sourceCode: code,
        runAll: isVerify,
      };

      const response = await apiClient.post<any>(
        "/api/code/execute/playground",
        requestBody
      );

      const resultsArray = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      const sampleCases = isVerify
        ? (question.testCases || [])
        : (question.testCases?.filter((tc) => !tc.isHidden) || []);

      const mappedResults = resultsArray.map((res: any, idx: number) => ({
        status: res.status || "ACCEPTED",
        input: res.input || sampleCases[idx]?.input || "",
        output:
          res.actualOutput ||
          res.stdout ||
          res.stderr ||
          res.compileOutput ||
          "",
        expected:
          res.expectedOutput ||
          sampleCases[idx]?.expectedOutput ||
          (sampleCases[idx] as any)?.expected ||
          "",
        compileOutput: res.compileOutput || "",
        stderr: res.stderr || "",
        executionTimeMs: res.execTimeMs || res.executionTimeMs || 0,
      }));

      setTestCaseResults(mappedResults);

      let computedStatus = "ACCEPTED";
      for (const res of resultsArray) {
        if (res.status !== "ACCEPTED") {
          computedStatus = res.status;
          break;
        }
      }

      setOverallStatus(computedStatus);
      setConsoleOutput(
        `> Execution completed with status: ${computedStatus}\n` +
          (mappedResults[0]?.compileOutput ? `\nCompiler Logs:\n${mappedResults[0].compileOutput}` : "")
      );

      if (computedStatus === "ACCEPTED") {
        toast.success(isVerify ? "All testcases passed!" : "Sample testcases passed!");
      } else {
        toast.error(`Execution result: ${computedStatus.replace(/_/g, " ")}`);
      }
    } catch (err: any) {
      console.error("Execution failed:", err);
      const errorMsg =
        err?.response?.data?.message || err?.message || "Failed to execute code on sandbox.";
      setOverallStatus("EXECUTION_ERROR");
      setConsoleOutput(`> Error: ${errorMsg}\n`);
      toast.error(errorMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetCode = () => {
    setCode(getDefaultCode(selectedLanguage, question.title || question.prompt));
    toast.info("Reset code to default template.");
  };

  // Robust sample testcases resolver supporting multiple schema variants, prompt extraction, and topic fallbacks
  const getSampleTestcases = (q: any) => {
    const list: Array<{ input: string; output: string; explanation?: string }> = [];

    // 1. Check direct examples array (handles various key aliases)
    const rawExamples =
      q?.examples ||
      q?.coding?.examples ||
      (Array.isArray(q?.coding?.examples?.data) ? q.coding.examples.data : null);

    if (Array.isArray(rawExamples) && rawExamples.length > 0) {
      for (const ex of rawExamples) {
        if (ex) {
          list.push({
            input: ex.input != null ? String(ex.input) : "",
            output:
              ex.output != null
                ? String(ex.output)
                : ex.expectedOutput != null
                ? String(ex.expectedOutput)
                : ex.expected != null
                ? String(ex.expected)
                : ex.expected_output != null
                ? String(ex.expected_output)
                : "",
            explanation: ex.explanation,
          });
        }
      }
    }

    // 2. Check testCases / testcases array
    if (list.length === 0) {
      const rawCases =
        q?.testCases ||
        q?.testcases ||
        q?.test_cases ||
        q?.coding?.testCases ||
        q?.coding?.test_cases;

      if (Array.isArray(rawCases) && rawCases.length > 0) {
        for (const tc of rawCases) {
          if (!tc.isHidden || tc.sample) {
            list.push({
              input: tc.input != null ? String(tc.input) : "",
              output:
                tc.expectedOutput != null
                  ? String(tc.expectedOutput)
                  : tc.output != null
                  ? String(tc.output)
                  : tc.expected != null
                  ? String(tc.expected)
                  : "",
              explanation: tc.explanation || q?.sampleExplanation,
            });
          }
        }
      }
    }

    // 3. Check direct sampleInput / sampleOutput fields
    if (list.length === 0 && (q?.sampleInput || q?.coding?.sampleInput)) {
      list.push({
        input: q?.sampleInput || q?.coding?.sampleInput || "",
        output: q?.sampleOutput || q?.coding?.sampleOutput || "",
        explanation: q?.sampleExplanation || q?.coding?.sampleExplanation,
      });
    }

    // 4. Try regex extraction of Examples from prompt text (matching DSAPlayground)
    if (list.length === 0) {
      const pText = `${q?.prompt || ""}\n${q?.sampleExplanation || ""}\n${q?.constraints || ""}`;
      const exampleRegex =
        /(?:Example\s*(\d+)|\*\*Example\s*(\d+)\*\*|###\s*Example\s*(\d+))[\s\S]*?(?:Input|\*\*Input:\*\*)\s*[:\.]?\s*`?([^`\n\r]+)`?[\s\S]*?(?:Output|\*\*Output:\*\*)\s*[:\.]?\s*`?([^`\n\r]+)`?(?:[\s\S]*?(?:Explanation|\*\*Explanation:\*\*)\s*[:\.]?\s*([^\n\r]+))?/gi;
      let match;
      while ((match = exampleRegex.exec(pText)) !== null && list.length < 3) {
        const rawIn = match[4]?.trim();
        const rawOut = match[5]?.trim();
        const rawExp = match[6]?.trim();
        if (rawIn && rawOut) {
          list.push({
            input: rawIn.replace(/^nums\s*=\s*/i, "").replace(/^coins\s*=\s*/i, "").trim(),
            output: rawOut.trim(),
            explanation: rawExp || undefined,
          });
        }
      }
    }

    // 5. Intelligent topic/problem fallback matching DSAPlayground & reference DSA sets
    if (list.length === 0) {
      const pLower = (q?.title || q?.prompt || "").toLowerCase();
      if (pLower.includes("robber") || pLower.includes("house robber")) {
        list.push(
          {
            input: "[1, 2, 3, 1]",
            output: "4",
            explanation:
              "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total amount = 1 + 3 = 4.",
          },
          {
            input: "[2, 7, 9, 3, 1]",
            output: "12",
            explanation:
              "Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 1). Total amount = 2 + 9 + 1 = 12.",
          }
        );
      } else if (pLower.includes("coin") || pLower.includes("change")) {
        list.push(
          {
            input: "[1, 2, 5]\n11",
            output: "3",
            explanation: "11 = 5 + 5 + 1 (3 coins)",
          },
          {
            input: "[2]\n3",
            output: "-1",
            explanation: "Cannot make amount 3 with denomination 2",
          },
          { input: "[1]\n0", output: "0", explanation: "0 amount requires 0 coins" }
        );
      } else if (
        pLower.includes("subarray") ||
        pLower.includes("sliding") ||
        pLower.includes("k elements")
      ) {
        list.push(
          {
            input: "[2, 1, 5, 1, 3, 2]\n3",
            output: "9",
            explanation: "Subarray [5, 1, 3] gives max sum 9",
          },
          {
            input: "[2, 3, 4, 1, 5]\n2",
            output: "7",
            explanation: "Subarray [3, 4] gives sum 7",
          }
        );
      } else if (pLower.includes("two sum") || pLower.includes("target")) {
        list.push(
          {
            input: "[2, 7, 11, 15]\n9",
            output: "[0, 1]",
            explanation: "nums[0] + nums[1] == 9",
          },
          {
            input: "[3, 2, 4]\n6",
            output: "[1, 2]",
            explanation: "nums[1] + nums[2] == 6",
          }
        );
      } else {
        list.push(
          {
            input: "[2, 7, 11, 15]\n9",
            output: "[0, 1]",
            explanation: "nums[0] + nums[1] == 9",
          },
          {
            input: "[3, 2, 4]\n6",
            output: "[1, 2]",
            explanation: "nums[1] + nums[2] == 6",
          }
        );
      }
    }

    return list;
  };

  // Extract structured sample cases for sequential display
  const sampleTestcases = getSampleTestcases(question);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased relative">
      {/* ── 1. Top Navbar (Matching MCQ Preview) ── */}
      <header className="h-20 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Breadcrumb (Library > Question Title) */}
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <div
            onClick={() => navigate("/admin/library")}
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
              onClick={() => navigate("/admin/library")}
              className="hover:text-slate-200 cursor-pointer transition-colors shrink-0"
            >
              Library
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-200 font-semibold truncate max-w-[200px] md:max-w-md">
              {question.title || "Question Preview"}
            </span>
          </div>
        </div>

        {/* Right Side: User Profile Section */}
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
                onClick={() => navigate("/admin/library")}
                className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
                Back to Library
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

      {/* ── 2. Navy Hero Background Backdrop ── */}
      <div className="bg-[#0B1028] absolute top-14 left-0 right-0 h-80 -z-0 pointer-events-none" />

      {/* ── 3. Main Workspace Area ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20 w-full relative z-10">
        {/* Back to Library Button above title */}
        <button
          onClick={() => navigate("/admin/library")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mb-2.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        {/* Title & Top Metadata Row (Only Title, Type, Difficulty & Topic per user preference) */}
        <div className="space-y-1.5 mb-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {question.title || "Untitled Problem"}
            </h1>
            {question.visibility === "ORG_OWNED" && (
              <button
                onClick={() => navigate(`/admin/questions/edit/${question.id}`, { state: question })}
                className="px-3 py-1.5 bg-[#4353a4] hover:bg-[#38468d] text-white text-xs font-semibold rounded shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Problem</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="text-slate-400">=</span> {isCoding ? (question.isLanguageSpecific ? "Language Specific" : "Coding") : fmtMcqType(question.mcqType) || "MCQ"}
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <DifficultyIcon level={question.difficulty} />
              <span>{fmt(question.difficulty)}</span>
            </span>
            {(question.topic?.name || question.tags?.[0]) && (
              <span className="text-slate-300">
                • {question.topic?.name || question.tags?.[0]}
              </span>
            )}
          </div>
        </div>

        {/* ── 4. White Workspace Card ── */}
        <div className="bg-white rounded-sm border border-slate-200/90 shadow-xl overflow-hidden min-h-[560px] flex flex-col">
          {/* UNDER_REVIEW Warning Banner for Coding */}
          {isCoding && question.status === "UNDER_REVIEW" && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Driver Verification Pending (UNDER_REVIEW):</span> One or more language execution drivers have not passed pre-flight verification against a reference solution.
              </div>
            </div>
          )}

          {/* Top Tab Bar: SOLVE */}
          <div className="border-b border-slate-200 flex items-center justify-between px-6 bg-white">
            <div className="flex items-center space-x-8">
              <div className="py-3.5 border-b-2 border-[#10B981] text-[#0d9488] text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-default">
                <span>SOLVE</span>
              </div>
            </div>

            {/* Admin Controls for MCQ */}
            {!isCoding && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    showAnswerKey
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-medium"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{showAnswerKey ? "Hide Answer Key" : "Show Answer Key"}</span>
                </button>
              </div>
            )}
          </div>

          {/* ── 5. Main 2-Column Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* ── Left Column: All Problem Content in Sequence ── */}
            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between border-b lg:border-b-0 border-slate-200 bg-white overflow-y-auto max-h-[800px]">
              <div className="space-y-5">
                {/* Description Header */}
                <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  DESCRIPTION
                </div>

                {/* Problem Statement Title */}
                <h2 className="text-sm font-bold text-slate-900">Problem Statement</h2>

                {/* Assertion Reason layout if applicable */}
                {isAssertionReason ? (
                  <div className="space-y-3 pt-1">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 text-xs block mb-1">Assertion (A):</span>
                      <p className="text-slate-700 text-xs">{assertion || "No assertion text provided."}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 text-xs block mb-1">Reason (R):</span>
                      <p className="text-slate-700 text-xs">{reason || "No reason text provided."}</p>
                    </div>
                  </div>
                ) : /<[a-z][\s\S]*>/i.test(question.prompt || "") ? (
                  <div
                    className="text-[13px] md:text-sm text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_p]:my-1.5 [&_pre]:bg-[#18181b] [&_pre]:text-amber-300 [&_pre]:p-3 [&_pre]:rounded-sm [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-xs [&_code]:bg-slate-100 [&_code]:text-pink-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-xs [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0"
                    dangerouslySetInnerHTML={{ __html: question.prompt || "" }}
                  />
                ) : (
                  <div className="text-[13px] md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                    {question.prompt || "No description provided for this question."}
                  </div>
                )}

                {/* Constraints Section */}
                {question.constraints && (
                  <div className="pt-2">
                    <h3 className="text-xs font-bold text-slate-900 mb-1.5">Constraints:</h3>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {question.constraints}
                    </div>
                  </div>
                )}

                {/* Sample Testcases & Explanations in Sequence */}
                {isCoding && sampleTestcases.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {sampleTestcases.map((sample, idx) => (
                      <div key={idx} className="space-y-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Sample Input {idx + 1}:
                          </h4>
                          <pre className="mt-1 p-3 bg-[#18181b] text-amber-300 font-mono text-xs rounded-sm overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-xs border border-slate-800">
                            {sample.input || "No input"}
                          </pre>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Sample Output {idx + 1}:
                          </h4>
                          <pre className="mt-1 p-3 bg-[#18181b] text-slate-100 font-mono text-xs rounded-sm overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-xs border border-slate-800">
                            {sample.output || "No output"}
                          </pre>
                        </div>

                        {sample.explanation && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-0.5">
                              Explanation:
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {sample.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Metadata & Feedback Section */}
              <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
                {/* Execution Time Limit */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">
                    EXECUTION TIME LIMIT
                  </p>
                  <p className="text-xs text-slate-600">
                    {question.timeLimitSecs || 10} seconds.
                  </p>
                </div>

                {/* Additional Question Metrics: Marks, Duration, Subject */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                  {question.marks !== undefined && (
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {question.marks} Marks
                    </span>
                  )}
                  {question.avg_time_seconds && (
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {Math.round(question.avg_time_seconds / 60)} Mins
                    </span>
                  )}
                  {question.subject?.name && (
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                      Subject: {question.subject.name}
                    </span>
                  )}
                </div>

                {/* Tags Section */}
                {question.tags && question.tags.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    {question.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-sm"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Report Section */}
                <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5">
                  <span>Having an issue with this question?</span>
                  <button
                    onClick={() => toast.info("Feedback report recorded for question review.")}
                    className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Solution Code & Runner or MCQ Choices ── */}
            {isCoding ? (
              <div className="lg:col-span-7 p-4 md:p-6 flex flex-col justify-between bg-white border-t lg:border-t-0 min-h-[680px]">
                <div className="flex flex-col flex-1 space-y-3">
                  {/* Solution Code Header with SUBMIT */}
                  <div className="flex items-start justify-between gap-4 pb-2.5 border-b border-slate-100">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Solution code</h2>
                      <p className="text-xs text-slate-500">
                        Please choose a language and write your code.
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunCode(true)}
                      disabled={isExecuting}
                      className="px-3.5 py-1.5 bg-[#4353a4] hover:bg-[#344287] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SUBMIT</span>
                    </button>
                  </div>

                  {/* Sub-bar Controls: Language Selector, Run & Verify, Reset */}
                  <div className="py-1 flex flex-wrap items-center justify-end gap-2">
                    {/* Language Selector */}
                    <Select
                      value={selectedLanguage}
                      onValueChange={(val) => setSelectedLanguage(val)}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs font-medium bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python3">Python 3</SelectItem>
                        <SelectItem value="javascript">JavaScript (Node)</SelectItem>
                        <SelectItem value="java">Java 17 (OpenJDK)</SelectItem>
                        <SelectItem value="cpp">C++ (GCC)</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* RUN CODE Button */}
                    <button
                      onClick={() => handleRunCode(false)}
                      disabled={isExecuting}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                      )}
                      <span>RUN CODE</span>
                    </button>

                    {/* Reset Button */}
                    <button
                      onClick={handleResetCode}
                      title="Reset code to default"
                      className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 min-h-[360px] border border-slate-200 rounded overflow-hidden relative shadow-inner">
                    <Editor
                      height="360px"
                      language={getMonacoLanguage(selectedLanguage)}
                      value={code}
                      onChange={(val) => setCode(val || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        wordWrap: "on",
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  </div>

                  {/* Execution Results Console */}
                  {(isExecuting || testCaseResults.length > 0 || consoleOutput) && (
                    <div className="mt-2 border border-slate-200 rounded overflow-hidden bg-slate-50">
                      <div className="px-3.5 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Execution Results
                          </span>
                        </div>
                        {overallStatus && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              overallStatus === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-rose-100 text-rose-800 border-rose-300"
                            }`}
                          >
                            {overallStatus.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      <div className="p-3 text-xs space-y-2.5 max-h-52 overflow-y-auto font-mono">
                        {isExecuting ? (
                          <div className="flex items-center gap-2 text-slate-600 p-2 font-sans">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            <span>Executing on Judge0 sandbox...</span>
                          </div>
                        ) : (
                          <>
                            {testCaseResults.map((tc, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded border ${
                                  tc.status === "ACCEPTED"
                                    ? "bg-emerald-50/60 border-emerald-200"
                                    : "bg-rose-50/60 border-rose-200"
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                                  <span
                                    className={
                                      tc.status === "ACCEPTED" ? "text-emerald-700" : "text-rose-700"
                                    }
                                  >
                                    Testcase {idx + 1}: {tc.status}
                                  </span>
                                  {tc.executionTimeMs !== undefined && (
                                    <span className="text-slate-500 font-normal">
                                      {tc.executionTimeMs} ms
                                    </span>
                                  )}
                                </div>
                                {tc.input && (
                                  <div className="text-[11px] text-slate-600 mb-1">
                                    <span className="font-semibold text-slate-700">Input: </span>
                                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      {tc.input}
                                    </span>
                                  </div>
                                )}
                                {tc.expected && (
                                  <div className="text-[11px] text-slate-600 mb-1">
                                    <span className="font-semibold text-slate-700">Expected: </span>
                                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      {tc.expected}
                                    </span>
                                  </div>
                                )}
                                {tc.output && (
                                  <div className="text-[11px] text-slate-700">
                                    <span className="font-semibold text-slate-800">Your Output: </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded border ${
                                        tc.status === "ACCEPTED"
                                          ? "bg-white border-emerald-300 text-emerald-800"
                                          : "bg-white border-rose-300 text-rose-800"
                                      }`}
                                    >
                                      {tc.output}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {consoleOutput && (
                              <pre className="text-slate-600 text-[11px] whitespace-pre-wrap bg-white p-2 border border-slate-200 rounded">
                                {consoleOutput}
                              </pre>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Banner */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
                  <button
                    onClick={() => navigate("/admin/library")}
                    className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            ) : (
              /* MCQ Right Column */
              <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between bg-white">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Answer choices</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isMultipleCorrect
                          ? "Please choose all correct answers."
                          : "Please choose a correct answer."}
                      </p>
                    </div>

                    <button
                      onClick={handleClear}
                      disabled={!isAttempted}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="font-mono text-slate-400">=</span>
                      <span>CLEAR</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-1">
                    {options.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 bg-slate-50 border border-slate-200 italic">
                        No answer options provided for this question.
                      </div>
                    ) : (
                      options.map((opt, idx) => {
                        const isSelected = selectedOptionIndices.includes(idx);
                        const isCorrectOption = Boolean(opt.isCorrect);

                        return (
                          <div
                            key={idx}
                            onClick={() => handleToggleOption(idx)}
                            className={`group flex items-center gap-3.5 p-1 rounded transition-all cursor-pointer ${
                              isSelected ? "ring-1 ring-indigo-400/80" : ""
                            }`}
                          >
                            {/* Selector */}
                            <div className="shrink-0 pl-1">
                              {isMultipleCorrect ? (
                                <div
                                  className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-slate-400 bg-white group-hover:border-slate-600"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              ) : (
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "border-indigo-600 ring-2 ring-indigo-200"
                                      : "border-slate-400 group-hover:border-slate-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Option Box */}
                            <div
                              className={`flex-1 min-h-[48px] px-4 py-3 bg-[#13171f] hover:bg-[#1a202c] text-white rounded text-xs font-mono transition-all flex items-center justify-between border ${
                                showAnswerKey && isCorrectOption
                                  ? "border-emerald-500 ring-1 ring-emerald-500"
                                  : isSelected
                                  ? "border-indigo-500"
                                  : "border-[#232936]"
                              }`}
                            >
                              {/<[a-z][\s\S]*>/i.test(opt.text || "") ? (
                                <div
                                  className="leading-relaxed select-none prose prose-invert prose-xs max-w-none text-xs font-mono [&_p]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_code]:bg-slate-800 [&_code]:text-pink-400 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-xs"
                                  dangerouslySetInnerHTML={{ __html: opt.text || "" }}
                                />
                              ) : (
                                <span className="leading-relaxed select-none">
                                  {opt.text || `Option ${String.fromCharCode(65 + idx)}`}
                                </span>
                              )}

                              {showAnswerKey && isCorrectOption && (
                                <span className="ml-3 shrink-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-sans font-bold uppercase rounded">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer Banner */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
                  <button
                    onClick={() => navigate("/admin/library")}
                    className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

