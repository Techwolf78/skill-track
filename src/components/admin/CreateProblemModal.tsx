import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { McqType } from "@/lib/test-service";
import { toast } from "sonner";

export interface CreateProblemInitialData {
  title: string;
  questionType: "CODING" | "MCQ";
  mcqType: McqType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isLanguageSpecific?: boolean;
}

export function CreateProblemModal({
  isOpen,
  onClose,
  onCreate,
  onOpenBulkUploader,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (initialData: CreateProblemInitialData) => void;
  onOpenBulkUploader?: () => void;
}) {
  const [name, setName] = useState("");
  const [problemCategory, setProblemCategory] = useState<string>("CODING");
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
        {/* Header Bar */}
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
            <p className="text-[11px] text-slate-400">A descriptive name helps organize your question library.</p>
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

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {onOpenBulkUploader ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBulkUploader();
                }}
                className="text-xs text-[#4353a4] hover:underline font-medium cursor-pointer"
              >
                Or upload questions in bulk via Excel
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-6 py-2 bg-[#4353a4] hover:bg-[#344287] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
