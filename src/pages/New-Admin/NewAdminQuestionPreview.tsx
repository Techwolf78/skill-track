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
import { testService, Question, McqOption, McqType } from "@/lib/test-service";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "—";

const fmtMcqType = (t?: string) => {
  if (!t) return "MCQ";
  switch (t.toUpperCase()) {
    case "SINGLE_CORRECT":
      return "MCQ";
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

  // Candidate interactive preview state
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<number[]>([]);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

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
          onClick={() => navigate("/new-admin/library")}
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased relative">
      {/* ── 1. Top Navbar (Clean header matching Create Question) ── */}
      <header className="h-20 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Breadcrumb (Library > Question Title) */}
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <div
            onClick={() => navigate("/new-admin/library")}
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
              onClick={() => navigate("/new-admin/library")}
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
                onClick={() => navigate("/new-admin/library")}
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

      {/* ── 3. Main Workspace Area (Title tightly placed directly above white card) ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-20 w-full relative z-10">
        {/* Back to Library Button above title */}
        <button
          onClick={() => navigate("/new-admin/library")}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mb-2.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        {/* Title & Type Metadata Row (Tightly above white card matching Create Question) */}
        <div className="space-y-1.5 mb-4 text-white">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {question.title || "Untitled Problem"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="text-slate-400">=</span> {isCoding ? "Coding" : fmtMcqType(question.mcqType) || "MCQ"}
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <DifficultyIcon level={question.difficulty} />
              <span>{fmt(question.difficulty)}</span>
            </span>
            {question.marks !== undefined && (
              <span className="text-slate-300">
                • {question.marks} Marks
              </span>
            )}
            {question.avg_time_seconds && (
              <span className="text-slate-300">
                • {Math.round(question.avg_time_seconds / 60)} Mins
              </span>
            )}
            {question.subject?.name && (
              <span className="text-slate-300">
                • Subject: <span className="text-slate-200 font-medium">{question.subject.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── 4. White Workspace Card ── */}
        <div className="bg-white rounded-sm border border-slate-200/90 shadow-xl overflow-hidden min-h-[560px] flex flex-col">
          {/* Top Tab Bar: SOLVE */}
          <div className="border-b border-slate-200 flex items-center justify-between px-6 bg-white">
            <div className="flex items-center space-x-8">
              <div className="py-3.5 border-b-2 border-[#10B981] text-[#0d9488] text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-default">
                <span>SOLVE</span>
              </div>
            </div>

            {/* Admin Controls: Toggle Answer Key */}
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

              {isCoding && (
                <button
                  onClick={() => navigate(`/new-admin/playground/${question.id}`)}
                  className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Playground</span>
                </button>
              )}
            </div>
          </div>

          {/* ── 2-Column Split Content ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left Column: DESCRIPTION */}
            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h2 className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                  DESCRIPTION
                </h2>

                {/* Assertion Reason layout if applicable */}
                {isAssertionReason ? (
                  <div className="space-y-4 text-xs text-slate-800 leading-relaxed">
                    <div className="p-3.5 bg-slate-50 border-l-4 border-indigo-500 rounded-r">
                      <p className="font-semibold text-slate-700 mb-1">Assertion (A)</p>
                      <p className="text-slate-800">{assertion || question.prompt || "No assertion provided"}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 border-l-4 border-indigo-500 rounded-r">
                      <p className="font-semibold text-slate-700 mb-1">Reason (R)</p>
                      <p className="text-slate-800">{reason || "No reason provided"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                    {question.prompt || "No description provided for this question."}
                  </div>
                )}

                {/* Coding problem specific details if present */}
                {isCoding && (
                  <div className="mt-6 space-y-4 pt-4 border-t border-slate-100 text-xs">
                    {question.constraints && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1">Constraints:</p>
                        <pre className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                          {question.constraints}
                        </pre>
                      </div>
                    )}

                    {question.sampleExplanation && (
                      <div>
                        <p className="font-bold text-slate-700 mb-1">Sample Explanation:</p>
                        <p className="text-slate-600">{question.sampleExplanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Section */}
                {question.tags && question.tags.length > 0 && (
                  <div className="pt-4 flex flex-wrap items-center gap-1.5">
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
              </div>

              {/* Bottom Reporting Link */}
              <div className="pt-6 text-xs text-slate-500 flex items-center gap-1.5">
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

            {/* Right Column: Answer Choices */}
            <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between bg-white">
              <div className="space-y-5">
                {/* Header Row: Answer Choices + CLEAR button */}
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

                {/* Attempted Status Badge */}
                {isAttempted && (
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-purple-300 bg-purple-50 text-purple-700 text-[11px] font-semibold tracking-wider rounded uppercase">
                      <span>🖊</span> ATTEMPTED
                    </span>
                  </div>
                )}

                {/* Coding Question Alternative Right Panel */}
                {isCoding ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-4 my-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                      <Code2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800">Interactive Coding Question</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        This is a coding problem with test cases and runtime evaluation. Launch the full-screen IDE playground to write code and test solutions.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/new-admin/playground/${question.id}`)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Launch Coding Playground</span>
                    </button>
                  </div>
                ) : (
                  /* MCQ Options List (Dark Box Code / Text Style) */
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
                              isSelected
                                ? "ring-1 ring-indigo-400/80"
                                : ""
                            }`}
                          >
                            {/* Selector (Radio or Checkbox) */}
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

                            {/* Option Box (Dark Container matching reference image) */}
                            <div
                              className={`flex-1 min-h-[48px] px-4 py-3 bg-[#13171f] hover:bg-[#1a202c] text-white rounded text-xs font-mono transition-all flex items-center justify-between border ${
                                showAnswerKey && isCorrectOption
                                  ? "border-emerald-500 ring-1 ring-emerald-500"
                                  : isSelected
                                  ? "border-indigo-500"
                                  : "border-[#232936]"
                              }`}
                            >
                              <span className="leading-relaxed select-none">
                                {opt.text || `Option ${String.fromCharCode(65 + idx)}`}
                              </span>

                              {/* Admin Answer Key Tag */}
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
                )}
              </div>

              {/* Footer Banner */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
                <button
                  onClick={() => navigate("/new-admin/library")}
                  className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
