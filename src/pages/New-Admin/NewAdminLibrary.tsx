import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  Building2,
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
  FolderTree,
  Edit,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  useQuestionsQuery,
  useSubjectsQuery,
  useTopicsQuery,
  useSubtopicsQuery,
  useCreateQuestionMutation,
  useBulkCreateQuestionsMutation,
} from "@/hooks/use-query-hooks";
import {
  ParsedQuestionRow,
  TaxonomyContext,
  parseImportRow,
  generateMcqExcelTemplate,
  generateCodingExcelTemplate,
} from "@/lib/admin/questionImport";
import { testService, Question, McqOption, McqType, CreateQuestionRequest } from "@/lib/test-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


// ─── Types ───────────────────────────────────────────────────────────────────

type LibraryType = "PUBLIC" | "ORG_OWNED";
type ProblemType =
  | "ALL"
  | "CODING"
  | "LANGUAGE_SPECIFIC_CODING"
  | "SINGLE_CORRECT"
  | "MULTIPLE_CORRECT"
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
      return "Single Choice";
    case "MULTIPLE_CORRECT":
      return "Multiple Choice";
    case "TRUE_FALSE":
      return "True / False";
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
    isLanguageSpecific?: boolean;
  }) => void;
  onOpenBulkUploader: () => void;
}) {
  const [name, setName] = useState("");
  const [problemCategory, setProblemCategory] = useState<string>("SINGLE_CORRECT");
  const [level, setLevel] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a question name");
      return;
    }

    const isCoding = problemCategory === "CODING" || problemCategory === "LANGUAGE_SPECIFIC_CODING";
    const isLanguageSpecific = problemCategory === "LANGUAGE_SPECIFIC_CODING";
    let mcqType: McqType = "SINGLE_CORRECT";
    if (problemCategory === "MULTIPLE_CORRECT") mcqType = "MULTIPLE_CORRECT";
    else if (problemCategory === "TRUE_FALSE") mcqType = "TRUE_FALSE";
    else if (problemCategory === "ASSERTION_REASON") mcqType = "ASSERTION_REASON";
    else if (problemCategory === "FILL_IN_THE_BLANK") mcqType = "FILL_IN_THE_BLANK";

    onCreate({
      title: name.trim(),
      questionType: isCoding ? "CODING" : "MCQ",
      mcqType,
      difficulty: level,
      isLanguageSpecific,
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
                  <option value="LANGUAGE_SPECIFIC_CODING">Language Specific</option>
                  <option value="SINGLE_CORRECT">Single Choice</option>
                  <option value="MULTIPLE_CORRECT">Multiple Choice</option>
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
  const { data: allTopics = [] } = useTopicsQuery();
  const { data: allSubtopics = [] } = useSubtopicsQuery();
  const bulkCreateMutation = useBulkCreateQuestionsMutation();

  const [activeTab, setActiveTab] = useState<"FILE" | "JSON">("FILE");
  const [defaultSubjectId, setDefaultSubjectId] = useState<string>("");
  const [defaultTopicId, setDefaultTopicId] = useState<string>("");
  const [defaultSubtopicId, setDefaultSubtopicId] = useState<string>("");

  const [jsonText, setJsonText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedQuestionRow[]>([]);
  const [rawFileRows, setRawFileRows] = useState<any[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Set initial default subject
  useEffect(() => {
    if (subjects.length > 0 && !defaultSubjectId) {
      setDefaultSubjectId(subjects[0].id);
    }
  }, [subjects, defaultSubjectId]);

  // Cascading topics filtered by selected default subject
  const availableDefaultTopics = subjects.length > 0 && defaultSubjectId
    ? allTopics.filter((t) => t.subjectId === defaultSubjectId || (t.subject && t.subject.id === defaultSubjectId))
    : [];

  // Cascading subtopics filtered by selected default topic
  const availableDefaultSubtopics = defaultTopicId
    ? allSubtopics.filter((st) => st.topicId === defaultTopicId || (st.topic && st.topic.id === defaultTopicId))
    : [];

  // Helper to re-parse rows when default taxonomy fallbacks change
  const reparseRowsWithContext = (
    subId: string,
    topId: string,
    subtopId: string,
    sourceRows: any[]
  ) => {
    const context: TaxonomyContext = {
      subjects,
      topics: allTopics,
      subtopics: allSubtopics,
      fallbackSubjectId: subId,
      fallbackTopicId: topId || undefined,
      fallbackSubtopicId: subtopId || undefined,
    };

    const nextRows: ParsedQuestionRow[] = [];
    for (let i = 0; i < sourceRows.length; i++) {
      const parsed = parseImportRow(sourceRows[i], i + 1, context, "ORG_OWNED");
      if (parsed) nextRows.push(parsed);
    }
    setParsedRows(nextRows);
    setJsonText(JSON.stringify(nextRows.map((r) => r.question), null, 2));
  };

  const handleDefaultSubjectChange = (newSubId: string) => {
    setDefaultSubjectId(newSubId);
    setDefaultTopicId("");
    setDefaultSubtopicId("");
    if (rawFileRows && rawFileRows.length > 0) {
      reparseRowsWithContext(newSubId, "", "", rawFileRows);
    }
  };

  const handleDefaultTopicChange = (newTopId: string) => {
    setDefaultTopicId(newTopId);
    setDefaultSubtopicId("");
    if (rawFileRows && rawFileRows.length > 0) {
      reparseRowsWithContext(defaultSubjectId, newTopId, "", rawFileRows);
    }
  };

  const handleDefaultSubtopicChange = (newSubtopId: string) => {
    setDefaultSubtopicId(newSubtopId);
    if (rawFileRows && rawFileRows.length > 0) {
      reparseRowsWithContext(defaultSubjectId, defaultTopicId, newSubtopId, rawFileRows);
    }
  };

  // Handle Excel/JSON File Upload
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
          setRawFileRows(list);
          reparseRowsWithContext(defaultSubjectId, defaultTopicId, defaultSubtopicId, list);
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

          setRawFileRows(rows);
          reparseRowsWithContext(defaultSubjectId, defaultTopicId, defaultSubtopicId, rows);
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
      setParsedRows([]);
      setRawFileRows(null);
      return;
    }
    try {
      const raw = JSON.parse(text);
      const list = Array.isArray(raw) ? raw : [raw];
      setRawFileRows(list);
      reparseRowsWithContext(defaultSubjectId, defaultTopicId, defaultSubtopicId, list);
    } catch {
      setParseError("Invalid JSON syntax");
    }
  };

  // Inline row topic mapping
  const handleRowTopicChange = (rowIndex: number, newTopicId: string) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[rowIndex] };
      const matchedTopic = allTopics.find((t) => t.id === newTopicId);

      target.taxonomy = {
        ...target.taxonomy,
        topicId: newTopicId || undefined,
        topicName: matchedTopic?.name,
        topicStatus: newTopicId ? "MATCHED" : "NONE",
        subtopicId: undefined,
        subtopicName: undefined,
        subtopicStatus: "NONE",
      };

      target.question = {
        ...target.question,
        topic_id: newTopicId || undefined,
        subtopic_id: undefined,
      };

      copy[rowIndex] = target;
      return copy;
    });
  };

  // Inline row subtopic mapping
  const handleRowSubtopicChange = (rowIndex: number, newSubtopicId: string) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[rowIndex] };
      const matchedSubtopic = allSubtopics.find((st) => st.id === newSubtopicId);

      target.taxonomy = {
        ...target.taxonomy,
        subtopicId: newSubtopicId || undefined,
        subtopicName: matchedSubtopic?.name,
        subtopicStatus: newSubtopicId ? "MATCHED" : "NONE",
      };

      target.question = {
        ...target.question,
        subtopic_id: newSubtopicId || undefined,
      };

      copy[rowIndex] = target;
      return copy;
    });
  };

  // Download Dynamic MCQ Sample Excel
  const downloadDynamicExcel = () => {
    const wb = generateMcqExcelTemplate({
      subjects,
      topics: allTopics,
      subtopics: allSubtopics,
    });
    XLSX.writeFile(wb, "mcq_question_template.xlsx");
  };

  // Download Dynamic Coding Sample Excel
  const downloadSampleCodingExcel = () => {
    const wb = generateCodingExcelTemplate({
      subjects,
      topics: allTopics,
      subtopics: allSubtopics,
    });
    XLSX.writeFile(wb, "coding_question_template.xlsx");
  };

  // Check metrics for preview table
  const totalRows = parsedRows.length;
  const unmatchedRows = parsedRows.filter(
    (r) => r.taxonomy.topicStatus === "UNMATCHED" || r.taxonomy.subtopicStatus === "UNMATCHED" || r.taxonomy.subjectStatus === "UNMATCHED"
  );
  const unmatchedCount = unmatchedRows.length;
  const matchedCount = totalRows - unmatchedCount;

  // Submit bulk create
  const handleBulkSubmit = async () => {
    if (!parsedRows.length) {
      toast.error("No questions to import. Please upload a valid file or JSON.");
      return;
    }

    const payload = parsedRows.map((r) => r.question);

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
      <DialogContent className="w-[96vw] max-w-4xl bg-white border border-slate-200/90 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto overflow-x-hidden box-border shadow-2xl">
        <DialogHeader className="pr-8 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
              Import Questions
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload an Excel (.xlsx, .xls, .csv) spreadsheet with automatic taxonomy mapping.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={downloadDynamicExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Download MCQ Questions Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>MCQ Template</span>
            </button>
            <button
              onClick={downloadSampleCodingExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Download Coding Questions Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#3b4992]" />
              <span>Coding Template</span>
            </button>
          </div>
        </DialogHeader>

        {/* 1. Batch Hierarchy Selector */}
        <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#3b4992]" />
              Default Hierarchy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Subject (Required) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <span>Subject</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={defaultSubjectId}
                onChange={(e) => handleDefaultSubjectChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-8"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Topic (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Topic <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={defaultTopicId}
                onChange={(e) => handleDefaultTopicChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-8"
              >
                <option value="">-- All Topics --</option>
                {availableDefaultTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Subtopic (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Subtopic <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={defaultSubtopicId}
                disabled={!defaultTopicId || availableDefaultSubtopics.length === 0}
                onChange={(e) => handleDefaultSubtopicChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed h-8"
              >
                <option value="">-- All Subtopics --</option>
                {availableDefaultSubtopics.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Upload File Zone */}
        <div className="w-full">
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors w-full rounded">
            <Upload className="w-6 h-6 text-[#3b4992] mb-1.5" />
            <p className="text-xs font-semibold text-slate-700 text-center truncate max-w-full px-2">
              {fileName ? fileName : "Click to browse or drag & drop question spreadsheet"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 text-center">
              Supports Excel (.xlsx, .xls, .csv) spreadsheets
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Error Alert */}
        {parseError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 break-words">{parseError}</span>
          </div>
        )}

        {/* 2. Interactive Pre-Flight Mapping & Preview Table */}
        {totalRows > 0 && (
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Import Preview ({totalRows} Questions)
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50">
                  {matchedCount} Ready
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] text-slate-700 border-slate-300 bg-slate-100">
                    {unmatchedCount} Require Mapping
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Verify taxonomy mapping before confirming
              </span>
            </div>

            {unmatchedCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {unmatchedCount} question(s) contain topic/subject names not found in the database. Use the dropdowns below to map them.
                </span>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded">
              <Table className="text-xs">
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-8 py-2 text-[11px]">#</TableHead>
                    <TableHead className="w-16 py-2 text-[11px]">Type</TableHead>
                    <TableHead className="py-2 text-[11px] min-w-[160px]">Title / Prompt</TableHead>
                    <TableHead className="py-2 text-[11px] min-w-[120px]">Subject</TableHead>
                    <TableHead className="py-2 text-[11px] min-w-[180px]">Topic</TableHead>
                    <TableHead className="py-2 text-[11px] min-w-[150px]">Subtopic</TableHead>
                    <TableHead className="w-20 py-2 text-[11px] text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => {
                    const rowSubjectTopics = allTopics.filter(
                      (t) => t.subjectId === row.taxonomy.subjectId || (t.subject && t.subject.id === row.taxonomy.subjectId)
                    );
                    const rowTopicSubtopics = row.taxonomy.topicId
                      ? allSubtopics.filter(
                          (st) => st.topicId === row.taxonomy.topicId || (st.topic && st.topic.id === row.taxonomy.topicId)
                        )
                      : [];

                    const hasIssue =
                      row.taxonomy.topicStatus === "UNMATCHED" ||
                      row.taxonomy.subtopicStatus === "UNMATCHED" ||
                      row.taxonomy.subjectStatus === "UNMATCHED";

                    return (
                      <TableRow key={row.id} className={hasIssue ? "bg-slate-50/90 hover:bg-slate-100/70" : "hover:bg-slate-50/70"}>
                        <TableCell className="py-2 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1.5 py-0 font-medium ${
                              row.question.questionType === "CODING"
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {row.question.questionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 max-w-[200px] truncate text-slate-800 font-medium text-[11px]">
                          <span title={row.question.prompt}>
                            {row.question.title || row.question.prompt}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-800 font-medium truncate max-w-[120px]">
                              {row.taxonomy.subjectName || "Default Subject"}
                            </span>
                            {row.taxonomy.subjectStatus === "FALLBACK" && (
                              <span className="text-[10px] text-slate-400">(Inherited)</span>
                            )}
                            {row.taxonomy.subjectStatus === "UNMATCHED" && (
                              <span className="text-[10px] text-slate-500">
                                Unmatched ("{row.taxonomy.rawSubject}")
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {row.taxonomy.topicStatus === "MATCHED" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-700">
                                {row.taxonomy.topicName}
                              </span>
                            </div>
                          ) : row.taxonomy.topicStatus === "UNMATCHED" ? (
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
                                <span>Unmatched ("{row.taxonomy.rawTopic}")</span>
                              </div>
                              <select
                                value={row.taxonomy.topicId || ""}
                                onChange={(e) => handleRowTopicChange(idx, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Map to Topic --</option>
                                {rowSubjectTopics.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : row.taxonomy.topicStatus === "FALLBACK" ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-600">
                                {row.taxonomy.topicName}
                              </span>
                              <span className="text-[10px] text-slate-400">(Default)</span>
                            </div>
                          ) : (
                            <select
                              value={row.taxonomy.topicId || ""}
                              onChange={(e) => handleRowTopicChange(idx, e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] text-slate-600 cursor-pointer"
                            >
                              <option value="">-- Assign Topic --</option>
                              {rowSubjectTopics.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {row.taxonomy.subtopicStatus === "MATCHED" ? (
                            <span className="text-xs text-slate-700">
                              {row.taxonomy.subtopicName}
                            </span>
                          ) : row.taxonomy.subtopicStatus === "UNMATCHED" ? (
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-600 font-medium">
                                Unmatched ("{row.taxonomy.rawSubtopic}")
                              </div>
                              <select
                                value={row.taxonomy.subtopicId || ""}
                                onChange={(e) => handleRowSubtopicChange(idx, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Map Subtopic --</option>
                                {rowTopicSubtopics.map((st) => (
                                  <option key={st.id} value={st.id}>
                                    {st.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : row.taxonomy.subtopicStatus === "FALLBACK" ? (
                            <span className="text-xs text-slate-600">
                              {row.taxonomy.subtopicName} <span className="text-[10px] text-slate-400">(Default)</span>
                            </span>
                          ) : rowTopicSubtopics.length > 0 ? (
                            <select
                              value={row.taxonomy.subtopicId || ""}
                              onChange={(e) => handleRowSubtopicChange(idx, e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] text-slate-600 cursor-pointer"
                            >
                              <option value="">-- Subtopic --</option>
                              {rowTopicSubtopics.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[11px] text-slate-400">--</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {hasIssue ? (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-semibold whitespace-nowrap">
                              Action Required
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold whitespace-nowrap">
                              Ready
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkSubmit}
            disabled={bulkCreateMutation.isPending || parsedRows.length === 0}
            className="px-4 py-2 bg-[#3b4992] hover:bg-[#2f3b75] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer rounded"
          >
            {bulkCreateMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Import {parsedRows.length} Questions</>
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
          if (qt !== "CODING" || q.isLanguageSpecific) return false;
        } else if (problemType === "LANGUAGE_SPECIFIC_CODING") {
          if (qt !== "CODING" || !q.isLanguageSpecific) return false;
        } else {
          // Specific MCQ Subtype filter (SINGLE_CORRECT, MULTIPLE_CORRECT, TRUE_FALSE, ASSERTION_REASON, FILL_IN_THE_BLANK)
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
                { key: "LANGUAGE_SPECIFIC_CODING", label: "Language Specific" },
                { key: "SINGLE_CORRECT", label: "Single Choice" },
                { key: "MULTIPLE_CORRECT", label: "Multiple Choice" },
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
                        {/* Edit Button for ORG_OWNED / Company Questions */}
                        {(q.visibility === "ORG_OWNED" || selectedLibrary === "ORG_OWNED") && (
                          <button
                            onClick={() => navigate(`/admin/questions/edit/${q.id}`, { state: q })}
                            className="p-0.5 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Edit Question"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {isCoding && (
                          <button
                            onClick={() => navigate(`/admin/playground/${q.id}`)}
                            className="p-0.5 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Open Playground"
                          >
                            <Terminal className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigate(`/admin/questions/preview/${q.id}`, { state: q });
                          }}
                          className="p-0.5 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Preview Question"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Row (DoSelect Style: ≡ MCQ, ⊙ Single, BarChart2 Hard, Clock 10 mins.) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-mono text-[13px] leading-none">≡</span>
                        <span>{isCoding ? (q.isLanguageSpecific ? "Language Specific" : "Coding") : "MCQ"}</span>
                      </div>

                      {/* Lifecycle Status Badge */}
                      {isCoding && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                            title={q.status === "UNDER_REVIEW" ? "Driver verification pending" : "All drivers verified"}
                          >
                            {q.status === "UNDER_REVIEW" ? "Under Review" : "Active"}
                          </span>
                        </div>
                      )}

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
                      {q.prompt
                        ? q.prompt
                            .replace(/<[^>]*>/g, " ")
                            .replace(/&nbsp;/g, " ")
                            .replace(/\s+/g, " ")
                            .trim()
                        : "Not available"}
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
          navigate("/admin/questions/create", { state: initialData });
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
