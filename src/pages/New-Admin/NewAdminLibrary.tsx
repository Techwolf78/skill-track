import React, { useState, useMemo, useEffect } from "react";
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

// ─── Create Question Panel ────────────────────────────────────────────────────

function CreateQuestionPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (vis: LibraryType) => void;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [tagInput, setTagInput] = useState("");
  const [subtopics, setSubtopics] = useState<{ id: string; name: string }[]>([]);
  const [topicsForSubject, setTopicsForSubject] = useState<{ id: string; name: string }[]>([]);

  const { data: subjects = [] } = useSubjectsQuery();
  const { data: allTopics = [] } = useTopicsQuery();
  const createMutation = useCreateQuestionMutation();

  // Cascade: subject → topics
  useEffect(() => {
    if (!form.subject_id) { setTopicsForSubject([]); return; }
    const filtered = allTopics.filter((t) => t.subjectId === form.subject_id);
    setTopicsForSubject(filtered);
    setForm((f) => ({ ...f, topic_id: "", subtopic_id: "" }));
    setSubtopics([]);
  }, [form.subject_id, allTopics]);

  // Cascade: topic → subtopics
  useEffect(() => {
    if (!form.topic_id) { setSubtopics([]); return; }
    testService.getSubtopicsByTopic(form.topic_id)
      .then(setSubtopics)
      .catch(() => setSubtopics([]));
    setForm((f) => ({ ...f, subtopic_id: "" }));
  }, [form.topic_id]);

  const set = (field: Partial<FormState>) => setForm((f) => ({ ...f, ...field }));

  // MCQ option helpers
  const setOption = (i: number, text: string) =>
    set({ mcqOptions: form.mcqOptions.map((o, j) => (j === i ? { ...o, text } : o)) });
  const toggleCorrect = (i: number) => {
    const single = !form.multipleCorrect;
    set({
      mcqOptions: form.mcqOptions.map((o, j) => ({
        ...o,
        isCorrect: single ? j === i : j === i ? !o.isCorrect : o.isCorrect,
      })),
    });
  };
  const addOption = () => set({ mcqOptions: [...form.mcqOptions, { text: "", isCorrect: false }] });
  const removeOption = (i: number) =>
    set({ mcqOptions: form.mcqOptions.filter((_, j) => j !== i) });

  // Tags
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set({ tags: [...form.tags, t] });
    setTagInput("");
  };
  const removeTag = (t: string) => set({ tags: form.tags.filter((x) => x !== t) });

  const handleSubmit = async () => {
    if (!form.subject_id) { toast.error("Subject is required"); return; }
    if (!form.prompt.trim()) { toast.error("Prompt is required"); return; }

    const filledOptions = form.mcqOptions.filter((o) => o.text.trim());
    if (filledOptions.length < 2) { toast.error("At least 2 non-empty options required"); return; }
    if (!filledOptions.some((o) => o.isCorrect)) { toast.error("Mark at least one correct answer"); return; }

    const dto: CreateQuestionRequest = {
      questionType: "MCQ",
      prompt: form.prompt.trim(),
      subject_id: form.subject_id,
      topic_id: form.topic_id || undefined,
      subtopic_id: form.subtopic_id || undefined,
      marks: form.marks,
      difficulty: form.difficulty,
      visibility: form.visibility || "ORG_OWNED",
      avg_time_seconds: form.avg_time_seconds !== "" ? Number(form.avg_time_seconds) : 90,
      domain: "ENGINEERING",
      cognitiveLevel: "APPLY",
      p_value: 0.45,
      discrimination_index: 0.35,
      status: "ACTIVE",
      mcqType: form.mcqType,
      multipleCorrect: form.multipleCorrect,
      shuffleOptions: form.shuffleOptions,
      mcqOptions: filledOptions,
      title: form.title.trim() || undefined,
      tags: form.tags.length ? form.tags : undefined,
    };

    console.log("[CreateQuestion] Submitting MCQ payload:", dto);

    try {
      const created = await createMutation.mutateAsync(dto);
      console.log("[CreateQuestion] Server returned created question:", created);
      toast.success("Question created successfully");
      if (onCreated) {
        onCreated(form.visibility || "ORG_OWNED");
      }
      onClose();
    } catch (err) {
      console.error("[CreateQuestion] Error creating question:", err);
      toast.error("Failed to create question. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
        <div>
          <p className="text-sm font-semibold text-slate-800">New MCQ Question</p>
          <p className="text-[11px] text-slate-400">Add a multiple choice question to the bank</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4 text-xs">
        {/* Title */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Title</label>
          <input
            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="Short descriptive title"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>

        {/* Subject / Topic / Subtopic */}
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Subject *</label>
            <Sel value={form.subject_id} onChange={(v) => set({ subject_id: v })}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Topic</label>
              <Sel value={form.topic_id} onChange={(v) => set({ topic_id: v })}>
                <option value="">None</option>
                {topicsForSubject.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Sel>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Subtopic</label>
              <Sel value={form.subtopic_id} onChange={(v) => set({ subtopic_id: v })}>
                <option value="">None</option>
                {subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Sel>
            </div>
          </div>
        </div>

        {/* Marks / Difficulty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Marks *</label>
            <input
              type="number"
              min={1}
              value={form.marks}
              onChange={(e) => set({ marks: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Difficulty</label>
            <Sel value={form.difficulty} onChange={(v) => set({ difficulty: v as any })}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </Sel>
          </div>
        </div>

        {/* Description (Prompt) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Description *</label>
          <textarea
            rows={4}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            placeholder="Enter the question description here..."
            value={form.prompt}
            onChange={(e) => set({ prompt: e.target.value })}
          />
        </div>

        {/* ── MCQ Settings & Options ── */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">MCQ Subtype</label>
          <Sel value={form.mcqType} onChange={(v) => {
            const multi = v === "MULTIPLE_CORRECT";
            set({ mcqType: v as McqType, multipleCorrect: multi });
          }}>
            <option value="SINGLE_CORRECT">Single Correct</option>
            <option value="MULTIPLE_CORRECT">Multiple Correct</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="ASSERTION_REASON">Assertion Reason</option>
            <option value="FILL_IN_THE_BLANK">Fill in Blank</option>
          </Sel>
        </div>

        {/* Shuffle options toggle card */}
        <div className="flex items-center justify-between p-2.5 rounded-md border border-slate-200/80 bg-slate-50/50">
          <div>
            <span className="block text-[11px] font-medium text-slate-700">Shuffle options</span>
            <span className="block text-[10px] text-slate-400">Randomize option order for test takers</span>
          </div>
          <input
            type="checkbox"
            checked={form.shuffleOptions}
            onChange={(e) => set({ shuffleOptions: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-2">
            Options — {form.multipleCorrect ? "click checkboxes" : "click radio"} to mark correct
          </label>
          <div className="space-y-2">
            {form.mcqOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => toggleCorrect(i)}
                  className={`shrink-0 w-4 h-4 rounded-${form.multipleCorrect ? "sm" : "full"} border-2 flex items-center justify-center transition-colors ${
                    opt.isCorrect
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 hover:border-emerald-400"
                  }`}
                >
                  {opt.isCorrect && <Check className="w-2.5 h-2.5" />}
                </button>
                <input
                  className="flex-1 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder={`Option ${i + 1}`}
                  value={opt.text}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                {form.mcqOptions.length > 2 && (
                  <button onClick={() => removeOption(i)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            className="mt-2 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Plus className="w-3 h-3" /> Add Option
          </button>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Tags</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="e.g. arrays, dp, sorting"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            />
            <button onClick={addTag} className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors">
              Add
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium">
                  {t}
                  <button onClick={() => removeTag(t)}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Visibility & Avg Solve Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Visibility</label>
            <Sel value={form.visibility} onChange={(v) => set({ visibility: v as any })}>
              <option value="ORG_OWNED">Org Owned</option>
            </Sel>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Avg Solve Time (s)</label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 90"
              value={form.avg_time_seconds}
              onChange={(e) => set({ avg_time_seconds: e.target.value === "" ? "" : Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="px-4 py-3 border-t border-slate-100 flex gap-2 shrink-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.03)] z-10">
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="flex-1 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          {createMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
          ) : (
            <><Check className="w-3.5 h-3.5" /> Save Question</>
          )}
        </button>
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

      return {
        ...(base as CreateQuestionRequest),
        mcqType: multipleCorrect ? "MULTIPLE_CORRECT" : "SINGLE_CORRECT",
        multipleCorrect,
        shuffleOptions: true,
        mcqOptions: options,
      };
    } else {
      return {
        ...(base as CreateQuestionRequest),
        constraints: norm.constraints || undefined,
        timeLimitSecs: Number(norm.timelimit || norm.timelimitsecs) || 2,
        memoryLimitMb: Number(norm.memorylimit || norm.memorylimitmb) || 256,
        sampleExplanation: norm.sampleexplanation || norm.explanation || undefined,
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
        Prompt: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        Difficulty: "Easy",
        Marks: 5,
        "Time Limit (s)": 2,
        "Memory Limit (MB)": 256,
        Tags: "arrays, hashmap, algorithms",
        "Avg Time (s)": 300,
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
          mcqType: multipleCorrect ? ("MULTIPLE_CORRECT" as const) : ("SINGLE_CORRECT" as const),
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
      <DialogContent className="w-[94vw] max-w-3xl bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto overflow-x-hidden box-border shadow-2xl">
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
              className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Sample MCQ Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>MCQ Excel</span>
            </button>
            <button
              onClick={downloadSampleCodingExcel}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download Sample Coding Questions Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Coding Excel</span>
            </button>
            <button
              onClick={downloadSampleJson}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80">
          <label className="text-xs font-semibold text-slate-700 shrink-0">
            Default Subject:
          </label>
          <select
            value={defaultSubjectId}
            onChange={(e) => setDefaultSubjectId(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
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
            <label className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors w-full">
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
              className="w-full font-mono text-xs p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 box-border"
            />
          </div>
        )}

        {/* Error Alert */}
        {parseError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
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
            <div className="max-h-48 overflow-y-auto overflow-x-hidden border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white w-full">
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
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {q.questionType}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
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
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkSubmit}
            disabled={bulkCreateMutation.isPending || parsedQuestions.length === 0}
            className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
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

function PreviewDialog({
  question,
  onClose,
}: {
  question: Question | null;
  onClose: () => void;
}) {
  if (!question) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-md border border-slate-200 p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900">
            {question.title || "Question Preview"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="rounded-md">{question.questionType}</Badge>
            {question.difficulty && <Badge variant="secondary" className="rounded-md">{fmt(question.difficulty)}</Badge>}
            {question.mcqType && <Badge variant="outline" className="rounded-md">{fmtMcqType(question.mcqType)}</Badge>}
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-800">
            <p className="font-semibold text-slate-600 mb-1.5">Problem Statement</p>
            <p className="whitespace-pre-wrap leading-relaxed">{question.prompt || "—"}</p>
          </div>
          {question.questionType === "MCQ" && question.mcqOptions && (
            <div>
              <p className="font-semibold text-slate-600 mb-1.5">Options</p>
              <div className="space-y-1.5">
                {question.mcqOptions.map((opt, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-md border text-xs flex items-center justify-between ${
                      opt.isCorrect
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{opt.text || `Option ${i + 1}`}</span>
                    {opt.isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {question.tags && question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {question.tags.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px]">{t}</span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewAdminLibrary() {
  const { data: dbQuestions = [], isLoading, isError, refetch } = useQuestionsQuery();

  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType>("PUBLIC");
  const [problemType, setProblemType] = useState<ProblemType>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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
          // Specific MCQ Subtype filter
          if (qt !== "MCQ") return false;
          const mt = (q.mcqType ?? (q.multipleCorrect ? "MULTIPLE_CORRECT" : "SINGLE_CORRECT")).toUpperCase();
          if (mt !== problemType) return false;
        }
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
  }, [dbQuestions, selectedLibrary, problemType, searchQuery, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLibrary, problemType, searchQuery, sortBy, pageSize]);

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
        <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-4 overflow-hidden space-y-4">
          <p className="text-xs font-normal text-slate-500 px-4">Available libraries</p>
          <div className="space-y-3">
            {/* RxOne Public Questions */}
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
              <span className="text-[13px] leading-none">RxOne Public questions</span>
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
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-800">Filters</span>
            <button
              onClick={() => { setProblemType("ALL"); setSearchQuery(""); }}
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
                    className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer ${
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
      </aside>

      {/* ── Right Main Area ── */}
      <main className={`flex-1 w-full space-y-4 transition-all min-w-0 ${showCreate ? "lg:max-w-[calc(100%-14rem-27rem-1.25rem)]" : ""}`}>
        {/* Search + Sort + Create Button (DoSelect Style) */}
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[240px] flex items-center gap-2.5 border border-slate-200/90 rounded-lg px-3.5 py-2.5 bg-white text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search questions by title, tag or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown Button */}
          <div className="relative flex items-center border border-slate-200/90 rounded-lg px-3.5 py-2.5 bg-white text-xs text-slate-700 font-normal hover:bg-slate-50/50 transition-colors">
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
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Questions</span>
          </button>

          {/* Create Question Button */}
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              showCreate
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-[#6366F1] hover:bg-[#4F46E5] text-white"
            }`}
          >
            {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCreate ? "Close" : "Create Question"}
          </button>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
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
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs space-y-3">
              <p>No questions match the current filters.</p>
              <button
                onClick={() => { setProblemType("ALL"); setSearchQuery(""); }}
                className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
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
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-0.5 hover:text-slate-700 transition-colors"
                          title="Preview Question"
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                        <button
                          className="p-0.5 hover:text-slate-700 transition-colors"
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

                      {!isCoding && q.mcqType && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[11px] leading-none">⊙</span>
                          <span>{fmtMcqType(q.mcqType)}</span>
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
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100/90 text-slate-600 font-normal"
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
          <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3 flex flex-wrap items-center justify-end gap-5 text-xs text-slate-600">
            {/* Page Selector */}
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
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
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-500 tracking-wider">
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
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-600">
              {startRecord} - {endRecord} OF {totalQuestions}
            </span>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Create Panel (slide in from right) ── */}
      {showCreate && (
        <div className="w-full lg:w-[420px] shrink-0 bg-white rounded-md border border-slate-200 flex flex-col h-[calc(100vh-120px)] sticky top-4 shadow-sm overflow-hidden z-20">
          <CreateQuestionPanel
            onClose={() => setShowCreate(false)}
            onCreated={(vis) => {
              setSelectedLibrary(vis);
              setSortBy("NEWEST");
            }}
          />
        </div>
      )}

      {/* Preview Dialog */}
      <PreviewDialog question={previewQuestion} onClose={() => setPreviewQuestion(null)} />

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
