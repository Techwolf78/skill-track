import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLanguageDisplayName } from "@/types/question";

export interface UnverifiedQuestionSummary {
  id: string;
  title: string;
  pendingLanguages?: string[];
  status?: string;
}

interface PublishTestConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testTitle: string;
  testId?: string;
  unverifiedQuestions?: UnverifiedQuestionSummary[];
  onConfirmPublish: () => void | Promise<void>;
  onReviewQuestions?: () => void;
  isPublishing?: boolean;
}

export const PublishTestConfirmationModal: React.FC<PublishTestConfirmationModalProps> = ({
  open,
  onOpenChange,
  testTitle,
  testId,
  unverifiedQuestions = [],
  onConfirmPublish,
  onReviewQuestions,
  isPublishing = false,
}) => {
  const hasUnverified = unverifiedQuestions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-white border border-slate-200 text-slate-800 shadow-2xl p-0 overflow-hidden">
        {/* Header Bar */}
        <div
          className={`p-5 border-b ${
            hasUnverified
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-indigo-50/70 border-slate-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                hasUnverified
                  ? "bg-amber-100 text-amber-600"
                  : "bg-indigo-100 text-indigo-600"
              }`}
            >
              {hasUnverified ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {hasUnverified ? "Publish Test Confirmation" : "Ready to Publish Test"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-0.5">
                {testTitle ? `"${testTitle}"` : "Assessment"}{" "}
                {hasUnverified
                  ? "contains questions with unverified driver code."
                  : "will become accessible to candidates according to test schedules."}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {hasUnverified ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Driver Verification Checkpoint
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">{unverifiedQuestions.length} coding question{unverifiedQuestions.length > 1 ? "s" : ""}</span> in this test {unverifiedQuestions.length > 1 ? "have" : "has"} unverified execution drivers:
                  </p>
                </div>
              </div>

              {/* Unverified Question List */}
              <div className="space-y-2 pt-1">
                {unverifiedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded bg-white border border-amber-200/80 text-xs shadow-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate max-w-[280px]">
                      • {q.title || "Untitled Coding Question"}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Pending:</span>
                      {(q.pendingLanguages && q.pendingLanguages.length > 0) ? (
                        q.pendingLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {getLanguageDisplayName(lang)}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Pending Verification
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-amber-800/90 pt-1 leading-normal">
                Candidates attempting these languages may encounter execution issues if drivers are invalid. You may review the questions or publish anyway.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                All attached coding questions have verified drivers. Once published, candidates invited to this test or participating via access links will be able to take the assessment.
              </p>
              <div className="rounded border border-emerald-200 bg-emerald-50/60 p-3 flex items-center gap-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All language templates and driver harnesses are ready for execution.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex flex-row items-center justify-end gap-2">
          {hasUnverified && onReviewQuestions ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onReviewQuestions();
                }}
                className="px-3.5 py-2 rounded text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                Review Questions
              </button>
              <button
                type="button"
                onClick={onConfirmPublish}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Anyway</span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3.5 py-2 rounded text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmPublish}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Test</span>
                )}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
