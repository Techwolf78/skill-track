import React, { useState } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Code2,
} from "lucide-react";
import {
  testService,
  TestCase,
} from "@/lib/test-service";
import {
  ValidateDriverResponse,
  TestCaseRunResult,
  getLanguageDisplayName,
  mapFrontendToBackendLang,
} from "@/types/question";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PreFlightVerificationPanelProps {
  questionId?: string;
  language: string;
  driverCode: string;
  testCases?: TestCase[];
  onVerificationSuccess?: (response: ValidateDriverResponse) => void;
  onSaveFirstRequired?: () => Promise<string | undefined>;
  className?: string;
}

const DEFAULT_REFERENCE_SOLUTIONS: Record<string, string> = {
  python3: `class Solution:
    def solve(self, n: int) -> int:
        # Write your logic here
        return n + 9
`,
  python: `class Solution:
    def solve(self, n: int) -> int:
        # Write your logic here
        return n + 9
`,
  javascript: `class Solution {
    solve(n) {
        // Write your logic here
        return n + 9;
    }
}
`,
  java: `class Solution {
    public int solve(int n) {
        // Write your logic here
        return n + 9;
    }
}
`,
  cpp: `class Solution {
public:
    int solve(int n) {
        // Write your logic here
        return n + 9;
    }
};
`,
};

export const PreFlightVerificationPanel: React.FC<PreFlightVerificationPanelProps> = ({
  questionId,
  language,
  driverCode,
  testCases = [],
  onVerificationSuccess,
  onSaveFirstRequired,
  className = "",
}) => {
  const [referenceSolution, setReferenceSolution] = useState<string>(
    DEFAULT_REFERENCE_SOLUTIONS[language] || ""
  );
  const [runScope, setRunScope] = useState<"SAMPLE" | "ALL">("ALL");
  const [isValidating, setIsValidating] = useState(false);
  const [lastResponse, setLastResponse] = useState<ValidateDriverResponse | null>(null);
  const [expandedTestCases, setExpandedTestCases] = useState<Record<string, boolean>>({});

  // Synchronize default reference solution template when language changes
  React.useEffect(() => {
    if (!referenceSolution || Object.values(DEFAULT_REFERENCE_SOLUTIONS).includes(referenceSolution)) {
      setReferenceSolution(DEFAULT_REFERENCE_SOLUTIONS[language] || "");
    }
  }, [language]);

  const toggleTestCaseExpand = (id: string) => {
    setExpandedTestCases((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRunVerification = async () => {
    if (!referenceSolution.trim()) {
      toast.error("Please enter a reference solution to verify the driver code.");
      return;
    }
    if (!driverCode.trim()) {
      toast.error("Execution driver code cannot be blank.");
      return;
    }

    let targetQuestionId = questionId;

    if (!targetQuestionId && onSaveFirstRequired) {
      toast.info("Saving draft question before executing pre-flight check...");
      try {
        targetQuestionId = await onSaveFirstRequired();
      } catch (err: any) {
        toast.error("Failed to save draft question: " + (err.message || "Unknown error"));
        return;
      }
    }

    if (!targetQuestionId) {
      toast.error("Please save the question first before validating drivers.");
      return;
    }

    // Determine target test case IDs if running sample only
    let testCaseIds: string[] | undefined = undefined;
    if (runScope === "SAMPLE" && testCases.length > 0) {
      const sampleCases = testCases.filter((tc) => tc.sample && tc.id);
      if (sampleCases.length > 0) {
        testCaseIds = sampleCases.map((tc) => tc.id as string);
      }
    }

    try {
      setIsValidating(true);
      const res = await testService.validateDriver(targetQuestionId, {
        language: mapFrontendToBackendLang(language),
        referenceSolution,
        driverCode,
        testCaseIds,
      });

      setLastResponse(res);

      if (res.status === "PASSED") {
        if (res.questionStatus === "ACTIVE" || (res.pendingLanguages && res.pendingLanguages.length === 0)) {
          toast.success(
            `Driver verified for ${getLanguageDisplayName(language)}! All declared drivers passed. Question is now ACTIVE.`
          );
        } else {
          toast.success(
            `Driver verified for ${getLanguageDisplayName(language)}! (${res.testCasesPassed}/${res.testCasesTotal} test cases passed)`
          );
        }
        if (onVerificationSuccess) {
          onVerificationSuccess(res);
        }
      } else {
        toast.error(
          `Pre-flight verification failed for ${getLanguageDisplayName(language)} with status: ${res.status}`
        );
      }
    } catch (err: any) {
      console.error("[PreFlightVerification] Validation error:", err);
      toast.error(
        "Pre-flight verification failed: " +
          (err?.response?.data?.message || err.message || "Execution engine unreachable")
      );
    } finally {
      setIsValidating(false);
    }
  };

  const isPassed = lastResponse?.status === "PASSED";
  const isFailed = lastResponse && lastResponse.status !== "PASSED";

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50/60 p-5 text-slate-800 shadow-xs space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200/80 text-slate-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Pre-Flight Driver Verification ({getLanguageDisplayName(language)})
            </h4>
            <p className="text-[11px] text-slate-500">
              Executes reference solution against test cases via Judge0 to verify harness syntax & IO mapping
            </p>
          </div>
        </div>

        {/* Scope selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Scope:</span>
          <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setRunScope("SAMPLE")}
              className={`rounded px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                runScope === "SAMPLE"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sample Cases
            </button>
            <button
              type="button"
              onClick={() => setRunScope("ALL")}
              className={`rounded px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                runScope === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Cases
            </button>
          </div>
        </div>
      </div>

      {/* Reference Solution Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-slate-500" />
            Working Reference Solution ({getLanguageDisplayName(language)})
          </label>
          <span className="text-[10px] text-slate-400 font-mono">Hidden • Used only for pre-flight testing</span>
        </div>

        <textarea
          value={referenceSolution}
          onChange={(e) => setReferenceSolution(e.target.value)}
          placeholder={`Enter reference code to prove the ${getLanguageDisplayName(language)} driver works correctly...`}
          rows={7}
          className="w-full rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 leading-relaxed shadow-inner"
          spellCheck={false}
        />
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs text-slate-500">
          Driver must pass against test cases before question status transitions to{" "}
          <span className="font-semibold text-slate-800">ACTIVE</span>.
        </div>

        <button
          type="button"
          onClick={handleRunVerification}
          disabled={isValidating}
          className="inline-flex items-center gap-2 rounded-md bg-[#10B981] hover:bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isValidating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Verifying on Judge0...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Verify {getLanguageDisplayName(language)} Driver</span>
            </>
          )}
        </button>
      </div>

      {/* Execution Results Inspector */}
      {lastResponse && (
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              {isPassed ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>PRE-FLIGHT PASSED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded text-xs font-bold">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>PRE-FLIGHT FAILED ({lastResponse.status})</span>
                </div>
              )}

              <Badge
                variant="outline"
                className="text-[11px] font-mono px-2 py-0.5 text-slate-600 border-slate-200 bg-slate-50"
              >
                {lastResponse.testCasesPassed} / {lastResponse.testCasesTotal} Test Cases Passed
              </Badge>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Question Status:{" "}
              <span
                className={`font-bold ${
                  lastResponse.questionStatus === "ACTIVE"
                    ? "text-emerald-600"
                    : "text-slate-700"
                }`}
              >
                {lastResponse.questionStatus}
              </span>
            </div>
          </div>

          {/* Test Case Breakdown */}
          {lastResponse.results && lastResponse.results.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Execution Breakdown ({lastResponse.results.length} Cases)
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {lastResponse.results.map((res: TestCaseRunResult, idx: number) => {
                  const passed = res.status === "ACCEPTED";
                  const isExpanded = !!expandedTestCases[res.testCaseId || String(idx)];
                  return (
                    <div
                      key={res.testCaseId || idx}
                      className={`rounded-md border text-xs overflow-hidden transition-colors ${
                        passed
                          ? "border-slate-200 bg-slate-50/50"
                          : "border-rose-200 bg-rose-50/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTestCaseExpand(res.testCaseId || String(idx))}
                        className="w-full flex items-center justify-between p-2.5 hover:bg-slate-100/60 text-left focus:outline-none cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span className="font-semibold text-slate-800 font-mono">
                            Test Case #{idx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              passed
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-rose-100 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {res.execTimeMs ?? 0} ms
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-200 p-3 bg-slate-900 space-y-2.5 text-slate-100 text-[11px] font-mono rounded-b-md">
                          {res.compileOutput && (
                            <div>
                              <div className="text-rose-400 font-semibold mb-0.5">
                                Compilation Output:
                              </div>
                              <pre className="p-2 rounded bg-black/60 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                                {res.compileOutput}
                              </pre>
                            </div>
                          )}

                          {res.stderr && (
                            <div>
                              <div className="text-amber-400 font-semibold mb-0.5">Stderr:</div>
                              <pre className="p-2 rounded bg-black/60 text-amber-300 overflow-x-auto whitespace-pre-wrap">
                                {res.stderr}
                              </pre>
                            </div>
                          )}

                          <div>
                            <div className="text-slate-400 font-semibold mb-0.5">Stdout:</div>
                            <pre className="p-2 rounded bg-black/60 text-slate-200 overflow-x-auto whitespace-pre-wrap">
                              {res.stdout ?? "<no output>"}
                            </pre>
                          </div>

                          {res.expectedOutput && (
                            <div>
                              <div className="text-slate-400 font-semibold mb-0.5">
                                Expected Output:
                              </div>
                              <pre className="p-2 rounded bg-black/60 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                {res.expectedOutput}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
