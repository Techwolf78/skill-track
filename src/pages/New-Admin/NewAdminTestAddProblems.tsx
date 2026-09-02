import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  BarChart2,
  Loader2,
  Plus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShoppingCart,
  Files,
  Monitor,
  Terminal,
  ArrowLeft,
  LogOut,
  User as UserIcon,
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
import { useAuth } from "@/lib/auth-context";
import { useQuestionsQuery } from "@/hooks/use-query-hooks";
import { testService, Question, Test } from "@/lib/test-service";
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

const fmtTime = (q: any) => {
  if (q.avg_time_seconds && q.avg_time_seconds > 0) {
    const m = Math.round(q.avg_time_seconds / 60);
    return `${m > 0 ? m : 1} min${m > 1 ? "s" : ""}.`;
  }
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewAdminTestAddProblems() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  // Reads ?section=<name> set by the "Add Here" button in the Problems tab
  const targetSection = searchParams.get("section") || undefined;

  const [test, setTest] = useState<Test | null>(null);
  const [addedQuestionIds, setAddedQuestionIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(Boolean(id));

  // Library Queries & States
  const { data: dbQuestions = [], isLoading: isLoadingQuestions, isError, refetch } = useQuestionsQuery();

  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType>("PUBLIC");
  const [problemType, setProblemType] = useState<ProblemType>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [searchQuery, setSearchQuery] = useState("");
  const [techSearch, setTechSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Test Details and Existing Mappings
  useEffect(() => {
    if (!id) return;
    setLoadingTest(true);

    Promise.all([
      testService.getTestById(id),
      testService.getTestQuestions(id),
    ])
      .then(([testData, testQuestionsData]) => {
        setTest(testData);
        const ids = new Set((testQuestionsData || []).map((tq) => tq.questionId));
        setAddedQuestionIds(ids);
      })
      .catch((err) => {
        console.error("[NewAdminTestAddProblems] Error loading test details:", err);
      })
      .finally(() => {
        setLoadingTest(false);
      });
  }, [id]);

  // Handle Adding a Question to Test (Checkpoint 1: Surface warning if UNDER_REVIEW)
  const handleAddQuestion = async (q: Question) => {
    if (!id) return;
    try {
      setAddingId(q.id);
      const existing = await testService.getTestQuestions(id);
      const maxOrder = (existing || []).reduce((max, tq) => Math.max(max, tq.orderIndex ?? 0), 0);
      const nextOrderIndex = maxOrder + 1;
      const marks = q.marks ?? (q.questionType === "CODING" ? 100 : 10);

      const res = await testService.addQuestionToTestWithWarnings(id, q.id, nextOrderIndex, marks, undefined, targetSection);
      setAddedQuestionIds((prev) => new Set([...prev, q.id]));
      toast.success(`"${q.title || 'Problem'}" added to test!`);

      // Checkpoint 1 Non-blocking Warning Toast
      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach((warn) => toast.warning(warn, { duration: 7000 }));
      } else if (q.status === "UNDER_REVIEW" || (q.questionType === "CODING" && (!q.verifiedLanguages || q.verifiedLanguages.length === 0))) {
        toast.warning(
          `Notice: Question "${q.title || 'Problem'}" is currently UNDER_REVIEW. Execution drivers have not been verified against reference solutions.`,
          { duration: 7000 }
        );
      }
    } catch (err: any) {
      console.error("[NewAdminTestAddProblems] Failed to add question:", err);
      toast.error("Failed to add question to test: " + (err?.response?.data?.message || err.message || "Unknown error"));
    } finally {
      setAddingId(null);
    }
  };

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

  const testTitle = test?.title || "Test";

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* ── 1. Top Navbar (Dark Gryphon360 Navbar) ── */}
      <header className="h-20 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Breadcrumbs */}
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <div
            onClick={() => navigate(`/admin/tests/edit/${id}`)}
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
              onClick={() => navigate("/admin/tests")}
              className="hover:text-slate-200 cursor-pointer transition-colors shrink-0"
            >
              Tests
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <button
              onClick={() => navigate(`/admin/tests/edit/${id}`)}
              className="hover:text-slate-200 cursor-pointer transition-colors truncate max-w-[150px]"
            >
              {testTitle}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-200 font-semibold truncate">
              Add Problems from Library
            </span>
          </div>
        </div>

        {/* Right Side: User Profile */}
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
                onClick={() => navigate(`/admin/tests/edit/${id}`)}
                className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                Return to Test Edit
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

      {/* ── 2. Top Test Context Banner ── */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/tests/edit/${id}`)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-none transition-colors cursor-pointer"
              title="Return to Test"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-none">
                {testTitle}
              </h2>
              <span className="text-xs text-slate-500 font-normal">
                ({addedQuestionIds.size} {addedQuestionIds.size === 1 ? "problem" : "problems"} added)
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/admin/tests/edit/${id}`)}
            className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-none shadow-xs transition-colors inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* ── 3. Main Library Layout (Same as NewAdminLibrary) ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full flex-1">
        <div className="flex flex-col lg:flex-row gap-5 pb-16 items-start">
          {/* ── Left Sidebar (5 Modular Cards) ── */}
          <aside className="w-full lg:w-60 shrink-0 space-y-4">
            {/* Card 1: Available libraries */}
            <div className="bg-white border border-slate-200/80 shadow-xs py-4 overflow-hidden space-y-3.5">
              <p className="text-xs font-normal text-slate-500 px-4">Available libraries</p>
              <div className="space-y-2.5">
                {/* Public Questions */}
                <button
                  onClick={() => setSelectedLibrary("PUBLIC")}
                  className={`w-full flex items-center gap-3 px-4 py-1 text-left transition-colors relative cursor-pointer ${
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
                  className={`w-full flex items-center gap-3 px-4 py-1 text-left transition-colors relative cursor-pointer ${
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

            {/* Card 2: Filters (Problem Type Pills) */}
            <div className="bg-white border border-slate-200/80 shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-800">Filters</span>
                <button
                  onClick={() => {
                    setProblemType("ALL");
                    setSearchQuery("");
                    setTechSearch("");
                    setTagSearch("");
                    setSelectedLevel("ALL");
                  }}
                  className="text-[11px] font-bold text-[#3b82f6] hover:text-blue-700 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  CLEAR ALL
                </button>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-700 block">Problem type</span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: "ALL", label: "All" },
                      { key: "CODING", label: "Coding" },
                      { key: "LANGUAGE_SPECIFIC_CODING", label: "Language Specific" },
                      { key: "SINGLE_CORRECT", label: "Single Choice" },
                      { key: "MULTIPLE_CORRECT", label: "Multiple Choice" },
                      { key: "TRUE_FALSE", label: "True / False" },
                      { key: "ASSERTION_REASON", label: "Assertion Reason" },
                      { key: "FILL_IN_THE_BLANK", label: "Fill in the blanks" },
                    ] as const
                  ).map((opt) => {
                    const active = problemType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setProblemType(opt.key)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-[#1e293b] text-white"
                            : "bg-[#f0f4f8] hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 3: Technologies */}
            <div className="bg-white border border-slate-200/80 shadow-xs p-4 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Technologies</span>
              <input
                type="text"
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                placeholder="Search for a technology..."
                className="w-full pb-1 text-xs text-slate-800 placeholder-slate-400 border-b border-slate-200 focus:border-indigo-500 focus:outline-none bg-transparent"
              />
            </div>

            {/* Card 4: Tags */}
            <div className="bg-white border border-slate-200/80 shadow-xs p-4 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Tags</span>
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search for a tag..."
                className="w-full pb-1 text-xs text-slate-800 placeholder-slate-400 border-b border-slate-200 focus:border-indigo-500 focus:outline-none bg-transparent"
              />
            </div>

            {/* Card 5: Other filters */}
            <div className="bg-white border border-slate-200/80 shadow-xs p-4 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Other filters</span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600">Level</span>
                <div className="relative">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as any)}
                    className="appearance-none bg-transparent pr-5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer text-right"
                  >
                    <option value="ALL">All</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main Questions List Panel ── */}
          <section className="flex-1 min-w-0 space-y-4 w-full">
            {/* Top Toolbar Row: Search, Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions by title or description..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-600">
                <span>Sort by:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-white border border-slate-200 px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                  >
                    <option value="NEWEST">Newest First</option>
                    <option value="OLDEST">Oldest First</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Questions List Container */}
            <div className="bg-white border border-slate-200 overflow-hidden shadow-xs">
              {isLoadingQuestions || loadingTest ? (
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
                    const isAlreadyAdded = addedQuestionIds.has(q.id);
                    const isCurrentlyAdding = addingId === q.id;
                    const time = fmtTime(q);

                    return (
                      <div key={q.id} className="p-6 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                        {/* Header Row: Title & Action Icons (+ Add Button) */}
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-bold text-slate-900 text-[15px] leading-snug">
                            {q.title || "Untitled Problem"}
                          </h3>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* ── Add / Added Action Button ── */}
                            {isAlreadyAdded ? (
                              <span 
                                className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold inline-flex items-center justify-center"
                                title="Already added to test"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddQuestion(q)}
                                disabled={isCurrentlyAdding}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Add to test"
                              >
                                {isCurrentlyAdding ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4 stroke-[3]" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metadata Row: ≡ MCQ, ⊙ Single, Difficulty, Time, Lifecycle Status */}
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

                        {/* Problem Statement / Prompt */}
                        <p className="pt-0.5 text-xs text-slate-600 leading-relaxed font-normal line-clamp-3">
                          {q.prompt ? q.prompt.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "Not available"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoadingQuestions && !isError && totalQuestions > 0 && (
              <div className="bg-white border border-slate-200/80 shadow-xs p-3 flex flex-wrap items-center justify-end gap-5 text-xs text-slate-600">
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
                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
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
                    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
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
          </section>
        </div>
      </main>
    </div>
  );
}
