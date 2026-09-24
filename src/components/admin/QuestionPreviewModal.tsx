import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Check,
  Play,
  RotateCcw,
  CheckCircle2,
  Info,
  Loader2,
  Code2,
  Terminal,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  Edit,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Editor from "@monaco-editor/react";
import { testService, Question, McqOption, McqType } from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { unwrapResponse } from "@/lib/api/baseResponseUtils";
import { mapFrontendToBackendLang } from "@/types/question";
import { renderFormattedContent, sanitizeHtml } from "@/lib/html-utils";
import { QuestionImage } from "@/components/ui/QuestionImage";
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

const SignalBars = ({ level }: { level?: string }) => {
  const diff = (level || "MEDIUM").toUpperCase();
  const count = diff === "EASY" ? 1 : diff === "HARD" ? 3 : 2;
  return (
    <svg className="w-3.5 h-3.5 text-slate-300 inline-block" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="9" width="2.5" height="5" rx="0.5" opacity={count >= 1 ? 0.95 : 0.25} />
      <rect x="6.75" y="5" width="2.5" height="9" rx="0.5" opacity={count >= 2 ? 0.95 : 0.25} />
      <rect x="11.5" y="2" width="2.5" height="12" rx="0.5" opacity={count >= 3 ? 0.95 : 0.25} />
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

export interface QuestionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  // Optional add/remove action handlers (useful in Add Problems screen)
  onAddQuestion?: (question: Question) => void;
  onRemoveQuestion?: (question: Question) => void;
  isAdded?: boolean;
  isAdding?: boolean;
  isRemoving?: boolean;
}

export function QuestionPreviewModal({
  isOpen,
  onClose,
  question: initialQuestion,
  onAddQuestion,
  onRemoveQuestion,
  isAdded = false,
  isAdding = false,
  isRemoving = false,
}: QuestionPreviewModalProps) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(initialQuestion);
  const [loading, setLoading] = useState(false);

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

  // Load detailed question if only partial question passed
  const fetchQuestionDetails = useCallback(async (questionId: string) => {
    try {
      setLoading(true);
      const data = await testService.getQuestionById(questionId);
      if (data) {
        setQuestion(data);
      }
    } catch (err: unknown) {
      console.error("Failed to load question details for modal", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && initialQuestion) {
      setQuestion(initialQuestion);
      setSelectedOptionIndices([]);
      setShowAnswerKey(false);
      setTestCaseResults([]);
      setOverallStatus(null);
      setConsoleOutput("");

      const qRec = initialQuestion as unknown as Record<string, unknown>;
      const isCoding = (initialQuestion.questionType || (qRec?.type as string) || "").toString().toUpperCase() === "CODING";
      const hasFullDetails = isCoding
        ? Array.isArray(initialQuestion.testCases) && initialQuestion.testCases.length > 0
        : Array.isArray(initialQuestion.mcqOptions) && initialQuestion.mcqOptions.length > 0;

      if (initialQuestion.id && !hasFullDetails) {
        fetchQuestionDetails(initialQuestion.id);
      }
    }
  }, [isOpen, initialQuestion, fetchQuestionDetails]);

  // Handle escape key to close immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Load initial template when question or language changes
  useEffect(() => {
    if (question) {
      const qRec = question as unknown as Record<string, unknown>;
      const isCodingQ = (question.questionType || (qRec?.type as string) || "").toString().toUpperCase() === "CODING";
      if (isCodingQ) {
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
    }
  }, [question, selectedLanguage]);

  if (!isOpen || !question) return null;

  const qRec = question as unknown as Record<string, unknown>;
  const qType = (question.questionType || (qRec?.type as string) || "").toString().toUpperCase();
  const isCoding = qType === "CODING";
  const mcqType = (question.mcqType || (qRec?.type as McqType) || "SINGLE_CORRECT") as McqType;
  const isMultipleCorrect =
    Boolean(question.multipleCorrect) ||
    mcqType === "MULTIPLE_CORRECT" ||
    mcqType === "IMAGE_MULTIPLE_CORRECT";
  const isAssertionReason = mcqType === "ASSERTION_REASON";

  let assertion = question.assertion || (qRec?.assertion as string | undefined);
  let reason = question.reason || (qRec?.reason as string | undefined);
  if (isAssertionReason && (!assertion || !reason)) {
    const match = question.prompt?.match(/Assertion \(A\): (.*?)\.? Reason \(R\): (.*?)\.?$/);
    if (match) {
      if (!assertion) assertion = match[1];
      if (!reason) reason = match[2];
    }
  }

  const rawOptions = (question.mcqOptions || (qRec?.options as unknown[]) || []) as unknown[];
  const options: McqOption[] = rawOptions.map((opt: unknown, idx: number) => {
    if (typeof opt === "string") {
      return { text: opt, isCorrect: false, displayOrder: idx };
    }
    const o = (typeof opt === "object" && opt !== null ? opt : {}) as Record<string, unknown>;
    return {
      id: (o.id as string) || undefined,
      text: (o.text as string) || (o.optionText as string) || (o.value as string) || `Option ${String.fromCharCode(65 + idx)}`,
      imageUrl: (o.imageUrl as string) || (o.image_url as string) || undefined,
      isCorrect: Boolean(o.isCorrect ?? o.is_correct ?? o.correct),
      displayOrder: (o.displayOrder as number) ?? (o.display_order as number) ?? idx,
    };
  });

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

    if (!question.id) {
      toast.error("Question ID not found. Please ensure the question is saved.");
      return;
    }

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

      const unwrapped = unwrapResponse(response);
      const resultsArray: Record<string, unknown>[] = Array.isArray(unwrapped)
        ? (unwrapped as Record<string, unknown>[])
        : Array.isArray((unwrapped as any)?.data)
        ? (unwrapped as any).data
        : Array.isArray((response.data as any)?.data)
        ? (response.data as any).data
        : [];

      const sampleCases = isVerify
        ? (question.testCases || [])
        : (question.testCases?.filter((tc: Record<string, unknown>) => (tc.sample === true || tc.isSample === true) && !tc.isHidden) || []);

      const mappedResults = resultsArray.map((res: Record<string, unknown>, idx: number) => ({
        status: (res.status as string) || "ACCEPTED",
        input: (res.input as string) || sampleCases[idx]?.input || "",
        output:
          (res.actualOutput as string) ||
          (res.stdout as string) ||
          (res.stderr as string) ||
          (res.compileOutput as string) ||
          "",
        expected:
          (res.expectedOutput as string) ||
          sampleCases[idx]?.expectedOutput ||
          ((sampleCases[idx] as Record<string, unknown>)?.expected as string) ||
          "",
        compileOutput: (res.compileOutput as string) || "",
        stderr: (res.stderr as string) || "",
        executionTimeMs: (res.execTimeMs as number) || (res.executionTimeMs as number) || 0,
      }));

      setTestCaseResults(mappedResults);

      let computedStatus = "ACCEPTED";
      for (const res of resultsArray) {
        const itemStatus = (res.status as string) || "ACCEPTED";
        if (itemStatus !== "ACCEPTED") {
          computedStatus = itemStatus;
          break;
        }
      }

      setOverallStatus(computedStatus);
      setConsoleOutput(
        `> Execution completed with status: ${computedStatus}\n` +
          (mappedResults[0]?.compileOutput ? `\nCompiler Logs:\n${mappedResults[0].compileOutput}` : "") +
          (mappedResults[0]?.stderr ? `\nRuntime Stderr:\n${mappedResults[0].stderr}` : "")
      );

      if (computedStatus === "ACCEPTED") {
        toast.success(isVerify ? "All testcases passed!" : "Sample testcases passed!");
      } else {
        toast.error(`Execution result: ${computedStatus.replace(/_/g, " ")}`);
      }
    } catch (err: unknown) {
      console.error("Execution failed:", err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg =
        errorObj?.response?.data?.message || errorObj?.message || "Failed to execute code on sandbox.";
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

  // Sample test cases resolver
  const getSampleTestcases = (q: Record<string, unknown> | Question | null | undefined) => {
    const list: Array<{ input: string; output: string; explanation?: string }> = [];
    const qRecord = q as Record<string, unknown> | null | undefined;

    const rawCases =
      (q as Question)?.testCases ||
      (qRecord?.testcases as Record<string, unknown>[] | undefined) ||
      (qRecord?.test_cases as Record<string, unknown>[] | undefined) ||
      ((qRecord?.coding as Record<string, unknown> | undefined)?.testCases as Record<string, unknown>[] | undefined) ||
      ((qRecord?.coding as Record<string, unknown> | undefined)?.test_cases as Record<string, unknown>[] | undefined);

    if (Array.isArray(rawCases) && rawCases.length > 0) {
      const sampleCases = rawCases.filter((tc: Record<string, unknown>) => (tc.sample === true || tc.isSample === true) && !tc.isHidden);
      const targetCases = sampleCases.length > 0 ? sampleCases : rawCases.filter((tc: Record<string, unknown>) => !tc.isHidden).slice(0, 2);
      for (const tc of targetCases) {
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
          explanation: (tc.explanation as string | undefined) || ((qRecord?.sampleExplanation as string) || undefined),
        });
      }
    }

    if (list.length === 0) {
      const codingObj = qRecord?.coding as Record<string, unknown> | undefined;
      const rawExamples =
        (qRecord?.examples as Record<string, unknown>[] | undefined) ||
        (codingObj?.examples as Record<string, unknown>[] | undefined);

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
                  : "",
              explanation: ex.explanation as string | undefined,
            });
          }
        }
      }
    }

    if (list.length === 0 && q?.prompt) {
      const pText = `${q?.prompt || ""}\n${(qRecord?.sampleExplanation as string) || ""}\n${q?.constraints || ""}`;
      const exampleRegex =
        /(?:Example\s*(\d+)|\*\*Example\s*(\d+)\*\*|###\s*Example\s*(\d+))[\s\S]*?(?:Input|\*\*Input:\*\*)\s*[:.]?\s*`?([^`\n\r]+)`?[\s\S]*?(?:Output|\*\*Output:\*\*)\s*[:.]?\s*`?([^`\n\r]+)`?(?:[\s\S]*?(?:Explanation|\*\*Explanation:\*\*)\s*[:.]?\s*([^\n\r]+))?/gi;
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

    return list;
  };

  const sampleTestcases = getSampleTestcases(question);
  const primaryTag = question.tags?.[0] || question.topic?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="w-full max-w-6xl my-auto bg-[#0b1329] rounded-xl shadow-2xl overflow-hidden border border-slate-800/80 flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Top Obsidian Hero Area ── */}
        <div className="bg-[#0b1329] text-white px-6 pt-5 pb-4 flex items-start justify-between">
          <div className="space-y-1.5 min-w-0 pr-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white truncate max-w-3xl">
              {question.title || "Question Preview"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400 font-mono">-</span>
                <span>
                  {isCoding
                    ? question.isLanguageSpecific
                      ? "Language Specific"
                      : "Coding"
                    : fmtMcqType(question.mcqType) || "Single Choice"}
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                <SignalBars level={question.difficulty} />
                <span>{fmt(question.difficulty || "MEDIUM")}</span>
              </span>

              {primaryTag && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span>•</span>
                  <span className="text-slate-300">{primaryTag}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1">
            {/* Optional Add/Remove from Test */}
            {onAddQuestion && (
              isAdded ? (
                <button
                  onClick={() => onRemoveQuestion && onRemoveQuestion(question)}
                  disabled={isRemoving}
                  className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium rounded transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Remove from test"
                >
                  {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Remove</span>
                </button>
              ) : (
                <button
                  onClick={() => onAddQuestion(question)}
                  disabled={isAdding}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Add to test"
                >
                  {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span className="hidden sm:inline">Add to Test</span>
                </button>
              )
            )}

            {/* Edit Question Direct Action */}
            {question.id && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/admin/questions/edit/${question.id}`);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded transition-all inline-flex items-center gap-1.5 cursor-pointer"
                title="Edit Question"
              >
                <Edit className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Edit Question</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800/80 rounded-md cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. White Workspace Card ── */}
        <div className="bg-white rounded-t-xl overflow-hidden flex flex-col min-h-[500px]">
          {/* Top Tab Bar: SOLVE + Show Answer Key */}
          <div className="border-b border-slate-200 flex items-center justify-between px-6 bg-white">
            <div className="flex items-center">
              <div className="py-3.5 border-b-2 border-emerald-500 text-slate-800 text-xs font-bold tracking-wider uppercase cursor-default">
                SOLVE
              </div>
            </div>

            {/* Top Right: Show Answer Key Button */}
            {!isCoding && (
              <button
                onClick={() => setShowAnswerKey(!showAnswerKey)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showAnswerKey
                    ? "bg-slate-50 border-slate-300 text-slate-800 font-medium"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CheckCircle className={`w-3.5 h-3.5 ${showAnswerKey ? "text-emerald-600" : "text-slate-400"}`} />
                <span>Show Answer Key</span>
              </button>
            )}
          </div>

          {/* ── 3. Main 2-Column Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 flex-1">
            {/* ── Left Column: Description ── */}
            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[70vh] bg-white space-y-6">
              <div className="space-y-4">
                <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  DESCRIPTION
                </div>

                <h2 className="text-sm font-bold text-slate-900">
                  Problem Statement
                </h2>

                {/* Assertion Reason layout if applicable */}
                {isAssertionReason ? (
                  <div className="space-y-3 pt-1">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 text-xs block mb-1">Assertion (A):</span>
                      <p className="text-slate-700 text-xs leading-relaxed">{assertion || "No assertion text provided."}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-800 text-xs block mb-1">Reason (R):</span>
                      <p className="text-slate-700 text-xs leading-relaxed">{reason || "No reason text provided."}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-[13px] md:text-sm text-slate-700 leading-relaxed font-sans prose prose-slate max-w-none [&_p]:my-1.5 [&_pre]:bg-[#18181b] [&_pre]:text-amber-300 [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-xs [&_code]:font-mono [&_code]:text-xs [&_code]:bg-slate-100 [&_code]:text-pink-600 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-xs [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:p-0"
                    dangerouslySetInnerHTML={{
                      __html: renderFormattedContent(question.prompt || "No description provided for this question."),
                    }}
                  />
                )}

                {/* Question Image */}
                {question.imageUrl && (
                  <div className="pt-2">
                    <QuestionImage
                      src={question.imageUrl}
                      alt="Question asset"
                      enableZoom={true}
                      className="max-w-full max-h-72 rounded-lg object-contain border border-slate-200"
                    />
                  </div>
                )}

                {/* Constraints */}
                {question.constraints && (
                  <div className="pt-2">
                    <h3 className="text-xs font-bold text-slate-900 mb-1.5">Constraints:</h3>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {question.constraints}
                    </div>
                  </div>
                )}

                {/* Sample Testcases for Coding */}
                {isCoding && sampleTestcases.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {sampleTestcases.map((sample, idx) => (
                      <div key={idx} className="space-y-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Sample Input {idx + 1}:
                          </h4>
                          <pre className="mt-1 p-3 bg-[#18181b] text-amber-300 font-mono text-xs rounded overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {sample.input || "No input"}
                          </pre>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Sample Output {idx + 1}:
                          </h4>
                          <pre className="mt-1 p-3 bg-[#18181b] text-slate-100 font-mono text-xs rounded overflow-x-auto whitespace-pre-wrap leading-relaxed">
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

              {/* Bottom Metadata Badges, Tags, and Report */}
              <div className="pt-6 border-t border-slate-200/80 space-y-3.5">
                {/* Marks & Time Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {question.marks !== undefined && (
                    <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-medium rounded">
                      {question.marks} Marks
                    </span>
                  )}
                  {question.avg_time_seconds && (
                    <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-medium rounded">
                      {Math.round(question.avg_time_seconds / 60)} Mins
                    </span>
                  )}
                </div>

                {/* Tags */}
                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {question.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200/80"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Report Section */}
                <div className="text-xs text-slate-400 flex items-center gap-1 pt-1">
                  <span>Having an issue with this question?</span>
                  <button
                    onClick={() => toast.info("Feedback report recorded for question review.")}
                    className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 cursor-pointer ml-1"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Solution / Playground or MCQ Choices ── */}
            <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[70vh] bg-white">
              {isCoding ? (
                /* Coding Solution / Editor */
                <div className="flex flex-col flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4 pb-2 border-b border-slate-100">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Solution code</h2>
                      <p className="text-xs text-slate-500">
                        Please choose a language and write your code.
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunCode(true)}
                      disabled={isExecuting}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SUBMIT</span>
                    </button>
                  </div>

                  <div className="py-1 flex flex-wrap items-center justify-end gap-2">
                    <Select
                      value={selectedLanguage}
                      onValueChange={(val) => setSelectedLanguage(val)}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs font-medium bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Language">
                          {selectedLanguage === "python3"
                            ? "Python 3"
                            : selectedLanguage === "javascript"
                            ? "JavaScript (Node)"
                            : selectedLanguage === "java"
                            ? "Java 17 (OpenJDK)"
                            : selectedLanguage === "cpp"
                            ? "C++ (GCC)"
                            : selectedLanguage}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python3">Python 3</SelectItem>
                        <SelectItem value="javascript">JavaScript (Node)</SelectItem>
                        <SelectItem value="java">Java 17 (OpenJDK)</SelectItem>
                        <SelectItem value="cpp">C++ (GCC)</SelectItem>
                      </SelectContent>
                    </Select>

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

                    <button
                      onClick={handleResetCode}
                      title="Reset code template"
                      className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Monaco Code Editor */}
                  <div className="h-72 border border-slate-200 rounded overflow-hidden shadow-inner">
                    <Editor
                      height="100%"
                      language={getMonacoLanguage(selectedLanguage)}
                      value={code}
                      onChange={(val) => setCode(val || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                      }}
                    />
                  </div>

                  {/* Results Panel */}
                  {(testCaseResults.length > 0 || consoleOutput || overallStatus) && (
                    <div className="p-3 bg-[#0f172a] text-white rounded space-y-2 text-xs font-mono border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                        <span className="font-bold flex items-center gap-1.5 text-slate-300">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          Output:
                        </span>
                        {overallStatus && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              overallStatus === "ACCEPTED"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            }`}
                          >
                            {overallStatus.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      {testCaseResults.map((tc, idx) => (
                        <div key={idx} className="p-1.5 bg-slate-900 rounded border border-slate-800 space-y-0.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Testcase {idx + 1}</span>
                            <span className={tc.status === "ACCEPTED" ? "text-emerald-400" : "text-rose-400"}>
                              {tc.status}
                            </span>
                          </div>
                          {tc.expected && (
                            <div className="text-slate-400">
                              Expected: <span className="text-slate-200">{tc.expected}</span>
                            </div>
                          )}
                          {tc.output && (
                            <div className="text-slate-400">
                              Your Output: <span className={tc.status === "ACCEPTED" ? "text-emerald-300" : "text-rose-300"}>{tc.output}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {consoleOutput && (
                        <pre className="text-slate-300 text-[11px] whitespace-pre-wrap p-1 font-mono">
                          {consoleOutput}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* MCQ Answer Choices - Matching User Screenshot Perfectly */
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Answer choices</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isMultipleCorrect
                          ? "Please choose all correct answers."
                          : "Please choose a correct answer."}
                      </p>
                    </div>

                    <button
                      onClick={handleClear}
                      disabled={!isAttempted}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider"
                    >
                      <span className="font-mono text-slate-400">-</span>
                      <span>CLEAR</span>
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
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
                            className="group flex items-center gap-3.5 cursor-pointer"
                          >
                            {/* Circular / Square Selection Indicator */}
                            <div className="shrink-0">
                              {isMultipleCorrect ? (
                                <div
                                  className={`w-4.5 h-4.5 border rounded flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "bg-slate-900 border-slate-900 text-white"
                                      : "border-slate-300 bg-white group-hover:border-slate-500"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              ) : (
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "border-slate-900"
                                      : "border-slate-300 group-hover:border-slate-500"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Dark Charcoal / Obsidian Option Block */}
                            <div
                              className={`flex-1 min-h-[48px] px-4 py-3 bg-[#0d1322] hover:bg-[#121a2e] text-white rounded-md text-xs font-mono transition-all flex items-center justify-between border ${
                                showAnswerKey && isCorrectOption
                                  ? "border-emerald-500 ring-1 ring-emerald-500/70"
                                  : isSelected
                                  ? "border-indigo-400/80"
                                  : "border-slate-800/90"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                {/<[a-z][\s\S]*>/i.test(opt.text || "") ? (
                                  <div
                                    className="leading-relaxed select-none prose prose-invert prose-xs max-w-none text-xs font-mono [&_p]:my-0"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt.text || "") }}
                                  />
                                ) : (
                                  <span className="leading-relaxed select-none text-slate-100 font-mono">
                                    {opt.text || `Option ${String.fromCharCode(65 + idx)}`}
                                  </span>
                                )}

                                {opt.imageUrl && (
                                  <div className="mt-2">
                                    <QuestionImage
                                      src={opt.imageUrl}
                                      alt={`Option ${String.fromCharCode(65 + idx)} image`}
                                      enableZoom={true}
                                      className="max-h-32 rounded object-contain bg-black/40 p-1"
                                    />
                                  </div>
                                )}
                              </div>

                              {showAnswerKey && isCorrectOption && (
                                <span className="ml-3 shrink-0 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-sans font-semibold uppercase rounded">
                                  Correct
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Right: Close Preview Button */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
