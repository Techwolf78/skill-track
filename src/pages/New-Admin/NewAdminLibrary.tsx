import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  Building2,
  BarChart2,
  Eye,
  Loader2,
  X,
  Plus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpDown,
  Sparkles,
  ShoppingCart,
  Files,
  Monitor,
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Info,
  Save,
  Copy,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  useQuestionsQuery,
  useSubjectsQuery,
  useTopicsQuery,
  useCreateQuestionMutation,
  useBulkCreateQuestionsMutation,
} from "@/hooks/use-query-hooks";
import { testService, Question, McqOption, McqType, CreateQuestionRequest } from "@/lib/test-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


// ─── Types ───────────────────────────────────────────────────────────────────

type LibraryType = "PUBLIC" | "ORG_OWNED";
type ProblemType =
  | "ALL"
  | "CODING"
  | "MCQ"
  | "TRUE_FALSE"
  | "ASSERTION_REASON"
  | "FILL_IN_THE_BLANK";
type SortOption = "NEWEST" | "OLDEST";

interface FormState {
  questionType: "MCQ";
  title: string;
  prompt: string;
  subject_id: string;
  topic_id: string;
  subtopic_id: string;
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  visibility: "PUBLIC" | "ORG_OWNED";
  // MCQ
  mcqType: McqType;
  multipleCorrect: boolean;
  shuffleOptions: boolean;
  mcqOptions: McqOption[];
  tags: string[];
  // Calibration
  avg_time_seconds: number | "";
}

const DEFAULT_FORM: FormState = {
  questionType: "MCQ",
  title: "",
  prompt: "",
  subject_id: "",
  topic_id: "",
  subtopic_id: "",
  marks: 1,
  difficulty: "MEDIUM",
  visibility: "ORG_OWNED",
  mcqType: "SINGLE_CORRECT",
  multipleCorrect: false,
  shuffleOptions: false,
  mcqOptions: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  tags: [],
  avg_time_seconds: 90,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

const getQuestionMcqType = (q: any): string => {
  if (q.mcqType) {
    const raw = String(q.mcqType).toUpperCase();
    if (raw !== "SINGLE_CORRECT" && raw !== "MCQ") return raw;
  }
  const opts = (q.mcqOptions || q.options || []).map((o: any) =>
    (typeof o === "string" ? o : o.text || "").toLowerCase().trim()
  );
  if (
    opts.length === 2 &&
    ((opts[0] === "true" && opts[1] === "false") ||
      (opts[0] === "false" && opts[1] === "true"))
  ) {
    return "TRUE_FALSE";
  }
  const fullText = `${q.title || ""} ${q.prompt || ""}`.toLowerCase();
  if (
    fullText.includes("assertion") ||
    fullText.includes("reason (r)") ||
    fullText.includes("(a) and (r)")
  ) {
    return "ASSERTION_REASON";
  }
  if (
    fullText.includes("fill in the blank") ||
    fullText.includes("_____") ||
    fullText.includes("__________")
  ) {
    return "FILL_IN_THE_BLANK";
  }
  return q.multipleCorrect ? "MULTIPLE_CORRECT" : "SINGLE_CORRECT";
};

const fmtMcqType = (t?: string) => {
  if (!t) return null;
  switch (t.toUpperCase()) {
    case "SINGLE_CORRECT":
      return "Single";
    case "MULTIPLE_CORRECT":
      return "Multiple";
    case "TRUE_FALSE":
      return "True/False";
    case "ASSERTION_REASON":
      return "Assertion Reason";
    case "FILL_IN_THE_BLANK":
      return "Fill in blank";
    default:
      return t;
  }
};

const fmtTime = (q: Question) => {
  const avgSeconds = q.avg_time_seconds ?? (q as any).avgTimeSeconds;
  if (avgSeconds && avgSeconds > 0) {
    const mins = Math.round(avgSeconds / 60);
    if (mins < 1) {
      return `${avgSeconds} secs.`;
    }
    return `${mins} min${mins === 1 ? "" : "s"}.`;
  }

  // Fallback for Coding questions when solve duration is not recorded
  if ((q.questionType ?? "").toUpperCase() === "CODING") {
    const d = (q.difficulty ?? "").toUpperCase();
    return d === "HARD" ? "25 mins." : d === "EASY" ? "10 mins." : "15 mins.";
  }

  return null;
};

const DifficultyIcon = ({ level }: { level?: string }) => {
  const diff = (level || "").toUpperCase();
  const count = diff === "EASY" ? 1 : diff === "HARD" ? 3 : 2;
  return (
    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="9" width="2.5" height="5" rx="0.5" opacity={count >= 1 ? 0.9 : 0.25} />
      <rect x="6.75" y="5" width="2.5" height="9" rx="0.5" opacity={count >= 2 ? 0.9 : 0.25} />
      <rect x="11.5" y="2" width="2.5" height="12" rx="0.5" opacity={count >= 3 ? 0.9 : 0.25} />
    </svg>
  );
};

// ─── Small reusable select ────────────────────────────────────────────────────

const Sel = ({
  id,
  value,
  onChange,
  children,
  className = "",
}: {
  id?: string;
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-white border border-slate-200 rounded-md px-3 py-1.5 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
  </div>
);

// ─── Step 1: Create Problem Initial Modal (DoSelect Style) ───────────────────

function CreateProblemModal({
  isOpen,
  onClose,
  onCreate,
  onOpenBulkUploader,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (initialData: {
    title: string;
    questionType: "CODING" | "MCQ";
    mcqType: McqType;
    difficulty: "EASY" | "MEDIUM" | "HARD";
  }) => void;
  onOpenBulkUploader: () => void;
}) {
  const [name, setName] = useState("");
  const [problemCategory, setProblemCategory] = useState<string>("MCQ");
  const [level, setLevel] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a question name");
      return;
    }

    const isCoding = problemCategory === "CODING";
    let mcqType: McqType = "SINGLE_CORRECT";
    if (problemCategory === "TRUE_FALSE") mcqType = "TRUE_FALSE";
    else if (problemCategory === "ASSERTION_REASON") mcqType = "ASSERTION_REASON";
    else if (problemCategory === "FILL_IN_THE_BLANK") mcqType = "FILL_IN_THE_BLANK";
    else if (problemCategory === "MULTIPLE_CORRECT") mcqType = "MULTIPLE_CORRECT";

    onCreate({
      title: name.trim(),
      questionType: isCoding ? "CODING" : "MCQ",
      mcqType,
      difficulty: level,
    });
    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Blue Header Bar */}
        <div className="bg-[#4353a4] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-wide">Create new problem</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-6">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. Find Peak Element"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              className="w-full border-b-2 border-slate-200 focus:border-[#4353a4] px-1 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-400">A descriptive name helps.</p>
          </div>

          {/* Type & Level Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#4353a4]">
                Problem type
              </label>
              <div className="relative border-b-2 border-[#4353a4]">
                <select
                  value={problemCategory}
                  onChange={(e) => setProblemCategory(e.target.value)}
                  className="w-full appearance-none bg-transparent py-2 pr-8 text-sm text-slate-800 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="CODING">Coding</option>
                  <option value="MCQ">Multiple-choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="ASSERTION_REASON">Assertion Reason</option>
                  <option value="FILL_IN_THE_BLANK">Fill in the blanks</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4353a4]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500">
                Level
              </label>
              <div className="relative border-b-2 border-slate-200 focus-within:border-[#4353a4]">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as any)}
                  className="w-full appearance-none bg-transparent py-2 pr-8 text-sm text-slate-800 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                onClose();
                onOpenBulkUploader();
              }}
              className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[#4353a4] transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Use the bulk uploader</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-5 py-2 text-xs font-bold rounded bg-slate-200 text-slate-700 hover:bg-[#4353a4] hover:text-white disabled:opacity-40 disabled:hover:bg-slate-200 disabled:hover:text-slate-700 uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                CREATE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Import Questions Dialog ──────────────────────────────────────────────────

function ImportQuestionsDialog({
  isOpen,
  onClose,
  onImportSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}) {
  const { data: subjects = [] } = useSubjectsQuery();
  const bulkCreateMutation = useBulkCreateQuestionsMutation();

  const [activeTab, setActiveTab] = useState<"FILE" | "JSON">("FILE");
  const [defaultSubjectId, setDefaultSubjectId] = useState<string>("");
  const [jsonText, setJsonText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<CreateQuestionRequest[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Set initial default subject
  useEffect(() => {
    if (subjects.length > 0 && !defaultSubjectId) {
      setDefaultSubjectId(subjects[0].id);
    }
  }, [subjects, defaultSubjectId]);

  // UUID validation helper
  const isUUID = (val?: any): boolean =>
    typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  // Helper to parse Excel row
  const parseExcelRow = (row: any, fallbackSubId: string): CreateQuestionRequest | null => {
    const norm: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      norm[k.toLowerCase().replace(/[^a-z0-9]/g, "")] = v;
    }

    const prompt = norm.prompt || norm.description || norm.question || norm.problem || norm.questiontext;
    if (!prompt) return null;

    const rawType = (norm.type || norm.questiontype || "MCQ").toString().toUpperCase();
    const isCoding = rawType.includes("COD");
    const questionType = isCoding ? "CODING" : "MCQ";

    // Match subject by name or id
    let subId = fallbackSubId;
    const rawSub = (norm.subject || norm.subjectid || norm.subjectname || "").toString().trim();
    if (rawSub) {
      if (isUUID(rawSub)) {
        subId = rawSub;
      } else {
        const match = subjects.find(
          (s) => s.id.toLowerCase() === rawSub.toLowerCase() || s.name.toLowerCase() === rawSub.toLowerCase()
        );
        if (match) subId = match.id;
      }
    }

    const rawTopic = (norm.topic || norm.topicid || norm.topicname || "").toString().trim();
    const rawSubtopic = (norm.subtopic || norm.subtopicid || norm.subtopicname || "").toString().trim();

    const title = norm.title || (String(prompt).length > 50 ? String(prompt).slice(0, 50) + "..." : String(prompt));
    const marks = Math.max(1, Number(norm.marks || norm.points || norm.score) || 1);
    const rawDiff = (norm.difficulty || "MEDIUM").toString().toUpperCase();
    const difficulty = rawDiff === "EASY" ? "EASY" : rawDiff === "HARD" ? "HARD" : "MEDIUM";
    const avg_time_seconds = Math.max(0, Number(norm.avgtimeseconds || norm.time || norm.avgtime) || 90);

    let tags: string[] = [];
    const rawTags = norm.tags || norm.tag || norm.categories;
    if (Array.isArray(rawTags)) {
      tags = rawTags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof rawTags === "string") {
      tags = rawTags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    const base: Partial<CreateQuestionRequest> = {
      questionType,
      prompt: String(prompt).trim(),
      title: String(title).trim(),
      subject_id: isUUID(subId) ? subId : fallbackSubId,
      topic_id: isUUID(rawTopic) ? rawTopic : undefined,
      subtopic_id: isUUID(rawSubtopic) ? rawSubtopic : undefined,
      marks,
      difficulty,
      visibility: "ORG_OWNED",
      avg_time_seconds,
      domain: "ENGINEERING",
      cognitiveLevel: "APPLY",
      p_value: 0.45,
      discrimination_index: 0.35,
      status: "ACTIVE",
      tags: tags.length ? tags : undefined,
    };

    if (questionType === "MCQ") {
      const options: McqOption[] = [];
      const correctRaw = String(norm.correctoption || norm.correctanswer || norm.answer || norm.correct || "1").toLowerCase();

      for (let i = 1; i <= 10; i++) {
        const optVal = norm[`option${i}`] || norm[`opt${i}`] || norm[`choice${i}`];
        if (optVal != null && String(optVal).trim()) {
          const optText = String(optVal).trim();
          const isNumMatch = correctRaw.includes(String(i));
          const isLetterMatch = correctRaw.includes(String.fromCharCode(96 + i));
          const isTextMatch = correctRaw === optText.toLowerCase();
          options.push({
            text: optText,
            isCorrect: isNumMatch || isLetterMatch || isTextMatch,
          });
        }
      }

      if (options.length < 2) {
        options.push({ text: "Option A", isCorrect: true }, { text: "Option B", isCorrect: false });
      } else if (!options.some((o) => o.isCorrect)) {
        options[0].isCorrect = true;
      }

      const multipleCorrect = options.filter((o) => o.isCorrect).length > 1;

      let mcqType: "SINGLE_CORRECT" | "MULTIPLE_CORRECT" | "TRUE_FALSE" | "ASSERTION_REASON" | "FILL_IN_THE_BLANK" =
        multipleCorrect ? "MULTIPLE_CORRECT" : "SINGLE_CORRECT";

      const optTexts = options.map((o) => o.text.toLowerCase().trim());
      const isTF =
        optTexts.length === 2 &&
        ((optTexts[0] === "true" && optTexts[1] === "false") ||
          (optTexts[0] === "false" && optTexts[1] === "true"));

      const rawSubtype = String(norm.subtype || norm.mcqtype || norm.type || "").toUpperCase();
      const fullText = `${norm.title || ""} ${prompt || ""}`.toLowerCase();

      if (isTF || rawSubtype.includes("TRUE") || rawSubtype.includes("FALSE")) {
        mcqType = "TRUE_FALSE";
      } else if (
        rawSubtype.includes("ASSERT") ||
        fullText.includes("assertion") ||
        fullText.includes("reason (r)") ||
        fullText.includes("(a) and (r)")
      ) {
        mcqType = "ASSERTION_REASON";
      } else if (
        rawSubtype.includes("BLANK") ||
        rawSubtype.includes("FILL") ||
        fullText.includes("fill in the blank") ||
        fullText.includes("_____") ||
        fullText.includes("__________")
      ) {
        mcqType = "FILL_IN_THE_BLANK";
      }

      return {
        ...(base as CreateQuestionRequest),
        mcqType,
        multipleCorrect,
        shuffleOptions: mcqType !== "TRUE_FALSE" && mcqType !== "ASSERTION_REASON",
        mcqOptions: options,
      };
    } else {
      // ─── Extract or Generate 2-3 Sample Test Cases + 6-7 Hidden Test Cases ───
      const rawTestCases: Array<{
        input: string;
        expectedOutput: string;
        sample: boolean;
        weight: number;
        explanation?: string;
      }> = [];

      // 1. Check explicit columns in spreadsheet (e.g. Sample Input 1..3, Hidden Input 1..7)
      for (let i = 1; i <= 5; i++) {
        const inVal = norm[`sampleinput${i}`] || norm[`sample_input_${i}`] || norm[`sample_input${i}`] || (i === 1 ? (norm.sampleinput || norm.sample_input || norm.input) : null);
        const outVal = norm[`sampleoutput${i}`] || norm[`sample_output_${i}`] || norm[`sample_output${i}`] || (i === 1 ? (norm.sampleoutput || norm.sample_output || norm.output || norm.expectedoutput || norm.expected_output) : null);
        const expVal = norm[`sampleexplanation${i}`] || norm[`sample_explanation_${i}`] || (i === 1 ? (norm.sampleexplanation || norm.explanation) : undefined);
        if (inVal && outVal) {
          rawTestCases.push({
            input: String(inVal).trim(),
            expectedOutput: String(outVal).trim(),
            sample: true,
            weight: 10,
            explanation: expVal ? String(expVal).trim() : undefined,
          });
        }
      }

      for (let i = 1; i <= 10; i++) {
        const inVal = norm[`hiddeninput${i}`] || norm[`hidden_input_${i}`] || norm[`hidden_input${i}`] || norm[`testcase${i}input`] || norm[`testcase_${i}_input`];
        const outVal = norm[`hiddenoutput${i}`] || norm[`hidden_output_${i}`] || norm[`hidden_output${i}`] || norm[`testcase${i}output`] || norm[`testcase_${i}_output`];
        if (inVal && outVal) {
          rawTestCases.push({
            input: String(inVal).trim(),
            expectedOutput: String(outVal).trim(),
            sample: false,
            weight: 10,
          });
        }
      }

      // 2. If no explicit columns, parse from prompt & explanation text (e.g. Example 1, Example 2, Input: ... Output: ...)
      if (rawTestCases.length === 0) {
        const fullText = `${norm.prompt || prompt || ""}\n${norm.sampleexplanation || ""}\n${norm.constraints || ""}`;
        const exampleRegex = /(?:Example\s*(\d+)|\*\*Example\s*(\d+)\*\*|###\s*Example\s*(\d+))[\s\S]*?(?:Input|\*\*Input:\*\*)\s*[:\.]?\s*`?([^`\n\r]+)`?[\s\S]*?(?:Output|\*\*Output:\*\*)\s*[:\.]?\s*`?([^`\n\r]+)`?(?:[\s\S]*?(?:Explanation|\*\*Explanation:\*\*)\s*[:\.]?\s*([^\n\r]+))?/gi;
        
        let match;
        while ((match = exampleRegex.exec(fullText)) !== null && rawTestCases.length < 3) {
          const rawIn = match[4]?.trim();
          const rawOut = match[5]?.trim();
          const rawExp = match[6]?.trim();
          if (rawIn && rawOut) {
            rawTestCases.push({
              input: rawIn.replace(/^nums\s*=\s*/i, "").replace(/^coins\s*=\s*/i, "").trim(),
              expectedOutput: rawOut.trim(),
              sample: true,
              weight: 15,
              explanation: rawExp || undefined,
            });
          }
        }
      }

      // 3. Ensure at least 2-3 sample test cases and 6-7 hidden test cases for robust grading
      const pLower = (norm.title || prompt || "").toLowerCase();
      
      // Fallback base examples tailored for common standard problems if empty
      if (rawTestCases.filter((t) => t.sample).length < 2) {
        if (pLower.includes("coin") || pLower.includes("change") || pLower.includes("amount")) {
          rawTestCases.push(
            { input: "[1, 2, 5]\n11", expectedOutput: "3", sample: true, weight: 10, explanation: "11 = 5 + 5 + 1 (3 coins)" },
            { input: "[2]\n3", expectedOutput: "-1", sample: true, weight: 10, explanation: "Cannot make amount 3 with denomination 2" },
            { input: "[1]\n0", expectedOutput: "0", sample: true, weight: 10, explanation: "0 amount requires 0 coins" }
          );
        } else if (pLower.includes("subarray") || pLower.includes("k elements") || pLower.includes("sliding")) {
          rawTestCases.push(
            { input: "[2, 1, 5, 1, 3, 2]\n3", expectedOutput: "9", sample: true, weight: 10, explanation: "Subarray [5, 1, 3] gives max sum 9" },
            { input: "[2, 3, 4, 1, 5]\n2", expectedOutput: "7", sample: true, weight: 10, explanation: "Subarray [3, 4] gives sum 7" },
            { input: "[1, 2, 3]\n1", expectedOutput: "3", sample: true, weight: 10, explanation: "Max single element is 3" }
          );
        } else {
          rawTestCases.push(
            { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0, 1]", sample: true, weight: 10, explanation: "nums[0] + nums[1] == 9" },
            { input: "[3, 2, 4]\n6", expectedOutput: "[1, 2]", sample: true, weight: 10, explanation: "nums[1] + nums[2] == 6" },
            { input: "[3, 3]\n6", expectedOutput: "[0, 1]", sample: true, weight: 10, explanation: "nums[0] + nums[1] == 6" }
          );
        }
      }

      // Add 6-7 hidden test cases for edge cases, large numbers, boundary tests
      const currentHidden = rawTestCases.filter((t) => !t.sample);
      if (currentHidden.length < 6) {
        if (pLower.includes("coin") || pLower.includes("change")) {
          rawTestCases.push(
            { input: "[1, 3, 4, 5]\n7", expectedOutput: "2", sample: false, weight: 10 },
            { input: "[186, 419, 83, 408]\n6249", expectedOutput: "20", sample: false, weight: 10 },
            { input: "[2, 4, 6, 8]\n15", expectedOutput: "-1", sample: false, weight: 10 },
            { input: "[1]\n10000", expectedOutput: "10000", sample: false, weight: 10 },
            { input: "[1, 2, 5, 10, 20, 50, 100]\n999", expectedOutput: "14", sample: false, weight: 10 },
            { input: "[3, 7, 405, 436]\n8839", expectedOutput: "25", sample: false, weight: 10 },
            { input: "[2, 5, 10, 1]\n27", expectedOutput: "4", sample: false, weight: 10 }
          );
        } else if (pLower.includes("subarray") || pLower.includes("sliding")) {
          rawTestCases.push(
            { input: "[-1, -2, -3, -4]\n2", expectedOutput: "-3", sample: false, weight: 10 },
            { input: "[10, 20, 30, 40, 50]\n5", expectedOutput: "150", sample: false, weight: 10 },
            { input: "[1, 4, 2, 10, 23, 3, 1, 0, 20]\n4", expectedOutput: "39", sample: false, weight: 10 },
            { input: "[100, 200, 300, 400]\n2", expectedOutput: "700", sample: false, weight: 10 },
            { input: "[5, -10, 20, -5, 30, 40]\n3", expectedOutput: "65", sample: false, weight: 10 },
            { input: "[0, 0, 0, 0, 0]\n3", expectedOutput: "0", sample: false, weight: 10 },
            { input: "[9, 1, 8, 2, 7, 3, 6, 4, 5]\n3", expectedOutput: "18", sample: false, weight: 10 }
          );
        } else {
          rawTestCases.push(
            { input: "[1, 5, 9, 13, 17]\n22", expectedOutput: "[1, 3]", sample: false, weight: 10 },
            { input: "[-3, 4, 3, 90]\n0", expectedOutput: "[0, 2]", sample: false, weight: 10 },
            { input: "[0, 4, 3, 0]\n0", expectedOutput: "[0, 3]", sample: false, weight: 10 },
            { input: "[-1, -2, -3, -4, -5]\n-8", expectedOutput: "[2, 4]", sample: false, weight: 10 },
            { input: "[1000000, 500, 2000000]\n3000000", expectedOutput: "[0, 2]", sample: false, weight: 10 },
            { input: "[2, 5, 5, 11]\n10", expectedOutput: "[1, 2]", sample: false, weight: 10 },
            { input: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n19", expectedOutput: "[8, 9]", sample: false, weight: 10 }
          );
        }
      }

      // Balance weights to sum exactly 100
      const totalCount = rawTestCases.length;
      const baseWeight = Math.floor(100 / totalCount);
      const remainder = 100 - baseWeight * totalCount;
      const finalTestCases = rawTestCases.map((tc, idx) => ({
        ...tc,
        weight: baseWeight + (idx === 0 ? remainder : 0),
      }));

      return {
        ...(base as CreateQuestionRequest),
        constraints: norm.constraints || undefined,
        timeLimitSecs: Number(norm.timelimit || norm.timelimitsecs) || 2,
        memoryLimitMb: Number(norm.memorylimit || norm.memorylimitmb) || 256,
        sampleExplanation: norm.sampleexplanation || norm.explanation || undefined,
        testCases: finalTestCases,
        languageTemplates: {
          java: { code: "// Write your code here", lang: "java", langSlug: "java" },
          python: { code: "# Write your code here", lang: "python", langSlug: "python" },
          javascript: { code: "// Write your code here", lang: "javascript", langSlug: "javascript" },
        },
        signatureMetadata: { functionName: "solve" },
      };
    }
  };

  // Handle Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);

    const isJson = file.name.endsWith(".json");
    const reader = new FileReader();

    if (isJson) {
      reader.onload = (evt) => {
        try {
          const raw = JSON.parse(evt.target?.result as string);
          const list = Array.isArray(raw) ? raw : [raw];
          const questions: CreateQuestionRequest[] = list.map((item) => ({
            ...item,
            subject_id: item.subject_id || item.subjectId || defaultSubjectId,
            visibility: item.visibility || "ORG_OWNED",
            marks: item.marks ? Math.max(1, Number(item.marks)) : 1,
            domain: item.domain || "ENGINEERING",
            cognitiveLevel: item.cognitiveLevel || "APPLY",
            status: item.status || "ACTIVE",
          }));
          setParsedQuestions(questions);
          setJsonText(JSON.stringify(questions, null, 2));
        } catch (err: any) {
          setParseError("Invalid JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);

          if (!rows.length) {
            setParseError("The uploaded Excel sheet contains no rows.");
            return;
          }

          const questions: CreateQuestionRequest[] = [];
          for (const row of rows) {
            const parsed = parseExcelRow(row, defaultSubjectId);
            if (parsed) questions.push(parsed);
          }

          if (questions.length === 0) {
            setParseError("Could not extract any valid questions from the Excel file. Please check column headers.");
            return;
          }

          setParsedQuestions(questions);
          setJsonText(JSON.stringify(questions, null, 2));
        } catch (err: any) {
          setParseError("Failed to parse Excel file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle JSON Textarea Change
  const handleJsonChange = (text: string) => {
    setJsonText(text);
    setParseError(null);
    if (!text.trim()) {
      setParsedQuestions([]);
      return;
    }
    try {
      const raw = JSON.parse(text);
      const list = Array.isArray(raw) ? raw : [raw];
      const questions: CreateQuestionRequest[] = list.map((item) => ({
        ...item,
        subject_id: item.subject_id || item.subjectId || defaultSubjectId,
        visibility: item.visibility || "ORG_OWNED",
        marks: item.marks ? Math.max(1, Number(item.marks)) : 1,
        domain: item.domain || "ENGINEERING",
        cognitiveLevel: item.cognitiveLevel || "APPLY",
        status: item.status || "ACTIVE",
      }));
      setParsedQuestions(questions);
    } catch {
      setParseError("Invalid JSON syntax");
    }
  };

  // Download Sample Excel
  const downloadSampleExcel = () => {
    const sampleRows = [
      {
        Title: "Two Sum Problem",
        Type: "Coding",
        Prompt: "You are given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
        Difficulty: "Easy",
        Marks: 10,
        "Time Limit (s)": 2,
        "Memory Limit (MB)": 256,
        Constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
        "Sample Explanation": "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
        Tags: "arrays, hash-table, algorithms",
        "Avg Time (s)": 600,
        "Sample Input 1": "[2, 7, 11, 15]\n9",
        "Sample Output 1": "[0, 1]",
        "Sample Explanation 1": "Because nums[0] + nums[1] == 9, we return [0, 1].",
        "Sample Input 2": "[3, 2, 4]\n6",
        "Sample Output 2": "[1, 2]",
        "Sample Input 3": "[3, 3]\n6",
        "Sample Output 3": "[0, 1]",
        "Hidden Input 1": "[1, 5, 9, 13, 17]\n22",
        "Hidden Output 1": "[1, 3]",
        "Hidden Input 2": "[-3, 4, 3, 90]\n0",
        "Hidden Output 2": "[0, 2]",
        "Hidden Input 3": "[0, 4, 3, 0]\n0",
        "Hidden Output 3": "[0, 3]",
        "Hidden Input 4": "[-1, -2, -3, -4, -5]\n-8",
        "Hidden Output 4": "[2, 4]",
        "Hidden Input 5": "[1000000, 500, 2000000]\n3000000",
        "Hidden Output 5": "[0, 2]",
        "Hidden Input 6": "[2, 5, 5, 11]\n10",
        "Hidden Output 6": "[1, 2]",
        "Hidden Input 7": "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n19",
        "Hidden Output 7": "[8, 9]",
      },
      {
        Title: "Thread Safety in Java HashMap",
        Type: "MCQ",
        Prompt: "Which data structure provides synchronized thread-safe access in Java collections?",
        Difficulty: "Medium",
        Marks: 3,
        "Option 1": "ConcurrentHashMap",
        "Option 2": "HashMap",
        "Option 3": "TreeMap",
        "Option 4": "WeakHashMap",
        "Correct Option": "1",
        Tags: "java, concurrency, collections",
        "Avg Time (s)": 90,
      },
      {
        Title: "SQL Transaction Isolation",
        Type: "MCQ",
        Prompt: "Which SQL isolation level prevents Phantom Reads?",
        Difficulty: "Hard",
        Marks: 4,
        "Option 1": "Serializable",
        "Option 2": "Read Committed",
        "Option 3": "Repeatable Read",
        "Option 4": "Read Uncommitted",
        "Correct Option": "1",
        Tags: "sql, dbms, acid",
        "Avg Time (s)": 120,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "sample_question_bank_template.xlsx");
  };

  // Download Sample Coding Excel
  const downloadSampleCodingExcel = () => {
    const a = document.createElement("a");
    a.href = "/coding_questions_sample.xlsx";
    a.download = "coding_questions_sample.xlsx";
    a.click();
  };

  // Download Sample JSON
  const downloadSampleJson = () => {
    const sampleJson = [
      {
        questionType: "MCQ",
        title: "Thread Safety in Java HashMap",
        prompt: "Which data structure provides synchronized thread-safe access in Java collections?",
        difficulty: "MEDIUM",
        marks: 3,
        visibility: "ORG_OWNED",
        mcqType: "SINGLE_CORRECT",
        multipleCorrect: false,
        shuffleOptions: true,
        tags: ["java", "concurrency"],
        avg_time_seconds: 90,
        mcqOptions: [
          { text: "ConcurrentHashMap", isCorrect: true },
          { text: "HashMap", isCorrect: false },
          { text: "TreeMap", isCorrect: false },
          { text: "WeakHashMap", isCorrect: false },
        ],
      },
      {
        questionType: "CODING",
        title: "LRU Cache Implementation",
        prompt: "Design a data structure that follows the constraints of a Least Recently Used (LRU) Cache.\n\nImplement the LRUCache class with get and put methods in O(1) time complexity.",
        difficulty: "HARD",
        marks: 10,
        visibility: "ORG_OWNED",
        timeLimitSecs: 3,
        memoryLimitMb: 512,
        constraints: "1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5",
        sampleExplanation: "LRUCache cache = new LRUCache(2);\ncache.put(1, 1);\ncache.get(1); // returns 1",
        tags: ["data-structures", "lru-cache", "design"],
        avg_time_seconds: 1200,
        languageTemplates: {
          java: { code: "// Write your code here", lang: "java", langSlug: "java" },
          python: { code: "# Write your code here", lang: "python", langSlug: "python" },
        },
        signatureMetadata: { functionName: "LRUCache" },
      },
    ];

    const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_question_bank_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };


  // Submit bulk create
  const handleBulkSubmit = async () => {
    if (!parsedQuestions.length) {
      toast.error("No questions to import. Please upload a valid file or JSON.");
      return;
    }

    const fallbackSub = isUUID(defaultSubjectId) ? defaultSubjectId : subjects[0]?.id;

    // Ensure subject is attached and all UUID fields are valid
    const payload = parsedQuestions.map((q) => {
      const isMcq = (q.questionType ?? "MCQ").toUpperCase() === "MCQ";
      const subject_id = isUUID(q.subject_id) ? q.subject_id : fallbackSub;
      const topic_id = isUUID(q.topic_id) ? q.topic_id : undefined;
      const subtopic_id = isUUID(q.subtopic_id) ? q.subtopic_id : undefined;

      if (isMcq) {
        const multipleCorrect = Boolean(q.multipleCorrect);
        return {
          ...q,
          questionType: "MCQ" as const,
          subject_id,
          topic_id,
          subtopic_id,
          visibility: "ORG_OWNED" as const,
          mcqType: q.mcqType || (multipleCorrect ? "MULTIPLE_CORRECT" : "SINGLE_CORRECT"),
          multipleCorrect,
          shuffleOptions: q.shuffleOptions ?? true,
          marks: Math.max(1, Number(q.marks) || 1),
          avg_time_seconds: Math.max(0, Number(q.avg_time_seconds) || 90),
          domain: "ENGINEERING" as const,
          cognitiveLevel: "APPLY" as const,
          p_value: 0.45,
          discrimination_index: 0.35,
          status: "ACTIVE" as const,
          mcqOptions: (q.mcqOptions || []).map((o) => ({
            text: String(o.text || "").trim(),
            isCorrect: Boolean(o.isCorrect),
          })),
        };
      } else {
        return {
          ...q,
          questionType: "CODING" as const,
          title: q.title || "Coding Challenge",
          prompt: q.prompt,
          subject_id,
          topic_id,
          subtopic_id,
          visibility: "ORG_OWNED" as const,
          marks: Math.max(1, Number(q.marks) || 1),
          avg_time_seconds: Math.max(0, Number(q.avg_time_seconds) || 300),
          timeLimitSecs: Number(q.timeLimitSecs) || 2,
          memoryLimitMb: Number(q.memoryLimitMb) || 256,
          constraints: q.constraints || undefined,
          sampleExplanation: q.sampleExplanation || undefined,
          domain: "ENGINEERING" as const,
          cognitiveLevel: "APPLY" as const,
          p_value: 0.45,
          discrimination_index: 0.35,
          status: "ACTIVE" as const,
          languageTemplates: q.languageTemplates || {
            java: { code: "// Write your code here", lang: "java", langSlug: "java" },
            python: { code: "# Write your code here", lang: "python", langSlug: "python" },
            javascript: { code: "// Write your code here", lang: "javascript", langSlug: "javascript" },
          },
          signatureMetadata: q.signatureMetadata || { functionName: "solve" },
          testCases: q.testCases || [],
        };
      }
    });

    console.log("[NewAdminLibrary] Bulk import payload:", payload);

    try {
      await bulkCreateMutation.mutateAsync(payload);
      toast.success(`Successfully imported ${payload.length} questions.`);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      console.error("[NewAdminLibrary] Bulk import error:", err);
      toast.error("Bulk import failed: " + (err.response?.data?.message || err.message || "Please check question parameters"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-3xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto overflow-x-hidden box-border shadow-2xl">
        <DialogHeader className="pr-8 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
              Import Questions
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload an Excel (.xlsx, .xls, .csv) or JSON file to add questions in bulk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              onClick={downloadSampleExcel}
              className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Sample MCQ Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>MCQ Excel</span>
            </button>
            <button
              onClick={downloadSampleCodingExcel}
              className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Sample Coding Questions Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Coding Excel</span>
            </button>
            <button
              onClick={downloadSampleJson}
              className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Sample JSON Template"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600" />
              <span>JSON</span>
            </button>
          </div>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <button
            onClick={() => setActiveTab("FILE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "FILE"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.xlsx / .json)</span>
          </button>
          <button
            onClick={() => setActiveTab("JSON")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "JSON"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Direct JSON Editor</span>
          </button>
        </div>

        {/* Default Subject Fallback */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-slate-50 border border-slate-200/80">
          <label className="text-xs font-semibold text-slate-700 shrink-0">
            Default Subject:
          </label>
          <select
            value={defaultSubjectId}
            onChange={(e) => setDefaultSubjectId(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-400 shrink-0">
            Fallback for rows without a subject
          </span>
        </div>

        {/* Tab Content */}
        {activeTab === "FILE" ? (
          <div className="w-full">
            <label className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors w-full">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700 text-center truncate max-w-full px-2">
                {fileName ? fileName : "Click to select or drag & drop questions file"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 text-center">
                Supports Excel (.xlsx, .xls, .csv) and JSON (.json)
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-1.5 w-full">
            <label className="block text-xs font-semibold text-slate-700">
              Paste Questions JSON Array:
            </label>
            <textarea
              rows={7}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="[ { &quot;questionType&quot;: &quot;MCQ&quot;, &quot;prompt&quot;: &quot;...&quot;, &quot;title&quot;: &quot;...&quot; } ]"
              className="w-full font-mono text-xs p-3 border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 box-border"
            />
          </div>
        )}

        {/* Error Alert */}
        {parseError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 break-words">{parseError}</span>
          </div>
        )}

        {/* Preview of Parsed Questions */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Parsed {parsedQuestions.length} Questions Ready for Import:
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto overflow-x-hidden border border-slate-200 divide-y divide-slate-100 bg-white w-full">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="p-3 text-xs flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors w-full">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-semibold text-slate-900 truncate">
                      {idx + 1}. {q.title || q.prompt}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 break-words">
                      {q.prompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {q.questionType}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px]">
                      {q.difficulty || "MEDIUM"}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {q.marks || 1} mk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkSubmit}
            disabled={bulkCreateMutation.isPending || parsedQuestions.length === 0}
            className="px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            {bulkCreateMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Import {parsedQuestions.length} Questions</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Dialog ───────────────────────────────────────────────────────────



// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewAdminLibrary() {
  const navigate = useNavigate();
  const { data: dbQuestions = [], isLoading, isError, refetch } = useQuestionsQuery();

  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType>("PUBLIC");
  const [problemType, setProblemType] = useState<ProblemType>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [searchQuery, setSearchQuery] = useState("");
  const [techSearch, setTechSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate counts per library
  const publicCount = useMemo(
    () => dbQuestions.filter((q) => (q.visibility ?? "PUBLIC") === "PUBLIC").length,
    [dbQuestions]
  );
  const orgCount = useMemo(
    () => dbQuestions.filter((q) => (q.visibility ?? "PUBLIC") === "ORG_OWNED").length,
    [dbQuestions]
  );

  useEffect(() => {
    if (dbQuestions && dbQuestions.length > 0) {
      console.log("[NewAdminLibrary] Fetched questions from backend:", dbQuestions);
      const orgQuestions = dbQuestions.filter((q) => q.visibility === "ORG_OWNED");
      console.log("[NewAdminLibrary] Org Owned questions:", orgQuestions);
      if (orgQuestions.length > 0) {
        console.log("[NewAdminLibrary] Latest Org Owned question:", {
          id: orgQuestions[0].id,
          title: orgQuestions[0].title,
          tags: orgQuestions[0].tags,
          prompt: orgQuestions[0].prompt,
          questionType: orgQuestions[0].questionType,
          visibility: orgQuestions[0].visibility,
        });
      }
    }
  }, [dbQuestions]);

  const filteredQuestions = useMemo(() => {
    const list = dbQuestions.filter((q) => {
      const vis = q.visibility ?? "PUBLIC";
      if (vis !== selectedLibrary) return false;
      if (problemType !== "ALL") {
        const qt = (q.questionType ?? "").toUpperCase();
        if (problemType === "CODING") {
          if (qt !== "CODING") return false;
        } else if (problemType === "MCQ") {
          if (qt !== "MCQ") return false;
        } else {
          // Specific MCQ Subtype filter (TRUE_FALSE, ASSERTION_REASON, FILL_IN_THE_BLANK)
          if (qt !== "MCQ") return false;
          const mt = getQuestionMcqType(q);
          if (mt !== problemType) return false;
        }
      }
      if (selectedLevel !== "ALL") {
        const diff = (q.difficulty ?? "").toUpperCase();
        if (diff !== selectedLevel) return false;
      }
      if (techSearch.trim()) {
        const ts = techSearch.trim().toLowerCase();
        const hit =
          (q.subject?.name ?? "").toLowerCase().includes(ts) ||
          (q.topic?.name ?? "").toLowerCase().includes(ts) ||
          (q.subtopic?.name ?? "").toLowerCase().includes(ts) ||
          (q.tags ?? []).some((t) => t.toLowerCase().includes(ts)) ||
          (q.title ?? "").toLowerCase().includes(ts);
        if (!hit) return false;
      }
      if (tagSearch.trim()) {
        const ts = tagSearch.trim().toLowerCase();
        const hasTag = (q.tags ?? []).some((t) => t.toLowerCase().includes(ts));
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase();
        const hit =
          (q.title ?? "").toLowerCase().includes(s) ||
          (q.prompt ?? "").toLowerCase().includes(s) ||
          (q.tags ?? []).some((t) => t.toLowerCase().includes(s)) ||
          (q.questionType ?? "").toLowerCase().includes(s);
        if (!hit) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "NEWEST") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.id || "").localeCompare(a.id || "");
      }
      if (sortBy === "OLDEST") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return (a.id || "").localeCompare(b.id || "");
      }
      return 0;
    });
  }, [dbQuestions, selectedLibrary, problemType, selectedLevel, techSearch, tagSearch, searchQuery, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLibrary, problemType, selectedLevel, techSearch, tagSearch, searchQuery, sortBy, pageSize]);

  const totalQuestions = filteredQuestions.length;
  const totalPages = Math.ceil(totalQuestions / pageSize) || 1;

  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  const startRecord = totalQuestions === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalQuestions);

  return (
    <div className="flex flex-col lg:flex-row gap-5 pb-16 items-start">
      {/* ── Left Sidebar ── */}
      <aside className="w-full lg:w-56 shrink-0 space-y-4">
        {/* Available Libraries Card (DoSelect Style) */}
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-4 overflow-hidden space-y-4">
          <p className="text-xs font-normal text-slate-500 px-4">Available libraries</p>
          <div className="space-y-3">
            {/* Public Questions */}
            <button
              onClick={() => setSelectedLibrary("PUBLIC")}
              className={`w-full flex items-center gap-3.5 px-4 py-1 text-left transition-colors relative ${
                selectedLibrary === "PUBLIC"
                  ? "text-[#6366F1] font-medium"
                  : "text-slate-700 hover:text-slate-900 font-normal"
              }`}
            >
              {selectedLibrary === "PUBLIC" && (
                <span className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#6366F1]" />
              )}
              <ShoppingCart
                className={`w-4 h-4 shrink-0 ${
                  selectedLibrary === "PUBLIC" ? "text-[#6366F1]" : "text-slate-500"
                }`}
              />
              <span className="text-[13px] leading-none">Public questions</span>
            </button>

            {/* My company questions */}
            <button
              onClick={() => setSelectedLibrary("ORG_OWNED")}
              className={`w-full flex items-center gap-3.5 px-4 py-1 text-left transition-colors relative ${
                selectedLibrary === "ORG_OWNED"
                  ? "text-[#6366F1] font-medium"
                  : "text-slate-700 hover:text-slate-900 font-normal"
              }`}
            >
              {selectedLibrary === "ORG_OWNED" && (
                <span className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#6366F1]" />
              )}
              <Files
                className={`w-4 h-4 shrink-0 ${
                  selectedLibrary === "ORG_OWNED" ? "text-[#6366F1]" : "text-slate-500"
                }`}
              />
              <span className="text-[13px] leading-none">My company questions</span>
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-800">Filters</span>
            <button
              onClick={() => {
                setProblemType("ALL");
                setSearchQuery("");
                setTechSearch("");
                setTagSearch("");
                setSelectedLevel("ALL");
              }}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Problem type</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "ALL", label: "All" },
                { key: "CODING", label: "Coding" },
                { key: "MCQ", label: "Multiple-choice" },
                { key: "TRUE_FALSE", label: "True / False" },
                { key: "ASSERTION_REASON", label: "Assertion Reason" },
                { key: "FILL_IN_THE_BLANK", label: "Fill in the blanks" },
              ].map((item) => {
                const active = problemType === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setProblemType(item.key as ProblemType)}
                    className={`px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-[#1E293B] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Technologies Card (DoSelect Style) */}
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-700">Technologies</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a technology..."
              value={techSearch}
              onChange={(e) => setTechSearch(e.target.value)}
              className="w-full border-b border-slate-200 focus:border-[#4353a4] text-xs text-slate-800 placeholder-slate-400 py-1.5 focus:outline-none bg-transparent"
            />
            {techSearch && (
              <button
                onClick={() => setTechSearch("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tags Card (DoSelect Style) */}
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-700">Tags</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a tag..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="w-full border-b border-slate-200 focus:border-[#4353a4] text-xs text-slate-800 placeholder-slate-400 py-1.5 focus:outline-none bg-transparent"
            />
            {tagSearch && (
              <button
                onClick={() => setTagSearch("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Other Filters Card (Level Dropdown) */}
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Other filters</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Level</span>
            <div className="relative flex items-center">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="appearance-none bg-transparent pr-5 pl-1 py-1 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right Main Area ── */}
      <main className="flex-1 w-full space-y-4 min-w-0">
        {/* Search + Sort + Create Button (DoSelect Style) */}
        <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[240px] flex items-center gap-2.5 border border-slate-200/90 px-3.5 py-2.5 bg-white text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search questions by title, tag or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown Button */}
          <div className="relative flex items-center border border-slate-200/90 px-3.5 py-2.5 bg-white text-xs text-slate-700 font-normal hover:bg-slate-50/50 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-transparent pr-1 text-xs text-slate-700 font-normal focus:outline-none cursor-pointer"
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
            </select>
          </div>

          {/* Import Questions Button */}
          <button
            onClick={() => setImportOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Questions</span>
          </button>

          {/* Create Question Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold shadow-sm bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Question</span>
          </button>
        </div>

        {/* Questions List */}
        <div className="bg-white border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex justify-center items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              Loading questions...
            </div>
          ) : isError ? (
            <div className="py-14 text-center text-slate-500 text-xs space-y-3">
              <p className="text-slate-600 font-medium">Failed to load questions from server.</p>
              <button
                onClick={() => refetch()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs space-y-3">
              <p>No questions match the current filters.</p>
              <button
                onClick={() => { setProblemType("ALL"); setSearchQuery(""); }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedQuestions.map((q) => {
                const isCoding = (q.questionType ?? "").toUpperCase() === "CODING";
                const time = fmtTime(q);
                return (
                  <div key={q.id} className="p-6 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                    {/* Header Row: Title & Action Icons */}
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-bold text-slate-900 text-[15px] leading-snug">
                        {q.title || "Not available"}
                      </h3>
                      <div className="flex items-center gap-3 shrink-0 text-slate-400">
                        {isCoding && (
                          <button
                            onClick={() => navigate(`/new-admin/playground/${q.id}`)}
                            className="p-0.5 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Open Playground"
                          >
                            <Terminal className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (isCoding) {
                              navigate(`/new-admin/playground/${q.id}`);
                            } else {
                              navigate(`/new-admin/questions/preview/${q.id}`, { state: q });
                            }
                          }}
                          className="p-0.5 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Preview Question"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                        <button
                          className="p-0.5 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Question Statistics"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Row (DoSelect Style: ≡ MCQ, ⊙ Single, BarChart2 Hard, Clock 10 mins.) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-mono text-[13px] leading-none">≡</span>
                        <span>{isCoding ? "Coding" : "MCQ"}</span>
                      </div>

                      {!isCoding && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[11px] leading-none">⊙</span>
                          <span>{fmtMcqType(getQuestionMcqType(q))}</span>
                        </div>
                      )}

                      {q.difficulty && (
                        <div className="flex items-center gap-1">
                          <DifficultyIcon level={q.difficulty} />
                          <span>{fmt(q.difficulty)}</span>
                        </div>
                      )}

                      {time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{time}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {q.tags && q.tags.length > 0 ? (
                        q.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 bg-slate-100/90 text-slate-600 font-normal border border-slate-200"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not available</span>
                      )}
                    </div>

                    {/* Problem Statement / Description */}
                    <p className="pt-0.5 text-xs text-slate-600 leading-relaxed font-normal line-clamp-3">
                      {q.prompt || "Not available"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Card (DoSelect Style) */}
        {!isLoading && !isError && totalQuestions > 0 && (
          <div className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3 flex flex-wrap items-center justify-end gap-5 text-xs text-slate-600">
            {/* Page Selector */}
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
                PAGE:
              </span>
              <div className="relative flex items-center">
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="appearance-none bg-transparent pr-4 pl-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-transparent pr-4 pl-1 py-0.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              </div>
            </div>

            {/* Record range badge */}
            <span className="px-2 py-0.5 bg-slate-100 text-[11px] font-medium text-slate-600">
              {startRecord} - {endRecord} OF {totalQuestions}
            </span>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Step 1: Create Problem Modal (DoSelect Style) */}
      <CreateProblemModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={(initialData) => {
          setCreateModalOpen(false);
          navigate("/new-admin/questions/create", { state: initialData });
        }}
        onOpenBulkUploader={() => setImportOpen(true)}
      />

      {/* Import Questions Dialog */}
      <ImportQuestionsDialog
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImportSuccess={() => {
          setSelectedLibrary("ORG_OWNED");
          setSortBy("NEWEST");
        }}
      />
    </div>
  );
}
