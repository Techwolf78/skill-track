import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Check,
  X,
  Plus,
  Info,
  Save,
  Copy,
  Loader2,
  Grid,
  HelpCircle,
  LogOut,
  User as UserIcon,
  Code2,
  Sparkles,
  FolderTree,
} from "lucide-react";
import QuickManageSubjects from "@/components/QuickManageSubjects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import {
  useSubjectsQuery,
  useTopicsQuery,
  useCreateQuestionMutation,
} from "@/hooks/use-query-hooks";
import { testService, McqOption, McqType, CreateQuestionRequest } from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { PreFlightVerificationPanel } from "@/components/admin/PreFlightVerificationPanel";
import { ValidateDriverResponse, QuestionBankStatus, mapFrontendToBackendLang } from "@/types/question";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import Editor from "@monaco-editor/react";

const mapLanguageToMonaco = (lang: string): string => {
  const l = (lang || "").toLowerCase();
  if (l.includes("python") || l.includes("py")) return "python";
  if (l.includes("javascript") || l.includes("js") || l.includes("node")) return "javascript";
  if (l.includes("java")) return "java";
  if (l.includes("cpp") || l.includes("c++") || l.includes("c")) return "cpp";
  return "plaintext";
};

const isRichTextEmpty = (html: string) => {
  if (!html) return true;
  const stripped = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length === 0;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

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

// Line-based Select Component (DoSelect Style)
const LineSelect = ({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none bg-transparent border-b border-slate-200 focus:border-[#4353a4] py-2 pr-6 text-xs text-slate-800 focus:outline-none cursor-pointer"
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
  </div>
);

const DEFAULT_CODE_TEMPLATES = {
  python3: {
    template: `class Solution:
    def solve(self, n: int) -> int:
        # Write your logic here
        return n + 9`,
    driver: `import sys
if __name__ == "__main__":
    data = sys.stdin.read().strip()
    if data:
        n = int(data)
        sol = Solution()
        print(sol.solve(n))`,
  },
  javascript: {
    template: `class Solution {
    solve(n) {
        // Write your logic here
        return n + 9;
    }
}`,
    driver: `const fs = require('fs');
function main() {
    const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();
    if (input) {
        const n = parseInt(input, 10);
        const sol = new Solution();
        console.log(sol.solve(n));
    }
}
main();`,
  },
  java: {
    template: `class Solution {
    public int solve(int n) {
        // Write your logic here
        return n + 9;
    }
}`,
    driver: `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            Solution sol = new Solution();
            System.out.println(sol.solve(n));
        }
    }
}`,
  },
  cpp: {
    template: `#include <iostream>
using namespace std;
class Solution {
public:
    int solve(int n) {
        // Write your logic here
        return n + 9;
    }
};`,
    driver: `int main() {
    int n;
    if (cin >> n) {
        Solution sol;
        cout << sol.solve(n) << endl;
    }
    return 0;
}`,
  },
};

// ─── Main Component: Standalone Question Create Screen ────────────────────────

export default function NewAdminQuestionCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: editQuestionId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editQuestionId);
  const { user, logout } = useAuth();

  // Navigation state passed from modal or edit navigation
  const initialData = location.state || {
    title: "New Problem",
    questionType: "MCQ",
    mcqType: "SINGLE_CORRECT" as McqType,
    difficulty: "MEDIUM" as const,
  };

  const [isCoding, setIsCoding] = useState(initialData.questionType === "CODING");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(Boolean(editQuestionId));
  const [isSaving, setIsSaving] = useState(false);

  const { data: subjects = [] } = useSubjectsQuery();
  const { data: allTopics = [] } = useTopicsQuery();
  const createMutation = useCreateQuestionMutation();

  const [title, setTitle] = useState(initialData.title || (isEditMode ? "Loading Problem..." : "Untitled Problem"));
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">(initialData.difficulty || "MEDIUM");
  const [prompt, setPrompt] = useState("");
  const [solvingTimeMins, setSolvingTimeMins] = useState(initialData.questionType === "CODING" ? "15" : "2");
  const [marks, setMarks] = useState(initialData.questionType === "CODING" ? 100 : 10);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subtopicId, setSubtopicId] = useState("");
  const [manageSubjectsOpen, setManageSubjectsOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [subtopics, setSubtopics] = useState<{ id: string; name: string }[]>([]);
  const [topicsForSubject, setTopicsForSubject] = useState<{ id: string; name: string }[]>([]);
  const [topSearch, setTopSearch] = useState("");

  // Coding Specific Fields
  const [timeLimitSecs, setTimeLimitSecs] = useState(2);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [constraints, setConstraints] = useState("");
  const [sampleExplanation, setSampleExplanation] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [testCases, setTestCases] = useState<
    Array<{ input: string; expectedOutput: string; sample: boolean; weight: number; explanation?: string }>
  >([
    { input: "10", expectedOutput: "19", sample: true, weight: 20, explanation: "n = 10 -> 10 + 9 = 19" },
    { input: "5", expectedOutput: "14", sample: false, weight: 40 },
    { input: "0", expectedOutput: "9", sample: false, weight: 40 },
  ]);

  // Method Signature Configuration
  const [signature, setSignature] = useState({
    method_name: "solve",
    return_type: "int",
    params: [{ name: "n", type: "int" }],
  });

  // Code Templates & Drivers
  const [codeTemplates, setCodeTemplates] = useState(DEFAULT_CODE_TEMPLATES);
  const [activeCodeLang, setActiveCodeLang] = useState<"python3" | "javascript" | "java" | "cpp">("python3");
  const [isLanguageSpecific] = useState<boolean>(Boolean(initialData.isLanguageSpecific));
  const [verifiedLanguages, setVerifiedLanguages] = useState<string[]>([]);
  const [pendingLanguages, setPendingLanguages] = useState<string[]>(["python", "javascript", "java", "cpp"]);
  const [createdQuestionId, setCreatedQuestionId] = useState<string | null>(null);
  const [questionStatus, setQuestionStatus] = useState<QuestionBankStatus>("UNDER_REVIEW");
  const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false);

  // MCQ Specific
  const [mcqType, setMcqType] = useState<McqType>(initialData.mcqType || "SINGLE_CORRECT");
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [mcqOptions, setMcqOptions] = useState<McqOption[]>(
    initialData.mcqType === "TRUE_FALSE"
      ? [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ]
      : [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]
  );

  // Dynamic problem readiness check
  const isProblemReady = useMemo(() => {
    if (!title.trim() || isRichTextEmpty(prompt) || !solvingTimeMins) return false;
    if (isCoding) {
      return testCases.some((tc) => tc.input.trim() || tc.expectedOutput.trim());
    } else {
      const filled = mcqOptions.filter((o) => !isRichTextEmpty(o.text));
      return filled.length >= 2 && filled.some((o) => o.isCorrect);
    }
  }, [title, prompt, solvingTimeMins, isCoding, testCases, mcqOptions]);

  // Fetch question details if in Edit Mode
  useEffect(() => {
    if (!editQuestionId) return;
    setIsLoadingQuestion(true);

    testService
      .getQuestionById(editQuestionId)
      .then((q) => {
        if (!q) return;
        setTitle(q.title || "");
        setPrompt(q.prompt || "");
        if (q.difficulty) setDifficulty(q.difficulty);
        if (q.marks !== undefined) setMarks(q.marks);
        if (q.avg_time_seconds) setSolvingTimeMins(String(Math.round(q.avg_time_seconds / 60)));
        if (q.subject_id || q.subjectId || q.subject?.id) {
          setSubjectId(q.subject_id || q.subjectId || q.subject?.id || "");
        }
        if (q.topic_id || q.topicId || q.topic?.id) {
          setTopicId(q.topic_id || q.topicId || q.topic?.id || "");
        }
        if (q.subtopic_id || q.subtopicId || q.subtopic?.id) {
          setSubtopicId(q.subtopic_id || q.subtopicId || q.subtopic?.id || "");
        }
        if (q.tags && Array.isArray(q.tags)) setTags(q.tags);

        const isC = (q.questionType ?? "").toUpperCase() === "CODING";
        setIsCoding(isC);

        if (isC) {
          if (q.timeLimitSecs !== undefined) setTimeLimitSecs(q.timeLimitSecs);
          if (q.memoryLimitMb !== undefined) setMemoryLimitMb(q.memoryLimitMb);
          if (q.constraints) setConstraints(q.constraints);
          if (q.sampleExplanation) setSampleExplanation(q.sampleExplanation);
          if (q.hints && q.hints.length) setHints(q.hints);
          if (q.testCases && Array.isArray(q.testCases)) {
            setTestCases(
              q.testCases.map((tc: any) => ({
                input: tc.input || "",
                expectedOutput: tc.expectedOutput || "",
                sample: Boolean(tc.sample),
                weight: tc.weight || 20,
                explanation: tc.explanation || "",
              }))
            );
          }
          if (q.signatureMetadata) {
            setSignature({
              method_name: q.signatureMetadata.method_name || "solve",
              return_type: q.signatureMetadata.return_type || "int",
              params: q.signatureMetadata.params || [{ name: "n", type: "int" }],
            });
          }
          if (q.languageTemplates) {
            setCodeTemplates((prev) => {
              const updated = { ...prev };
              Object.entries(q.languageTemplates!).forEach(([lang, tpl]: [string, any]) => {
                const feLang = (lang === "python" ? "python3" : lang) as "python3" | "javascript" | "java" | "cpp";
                if (updated[feLang]) {
                  updated[feLang] = {
                    template: tpl.template || tpl.starterCode || updated[feLang].template,
                    driver: tpl.driver || updated[feLang].driver,
                  };
                }
              });
              return updated;
            });
          }
          if (q.verifiedLanguages) setVerifiedLanguages(q.verifiedLanguages);
          if (q.status) setQuestionStatus(q.status);
          setCreatedQuestionId(q.id);
        } else {
          // MCQ
          if (q.mcqType) setMcqType(q.mcqType);
          if (q.shuffleOptions !== undefined) setShuffleOptions(q.shuffleOptions);
          if (q.mcqOptions && Array.isArray(q.mcqOptions) && q.mcqOptions.length > 0) {
            setMcqOptions(q.mcqOptions);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load question for editing:", err);
        toast.error("Failed to load question details: " + (err.message || "Unknown error"));
      })
      .finally(() => {
        setIsLoadingQuestion(false);
      });
  }, [editQuestionId]);

  // Default subject initialization for new questions
  useEffect(() => {
    if (!isEditMode && subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [isEditMode, subjects, subjectId]);

  // Cascade: subject → topics
  useEffect(() => {
    if (!subjectId) {
      setTopicsForSubject([]);
      return;
    }
    const filtered = allTopics.filter((t) => t.subjectId === subjectId);
    setTopicsForSubject(filtered);
  }, [subjectId, allTopics]);

  // Cascade: topic → subtopics
  useEffect(() => {
    if (!topicId) {
      setSubtopics([]);
      return;
    }
    testService.getSubtopicsByTopic(topicId).then(setSubtopics).catch(() => setSubtopics([]));
  }, [topicId]);

  // Option actions
  const setOptionText = (idx: number, text: string) => {
    setMcqOptions((opts) => opts.map((o, i) => (i === idx ? { ...o, text } : o)));
  };
  const toggleCorrect = (idx: number) => {
    const isMulti = mcqType === "MULTIPLE_CORRECT";
    setMcqOptions((opts) =>
      opts.map((o, i) => ({
        ...o,
        isCorrect: isMulti ? (i === idx ? !o.isCorrect : o.isCorrect) : i === idx,
      }))
    );
  };
  const addOption = () => setMcqOptions((opts) => [...opts, { text: "", isCorrect: false }]);
  const removeOption = (idx: number) => setMcqOptions((opts) => opts.filter((_, i) => i !== idx));

  // Hint actions
  const addHint = () => {
    const h = hintInput.trim();
    if (h && !hints.includes(h)) setHints((prev) => [...prev, h]);
    setHintInput("");
  };
  const removeHint = (idx: number) => setHints((prev) => prev.filter((_, i) => i !== idx));

  // Signature actions
  const addParam = () =>
    setSignature((prev) => ({
      ...prev,
      params: [...prev.params, { name: `param${prev.params.length + 1}`, type: "int" }],
    }));
  const updateParam = (idx: number, field: "name" | "type", val: string) =>
    setSignature((prev) => ({
      ...prev,
      params: prev.params.map((p, i) => (i === idx ? { ...p, [field]: val } : p)),
    }));
  const removeParam = (idx: number) =>
    setSignature((prev) => ({
      ...prev,
      params: prev.params.filter((_, i) => i !== idx),
    }));

  // Driver change with automatic invalidation of verification status
  const handleDriverChange = (lang: typeof activeCodeLang, newDriver: string) => {
    setCodeTemplates((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], driver: newDriver },
    }));
    const backendLang = mapFrontendToBackendLang(lang);
    setVerifiedLanguages((prev) => prev.filter((l) => l !== backendLang));
    setPendingLanguages((prev) => Array.from(new Set([...prev, backendLang])));
    setQuestionStatus("UNDER_REVIEW");
  };

  // Helper to build coding language templates payload
  const buildLanguageTemplatesPayload = () => {
    if (isLanguageSpecific) {
      const backendLang = mapFrontendToBackendLang(activeCodeLang);
      return {
        [backendLang]: {
          template: codeTemplates[activeCodeLang].template,
          driver: codeTemplates[activeCodeLang].driver || "",
        },
      };
    }
    return {
      python: { template: codeTemplates.python3.template, driver: codeTemplates.python3.driver || "" },
      javascript: { template: codeTemplates.javascript.template, driver: codeTemplates.javascript.driver || "" },
      java: { template: codeTemplates.java.template, driver: codeTemplates.java.driver || "" },
      cpp: { template: codeTemplates.cpp.template, driver: codeTemplates.cpp.driver || "" },
    };
  };

  // Minimal draft save for pre-flight verification execution
  const handleSaveDraftForVerification = async (): Promise<string | undefined> => {
    if (!title.trim() || !prompt.trim() || !subjectId) {
      toast.error("Please fill in Problem Name, Description, and Subject before running pre-flight check.");
      return undefined;
    }

    const avgTimeSecs = Math.max(30, Number(solvingTimeMins || 2) * 60);
    const validTestCases = testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
    const cleanHints = hints.filter((h) => h.trim());

    if (createdQuestionId) {
      // Sync latest test cases and templates before running pre-flight verification
      await testService.updateQuestion(createdQuestionId, {
        title: title.trim(),
        prompt: prompt.trim(),
        subject_id: subjectId,
        topic_id: topicId || undefined,
        subtopic_id: subtopicId || undefined,
        difficulty,
        marks,
        avg_time_seconds: avgTimeSecs,
        timeLimitSecs: Number(timeLimitSecs) || 2,
        memoryLimitMb: Number(memoryLimitMb) || 256,
        constraints: constraints.trim() || undefined,
        sampleExplanation: sampleExplanation.trim() || undefined,
        hints: cleanHints.length ? cleanHints : undefined,
        testCases: validTestCases,
        tags: tags.length ? tags : undefined,
        languageTemplates: buildLanguageTemplatesPayload(),
        signatureMetadata: {
          method_name: signature.method_name || "solve",
          return_type: signature.return_type,
          params: signature.params,
        },
      });
      return createdQuestionId;
    }

    const dto: CreateQuestionRequest = {
      questionType: "CODING",
      title: title.trim(),
      prompt: prompt.trim(),
      subject_id: subjectId,
      topic_id: topicId || undefined,
      subtopic_id: subtopicId || undefined,
      difficulty,
      marks,
      visibility: "ORG_OWNED",
      avg_time_seconds: avgTimeSecs,
      timeLimitSecs: Number(timeLimitSecs) || 2,
      memoryLimitMb: Number(memoryLimitMb) || 256,
      constraints: constraints.trim() || undefined,
      sampleExplanation: sampleExplanation.trim() || undefined,
      hints: cleanHints.length ? cleanHints : undefined,
      domain: "ENGINEERING",
      cognitiveLevel: "APPLY",
      p_value: 0.45,
      discrimination_index: 0.35,
      status: "UNDER_REVIEW",
      isLanguageSpecific,
      testCases: validTestCases,
      tags: tags.length ? tags : undefined,
      languageTemplates: buildLanguageTemplatesPayload(),
      signatureMetadata: {
        method_name: signature.method_name || "solve",
        return_type: signature.return_type,
        params: signature.params,
      },
    };

    const saved = await createMutation.mutateAsync(dto);
    if (saved?.id) {
      setCreatedQuestionId(saved.id);
      return saved.id;
    }
    return undefined;
  };

  // Tag actions
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  // Testcase actions
  const addTestCase = (sample: boolean) => {
    setTestCases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", sample, weight: sample ? 10 : 15, explanation: "" },
    ]);
  };
  const updateTestCase = (idx: number, field: string, val: any) => {
    setTestCases((prev) => prev.map((tc, i) => (i === idx ? { ...tc, [field]: val } : tc)));
  };
  const removeTestCase = (idx: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save handler
  const handleSave = async (cloneAfter: boolean = false) => {
    if (!title.trim()) {
      toast.error("Problem name is required");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Description / Prompt is required");
      return;
    }
    if (!subjectId) {
      toast.error("Subject is required");
      return;
    }

    const avgTimeSecs = Math.max(30, Number(solvingTimeMins || 2) * 60);

    let dto: CreateQuestionRequest;

    if (isCoding) {
      // Validate non-empty starter template and driver for each enabled language
      const langsToCheck = isLanguageSpecific
        ? [activeCodeLang]
        : (["python3", "javascript", "java", "cpp"] as const);

      for (const lang of langsToCheck) {
        const langDisplay = lang === "python3" ? "Python 3" : lang === "javascript" ? "JavaScript" : lang === "java" ? "Java" : "C++";
        if (!codeTemplates[lang].template.trim()) {
          toast.error(`Starter code for ${langDisplay} cannot be blank.`);
          return;
        }
        if (!codeTemplates[lang].driver.trim()) {
          toast.error(`Evaluation runner for ${langDisplay} cannot be blank.`);
          return;
        }
      }

      const validTestCases = testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
      const cleanHints = hints.filter((h) => h.trim());
      const langPayload = buildLanguageTemplatesPayload();
      const declaredLangs = Object.keys(langPayload);
      const allPassed = declaredLangs.length > 0 && declaredLangs.every((l) => verifiedLanguages.includes(l));
      const computedStatus: QuestionBankStatus = allPassed ? "ACTIVE" : "UNDER_REVIEW";

      dto = {
        questionType: "CODING",
        title: title.trim(),
        prompt: prompt.trim(),
        subject_id: subjectId,
        topic_id: topicId || undefined,
        subtopic_id: subtopicId || undefined,
        difficulty,
        marks,
        visibility: "ORG_OWNED",
        avg_time_seconds: avgTimeSecs,
        timeLimitSecs: Number(timeLimitSecs) || 2,
        memoryLimitMb: Number(memoryLimitMb) || 256,
        constraints: constraints.trim() || undefined,
        sampleExplanation: sampleExplanation.trim() || undefined,
        hints: cleanHints.length ? cleanHints : undefined,
        domain: "ENGINEERING",
        cognitiveLevel: "APPLY",
        p_value: 0.45,
        discrimination_index: 0.35,
        status: computedStatus,
        isLanguageSpecific,
        testCases: validTestCases,
        tags: tags.length ? tags : undefined,
        languageTemplates: langPayload,
        signatureMetadata: {
          method_name: signature.method_name || "solve",
          return_type: signature.return_type,
          params: signature.params,
        },
      };
    } else {
      const filledOptions = mcqOptions.filter((o) => !isRichTextEmpty(o.text));
      if (filledOptions.length < 2) {
        toast.error("Please provide at least 2 non-empty options");
        return;
      }
      if (!filledOptions.some((o) => o.isCorrect)) {
        toast.error("Please mark at least one correct option");
        return;
      }

      dto = {
        questionType: "MCQ",
        title: title.trim(),
        prompt: prompt.trim(),
        subject_id: subjectId,
        topic_id: topicId || undefined,
        subtopic_id: subtopicId || undefined,
        difficulty,
        marks,
        visibility: "ORG_OWNED",
        avg_time_seconds: avgTimeSecs,
        domain: "ENGINEERING",
        cognitiveLevel: "APPLY",
        p_value: 0.45,
        discrimination_index: 0.35,
        status: "ACTIVE",
        mcqType,
        multipleCorrect: mcqType === "MULTIPLE_CORRECT",
        shuffleOptions,
        mcqOptions: filledOptions,
        tags: tags.length ? tags : undefined,
      };
    }

    setIsSaving(true);
    try {
      if (editQuestionId) {
        await apiClient.put(`/questions/${editQuestionId}`, dto);
        toast.success("Problem updated successfully!");
      } else {
        await createMutation.mutateAsync(dto);
        toast.success("Problem saved successfully!");
      }

      if (cloneAfter) {
        setTitle(`${title.trim()} (Copy)`);
        toast.info("Cloned draft ready for editing");
      } else {
        navigate("/admin/library");
      }
    } catch (err: any) {
      console.error("[NewAdminQuestionCreate] Failed to save:", err);
      toast.error("Failed to save problem: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingQuestion) {
    return (
      <div className="min-h-screen bg-[#081225] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#4353a4] mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading problem details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased">
      {/* ── 1. Top Navbar (Dark Navy Bar, NO Second Sub-navbar) ── */}
      <header className="h-20 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Breadcrumb (Library > Problem Title) */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div
            onClick={() => navigate("/admin/library")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <img
              src="/Gryphon360logo.png"
              alt="Gryphon 360"
              className="h-12 md:h-14 w-auto object-contain shrink-0 hover:opacity-95 transition-opacity"
            />
          </div>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          <div className="flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5">
            <button
              onClick={() => navigate("/admin/library")}
              className="hover:text-slate-200 cursor-pointer transition-colors"
            >
              Library
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-semibold max-w-[200px] truncate">{title || (isEditMode ? "Edit Problem" : "New Problem")}</span>
          </div>
        </div>

        {/* Right Side: Profile Section */}
        <div className="flex items-center space-x-3">
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

      {/* ── 2. Navy Hero Background Backdrop ── */}
      <div className="bg-[#0B1028] absolute top-14 left-0 right-0 h-80 -z-0 pointer-events-none" />

      {/* ── 3. Main Workspace Area (Title tightly placed above cards) ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20 w-full relative z-10">
        {/* Back to Library Button above title */}
        <button
          onClick={() => navigate("/admin/library")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mb-2.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        {/* Title & Type Metadata Row (Tightly above white card) */}
        <div className="space-y-1.5 mb-4 text-white">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{title || (isEditMode ? "Edit Problem" : "Untitled Problem")}</h1>
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white font-bold shrink-0 cursor-default"
              title="Unsaved changes"
            >
              ✕
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="text-slate-400">=</span> {isCoding ? (isLanguageSpecific ? "Language Specific" : "Coding") : fmtMcqType(mcqType) || "MCQ"}
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <DifficultyIcon level={difficulty} />
              <span>{fmt(difficulty)}</span>
            </span>
          </div>
        </div>

        {/* 2-Column Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left / Center: Form Cards Column (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Box 1: Problem Details */}
            <div className="bg-white border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
              {/* Section Header */}
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Problem Details</h2>
                <p className="text-[11px] text-slate-400">Configure core metadata, taxonomy, and description for this question.</p>
              </div>

            {/* Title (Underline input style) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Invert a Binary Tree"
                className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-900 font-semibold focus:outline-none transition-colors bg-transparent"
              />
            </div>

            {/* ── Subject / Topic / Subtopic (Directly Below Title) ── */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Subject *</label>
                  <LineSelect value={subjectId} onChange={(v) => { setSubjectId(v); setTopicId(""); setSubtopicId(""); setSubtopics([]); }}>
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </LineSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Topic</label>
                  <LineSelect value={topicId} onChange={(v) => { setTopicId(v); setSubtopicId(""); }}>
                    <option value="">None</option>
                    {topicsForSubject.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </LineSelect>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Subtopic</label>
                  <LineSelect value={subtopicId} onChange={(v) => setSubtopicId(v)}>
                    <option value="">None</option>
                    {subtopics.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </LineSelect>
                </div>
              </div>
            </div>

            {/* ── Problem Attributes Grid (Marks & Solving Time side-by-side) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-1">
              {/* Estimated Solving Time */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Estimated Solving Time (Minutes) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={solvingTimeMins}
                  onChange={(e) => setSolvingTimeMins(e.target.value)}
                  placeholder={isCoding ? "15" : "2"}
                  className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                />
              </div>

              {/* Total Marks */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Total Marks <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  placeholder="100"
                  className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {/* ── Difficulty Level (Full Width Radio Group with Equally Divided Space) ── */}
            <div className="space-y-2 pt-2 w-full">
              <label className="block text-xs font-semibold text-slate-700">
                Difficulty level
              </label>
              <p className="text-[11px] text-slate-400">Proper difficulty level helps in better user recommendations.</p>
              <div className="grid grid-cols-3 w-full pt-1.5 gap-4">
                {(["EASY", "MEDIUM", "HARD"] as const).map((lvl) => (
                  <label key={lvl} className="flex items-center gap-3 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="radio"
                      name="difficultyLevel"
                      value={lvl}
                      checked={difficulty === lvl}
                      onChange={() => setDifficulty(lvl)}
                      className="w-4 h-4 text-[#4353a4] focus:ring-[#4353a4] border-slate-300 cursor-pointer"
                    />
                    <span>{fmt(lvl)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description (Prompt) */}
            <div className="space-y-1 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Description <span className="text-rose-500">*</span>
              </label>
              <RichTextEditor
                content={prompt}
                onChange={(html) => setPrompt(html)}
                placeholder="Insert text here..."
                minHeight="160px"
              />
              <p className="text-[11px] text-slate-400">Be as descriptive as possible, but no more.</p>
            </div>

            {/* ── Coding Limits, Constraints & Explanation inside Problem Details ── */}
            {isCoding && (
              <div className="space-y-6 pt-2 border-t border-slate-100">
                {/* Time & Memory Limits (Side-by-side underline inputs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Time Limit (Seconds)</label>
                    <p className="text-[11px] text-slate-400">Maximum execution time permitted per testcase.</p>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={timeLimitSecs}
                      onChange={(e) => setTimeLimitSecs(Number(e.target.value))}
                      placeholder="2"
                      className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Memory Limit (MB)</label>
                    <p className="text-[11px] text-slate-400">Maximum memory allocation permitted per testcase.</p>
                    <input
                      type="number"
                      min={16}
                      step={16}
                      value={memoryLimitMb}
                      onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                      placeholder="256"
                      className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-sm text-slate-800 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                {/* Constraints and Sample Explanation beside each other */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Constraints</label>
                    <textarea
                      rows={4}
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      placeholder="e.g. 1 <= nums.length <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
                      className="w-full border border-slate-200 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#4353a4] bg-slate-50/20 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Sample Explanation</label>
                    <textarea
                      rows={4}
                      value={sampleExplanation}
                      onChange={(e) => setSampleExplanation(e.target.value)}
                      placeholder="Input: nums = [2,7,11,15], target = 9&#10;Output: [0,1]&#10;Explanation: nums[0] + nums[1] == 9, we return [0, 1]."
                      className="w-full border border-slate-200 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#4353a4] bg-slate-50/20 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tags (Underline input style) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. algorithms, arrays, system-design"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1 border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-xs focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                    >
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-slate-900 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Hints Section (Design matching Tags) */}
            {isCoding && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">Hints</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Consider using two pointers or binary search"
                    value={hintInput}
                    onChange={(e) => setHintInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHint();
                      }
                    }}
                    className="flex-1 border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-xs focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={addHint}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                {hints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hints.map((h, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                      >
                        <span className="text-[10px] text-slate-400 font-semibold">#{idx + 1}</span>
                        <span>{h}</span>
                        <button
                          type="button"
                          onClick={() => removeHint(idx)}
                          className="hover:text-slate-900 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MCQ Options Section (If not Coding) */}
            {!isCoding && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between p-3 border border-slate-200/80 bg-slate-50/50">
                  <div>
                    <span className="block text-xs font-semibold text-slate-700">Shuffle options</span>
                    <span className="block text-[11px] text-slate-400">Randomize option order for test takers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 text-[#4353a4] focus:ring-[#4353a4] border-slate-300 cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Options — {mcqType === "MULTIPLE_CORRECT" ? "Check all correct options" : "Click radio button for correct option"}
                  </label>
                  <div className="space-y-2.5">
                    {mcqOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleCorrect(i)}
                          className={`shrink-0 w-4 h-4 ${mcqType === "MULTIPLE_CORRECT" ? "rounded-xs" : "rounded-full"} border-2 flex items-center justify-center transition-colors cursor-pointer ${
                            opt.isCorrect
                              ? "border-[#4353a4] bg-[#4353a4] text-white"
                              : "border-slate-300 hover:border-slate-400 bg-white"
                          }`}
                          title={opt.isCorrect ? "Correct Option" : "Mark as Correct"}
                        >
                          {opt.isCorrect && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <RichTextEditor
                            compact
                            content={opt.text}
                            onChange={(html) => setOptionText(i, html)}
                            placeholder={`Option ${i + 1}`}
                            minHeight="36px"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 flex items-center gap-1.5 text-xs text-[#4353a4] hover:text-[#38468d] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Option
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Additional Coding Modular Boxes ── */}
          {isCoding && (
            <>
              {/* Box 2: Function Definition (Optional) */}
              <div className="bg-white border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Function Definition (Optional)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define the expected function name and return type for candidates.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Function Name</label>
                    <input
                      type="text"
                      value={signature.method_name}
                      onChange={(e) => setSignature({ ...signature, method_name: e.target.value })}
                      placeholder="solve"
                      className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-xs text-slate-800 font-mono focus:outline-none bg-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Return Type</label>
                    <input
                      type="text"
                      value={signature.return_type}
                      onChange={(e) => setSignature({ ...signature, return_type: e.target.value })}
                      placeholder="int, string, list[int], void"
                      className="w-full border-b border-slate-200 focus:border-[#4353a4] py-1.5 text-xs text-slate-800 font-mono focus:outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Box 3: Code Setup & Test Run */}
              <div className="bg-white border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {isLanguageSpecific ? "Language & Code Setup" : "Code Setup"}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isLanguageSpecific
                      ? "Choose the target language, then configure the candidate starter code and hidden evaluation runner."
                      : "Configure candidate starter code and hidden evaluation runners across supported languages."}
                  </p>
                </div>

                {/* Language Selector / Full-Width Tabs Below Header */}
                {isLanguageSpecific ? (
                  <div className="space-y-1 max-w-sm">
                    <label className="block text-xs font-semibold text-[#4353a4]">
                      Target Programming Language
                    </label>
                    <div className="relative border-b-2 border-[#4353a4]">
                      <select
                        value={activeCodeLang}
                        onChange={(e) => {
                          const selected = e.target.value as "python3" | "javascript" | "java" | "cpp";
                          setActiveCodeLang(selected);
                        }}
                        className="w-full appearance-none bg-transparent py-2 pr-8 text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="python3">Python 3</option>
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4353a4]" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full bg-slate-100/90 p-1.5 border border-slate-200">
                    {(
                      [
                        { id: "python3", bLang: "python", label: "Python 3" },
                        { id: "javascript", bLang: "javascript", label: "JavaScript" },
                        { id: "java", bLang: "java", label: "Java" },
                        { id: "cpp", bLang: "cpp", label: "C++" },
                      ] as const
                    ).map((lang) => {
                      const isVerified = verifiedLanguages.includes(lang.bLang);
                      const isSelected = activeCodeLang === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setActiveCodeLang(lang.id)}
                          className={`w-full py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          }`}
                        >
                          <span>{lang.label}</span>
                          <span className={`text-[10px] ${isVerified ? "text-emerald-600 font-bold" : "text-slate-400 font-normal"}`}>
                            ({isVerified ? "Verified" : "Not Tested"})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Starter Code & Evaluation Runner Beside Each Other */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
                  {/* Left: Starter Code */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Candidate Starter Code <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Visible in candidate editor</span>
                    </div>
                    <div className="border border-slate-700 bg-[#1e1e1e] overflow-hidden shadow-inner">
                      <Editor
                        height="260px"
                        language={mapLanguageToMonaco(activeCodeLang)}
                        value={codeTemplates[activeCodeLang].template}
                        onChange={(val) =>
                          setCodeTemplates({
                            ...codeTemplates,
                            [activeCodeLang]: { ...codeTemplates[activeCodeLang], template: val || "" },
                          })
                        }
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                          scrollBeyondLastLine: false,
                          lineNumbers: "on",
                          renderLineHighlight: "all",
                          roundedSelection: false,
                          scrollbar: {
                            vertical: "auto",
                            horizontal: "auto",
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                          },
                          automaticLayout: true,
                          padding: { top: 12, bottom: 12 },
                          tabSize: 4,
                          formatOnPaste: true,
                        }}
                      />
                    </div>
                  </div>

                  {/* Right: Evaluation Runner */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Evaluation Runner (Hidden) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-amber-600 font-mono font-medium">
                        Hidden evaluation wrapper
                      </span>
                    </div>
                    <div className="border border-slate-700 bg-[#1e1e1e] overflow-hidden shadow-inner">
                      <Editor
                        height="260px"
                        language={mapLanguageToMonaco(activeCodeLang)}
                        value={codeTemplates[activeCodeLang].driver}
                        onChange={(val) => handleDriverChange(activeCodeLang, val || "")}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                          scrollBeyondLastLine: false,
                          lineNumbers: "on",
                          renderLineHighlight: "all",
                          roundedSelection: false,
                          scrollbar: {
                            vertical: "auto",
                            horizontal: "auto",
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                          },
                          automaticLayout: true,
                          padding: { top: 12, bottom: 12 },
                          tabSize: 4,
                          formatOnPaste: true,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* PreFlight Verification Test Run Panel inside Code Setup */}
                <PreFlightVerificationPanel
                  questionId={createdQuestionId || undefined}
                  language={activeCodeLang}
                  driverCode={codeTemplates[activeCodeLang].driver}
                  testCases={testCases.map((tc, idx) => ({ ...tc, id: `tc-${idx}`, codingQuestionId: createdQuestionId || "" }))}
                  onSaveFirstRequired={handleSaveDraftForVerification}
                  onVerificationSuccess={(res) => {
                    const bLang = mapFrontendToBackendLang(activeCodeLang);
                    setVerifiedLanguages((prev) => Array.from(new Set([...prev, bLang])));
                    setPendingLanguages((prev) => prev.filter((l) => l !== bLang));
                    if (res.questionStatus) {
                      setQuestionStatus(res.questionStatus);
                    }
                  }}
                />
              </div>

              {/* Box 4: Test Cases in Compact Layout */}
              <div className="bg-white border border-slate-200/90 shadow-sm p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Test Cases</h3>
                    <p className="text-[11px] text-slate-400">Add sample cases (visible) and hidden test cases (for grading)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addTestCase(true)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      + Sample Case
                    </button>
                    <button
                      type="button"
                      onClick={() => addTestCase(false)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      + Hidden Case
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-slate-200 text-xs space-y-2.5 bg-slate-50/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                              tc.sample
                                ? "bg-white text-slate-800 border-slate-300 shadow-2xs"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {tc.sample ? "Sample" : "Hidden"} #{idx + 1}
                          </span>
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-medium">Weight %:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={tc.weight}
                              onChange={(e) => updateTestCase(idx, "weight", Number(e.target.value))}
                              className="w-14 border-b border-slate-300 px-1 py-0.5 text-xs bg-transparent focus:outline-none focus:border-[#4353a4]"
                            />
                          </div>
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTestCase(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              title="Remove Test Case"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Input</label>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                            placeholder="e.g. 10"
                            className="w-full border border-slate-200 p-2 text-xs font-mono bg-white focus:outline-none focus:border-[#4353a4]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Expected Output</label>
                          <textarea
                            rows={2}
                            value={tc.expectedOutput}
                            onChange={(e) => updateTestCase(idx, "expectedOutput", e.target.value)}
                            placeholder="e.g. 19"
                            className="w-full border border-slate-200 p-2 text-xs font-mono bg-white focus:outline-none focus:border-[#4353a4]"
                          />
                        </div>
                      </div>

                      {tc.sample && (
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">Explanation (Optional)</label>
                          <input
                            type="text"
                            value={tc.explanation || ""}
                            onChange={(e) => updateTestCase(idx, "explanation", e.target.value)}
                            placeholder="e.g. n = 10 -> 10 + 9 = 19"
                            className="w-full border-b border-slate-200 py-1 text-xs text-slate-800 bg-transparent focus:outline-none focus:border-[#4353a4]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Clean Action Buttons (1 col) */}
        <div className="lg:col-span-1 space-y-4 sticky top-20">
            <div className="bg-white border border-slate-200/90 shadow-sm p-5 space-y-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving || createMutation.isPending}
                className="w-full py-3 bg-[#4353a4] hover:bg-[#38468d] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isSaving || createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isEditMode ? "UPDATE PROBLEM" : "SAVE PROBLEM"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving || createMutation.isPending}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{isEditMode ? "UPDATE AND CLONE" : "SAVE AND CLONE"}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/library")}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Taxonomy Management Quick Card */}
            <div className="bg-white border border-slate-200/90 shadow-sm p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-800">
                <FolderTree className="w-4 h-4 text-[#4353a4]" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Taxonomy</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Need a new subject or topic? Add, rename, or organize them here anytime.
              </p>
              <button
                type="button"
                onClick={() => setManageSubjectsOpen(true)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#4353a4]" />
                <span>Manage Subjects & Topics</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Quick Manage Subjects / Topics / Subtopics Dialog */}
      <QuickManageSubjects
        open={manageSubjectsOpen}
        onOpenChange={setManageSubjectsOpen}
      />
    </div>
  );
}
