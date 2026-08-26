import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Code2,
  FileText,
  Flag,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  RotateCcw,
  Sparkles,
  Send,
  HelpCircle,
  Play,
  Terminal,
  CheckSquare,
  AlignLeft,
  ToggleLeft,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Test, TestQuestion, Question } from "@/lib/test-service";

export interface EnrichedTestQuestion extends TestQuestion {
  question?: Question & {
    type?: string;
    avgTimeSeconds?: number;
    avg_time_seconds?: number;
    options?: unknown[];
    mcqOptions?: unknown[];
  };
}

interface TestCandidatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: Test | null;
  questions: EnrichedTestQuestion[];
}

export function TestCandidatePreviewModal({
  isOpen,
  onClose,
  test,
  questions,
}: TestCandidatePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [simulatedTimeLeft, setSimulatedTimeLeft] = useState<number>(
    (test?.durationMins || 60) * 60,
  );
  const [codeOutput, setCodeOutput] = useState<string | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset or setup timer simulation on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setAnswers({});
      setFlagged(new Set());
      setSimulatedTimeLeft((test?.durationMins || 60) * 60);
      setCodeOutput(null);
      setShowSubmitDialog(false);
      setIsSubmitted(false);
      setIsFullscreen(false);
    }
  }, [isOpen, test]);

  // Toggle native browser full screen (like Chrome F11)
  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Sync state with native browser fullscreen changes (e.g. when user presses F11 or Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Exit native browser fullscreen when closing the preview modal
  useEffect(() => {
    if (!isOpen && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [isOpen]);

  // Tick simulated timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSimulatedTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTQ = questions[currentIndex];
  const currentQ = currentTQ?.question;

  const totalQuestions = questions.length;
  const currentMarks = currentTQ?.marks || currentQ?.marks || 1;

  // Comprehensive Question Type Detection
  const rawQType = (
    currentQ?.questionType ||
    (currentQ as { type?: string })?.type ||
    (currentQ as { question_type?: string })?.question_type ||
    (currentTQ as { questionType?: string })?.questionType ||
    (currentTQ as { question_type?: string })?.question_type ||
    ""
  ).toUpperCase();

  const isCoding =
    rawQType === "CODING" ||
    !!currentQ?.codeTemplate ||
    !!currentQ?.starterCode ||
    !!currentQ?.coding ||
    !!(currentQ as { examples?: unknown[] })?.examples;

  const rawMcqType = (
    (currentQ as { mcqType?: string })?.mcqType ||
    (currentQ as { mcq_type?: string })?.mcq_type ||
    ""
  ).toUpperCase();

  const isMultipleCorrect =
    !isCoding &&
    (rawMcqType === "MULTIPLE_CORRECT" ||
      rawMcqType === "IMAGE_MULTIPLE_CORRECT" ||
      (currentQ as { multipleCorrect?: boolean })?.multipleCorrect === true);

  const isTrueFalse =
    !isCoding &&
    (rawMcqType === "TRUE_FALSE" || rawQType === "TRUE_FALSE");

  const isFillBlank =
    !isCoding &&
    (rawMcqType === "FILL_IN_THE_BLANK" ||
      rawQType === "FILL_IN_THE_BLANK" ||
      rawQType === "FILL_BLANK");

  const isAssertionReason =
    !isCoding &&
    (rawMcqType === "ASSERTION_REASON" || rawQType === "ASSERTION_REASON");

  const isImageBased =
    !isCoding &&
    (rawMcqType === "IMAGE_SINGLE_CORRECT" ||
      rawMcqType === "IMAGE_MULTIPLE_CORRECT");

  // Assertion and Reason extraction
  let assertion = (currentQ as { assertion?: string })?.assertion;
  let reason = (currentQ as { reason?: string })?.reason;
  if (isAssertionReason && (!assertion || !reason)) {
    const match = currentQ?.prompt?.match(
      /Assertion \(A\): (.*?)\.? Reason \(R\): (.*?)\.?$/,
    );
    if (match) {
      if (!assertion) assertion = match[1];
      if (!reason) reason = match[2];
    }
  }

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleToggleMultipleAnswer = (qId: string, optId: string) => {
    setAnswers((prev) => {
      const currentVal = prev[qId] || "";
      const selected = currentVal ? currentVal.split(",") : [];
      const index = selected.indexOf(optId);
      if (index > -1) {
        selected.splice(index, 1);
      } else {
        selected.push(optId);
      }
      if (selected.length === 0) {
        const next = { ...prev };
        delete next[qId];
        return next;
      }
      return { ...prev, [qId]: selected.join(",") };
    });
  };

  const handleToggleFlag = (qId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleRunCodeMock = () => {
    setIsRunningCode(true);
    setTimeout(() => {
      setIsRunningCode(false);
      setCodeOutput("✓ Code compiled successfully.\n✓ Sample Test Case 1: Passed\n✓ Sample Test Case 2: Passed");
    }, 700);
  };

  // Get raw options list safely
  const rawOptions = (currentQ?.options || currentQ?.mcqOptions || []) as unknown[];
  const optionsList: Array<{ id?: string; text?: string; imageUrl?: string }> = rawOptions.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return opt as { id?: string; text?: string; imageUrl?: string };
    }
    return { text: String(opt) };
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "p-0 flex flex-col overflow-hidden border bg-background text-foreground shadow-2xl transition-all duration-300",
          isFullscreen
            ? "max-w-none w-screen h-screen max-h-screen rounded-none border-0"
            : "max-w-[96vw] w-[1440px] h-[94vh] max-h-[94vh] rounded-xl",
        )}
      >
        {/* Banner Alert: Admin Preview Mode */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-amber-900 dark:text-amber-300">
              Admin Preview Sandbox
            </span>
            <span className="text-amber-700 dark:text-amber-400/80 hidden sm:inline">
              — This is the exact environment candidates see. Submissions & proctoring here are simulated.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isFullscreen && (
              <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 hidden md:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-xs">Esc</kbd> to exit fullscreen
              </span>
            )}
            <Badge
              variant="outline"
              className="border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 text-[11px]"
            >
              Live Simulation
            </Badge>
          </div>
        </div>

        {/* Candidate Assessment Header - Exactly matching TestInterface */}
        <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{test?.title || "Test"}</h1>
            <p className="text-xs text-muted-foreground">{test?.description}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-mono font-medium",
                simulatedTimeLeft < 300
                  ? "bg-red-500/10 text-red-500 animate-pulse"
                  : "bg-muted",
              )}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              {formatTimer(simulatedTimeLeft)}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Trust Score:</span> 100%
            </div>

            <div className="text-sm text-muted-foreground">
              Q{currentIndex + 1}/{totalQuestions}
            </div>

            {/* Fullscreen Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBrowserFullscreen}
              className="text-xs font-medium gap-1 border-border"
              title={isFullscreen ? "Exit Fullscreen (Esc / F11)" : "Enter Browser Fullscreen (F11 level)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-medium"
            >
              Exit Preview
            </Button>
          </div>
        </header>

        {/* Main Interface Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Question & Answer Panel */}
          <main className="flex-1 overflow-y-auto p-6">
            {totalQuestions === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-xl p-8 bg-card">
                <HelpCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold">
                  No Questions in this Test
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Add questions to this test in the "Questions" tab to preview them in the candidate interface.
                </p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  {/* Top Question Row */}
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={isCoding ? "default" : "secondary"}
                        >
                          {isCoding ? (
                            <Code2 className="w-3 h-3 mr-1" />
                          ) : (
                            <FileText className="w-3 h-3 mr-1" />
                          )}
                          {isCoding
                            ? "CODING"
                            : isMultipleCorrect
                            ? "MULTIPLE CORRECT"
                            : isTrueFalse
                            ? "TRUE / FALSE"
                            : isFillBlank
                            ? "FILL IN BLANK"
                            : isAssertionReason
                            ? "ASSERTION & REASON"
                            : "MCQ"}
                        </Badge>
                        <Badge variant="outline">{currentMarks} marks</Badge>
                        {currentQ?.difficulty && (
                          <Badge
                            variant="outline"
                            className={cn(
                              currentQ.difficulty === "EASY" &&
                                "bg-green-500/10 text-green-500 border-green-500/20",
                              currentQ.difficulty === "MEDIUM" &&
                                "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                              currentQ.difficulty === "HARD" &&
                                "bg-red-500/10 text-red-500 border-red-500/20",
                            )}
                          >
                            {currentQ.difficulty}
                          </Badge>
                        )}
                        {answers[currentQ?.id || ""] && (
                          <Badge
                            variant="outline"
                            className="bg-green-500/20 text-green-700 border-green-500/30"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Answered
                          </Badge>
                        )}
                      </div>

                      {/* Question Title & Prompt */}
                      {isAssertionReason ? (
                        <div className="space-y-3 mt-3">
                          <div className="rounded-lg bg-muted/30 p-4 border-l-4 border-primary">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              Assertion (A)
                            </p>
                            <p className="text-base font-medium">
                              {assertion || currentQ?.prompt || "No assertion provided"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-4 border-l-4 border-primary">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              Reason (R)
                            </p>
                            <p className="text-base font-medium">
                              {reason || "No reason provided"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <h2 className="text-lg font-medium mt-3 whitespace-pre-wrap leading-relaxed">
                          {isCoding
                            ? (currentQ as { title?: string })?.title || currentQ?.prompt
                            : currentQ?.prompt || (currentQ as { title?: string })?.title}
                        </h2>
                      )}

                      {/* Coding Problem Description */}
                      {isCoding && currentQ?.prompt && (currentQ as { title?: string })?.title && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {currentQ.prompt}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFlag(currentQ?.id || "")}
                    >
                      <Flag
                        className={cn(
                          "w-4 h-4 mr-2",
                          flagged.has(currentQ?.id || "") &&
                            "fill-yellow-500 text-yellow-500",
                        )}
                      />
                      {flagged.has(currentQ?.id || "")
                        ? "Flagged"
                        : "Flag for review"}
                    </Button>
                  </div>

                  {/* 1. MULTIPLE CORRECT CHECKBOXES */}
                  {isMultipleCorrect && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select one or more options:
                      </div>
                      <div className="space-y-2">
                        {optionsList.map((opt, idx) => {
                          const optId = opt.id || opt.text || `opt-${idx}`;
                          const selectedList = (
                            answers[currentQ?.id || ""] || ""
                          ).split(",");
                          const isSelected = selectedList.includes(optId);

                          return (
                            <Label
                              key={idx}
                              htmlFor={`chk-${idx}`}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border hover:bg-muted/50 hover:border-primary/30",
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                handleToggleMultipleAnswer(
                                  currentQ?.id || "",
                                  optId,
                                );
                              }}
                            >
                              <Checkbox
                                id={`chk-${idx}`}
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleToggleMultipleAnswer(
                                    currentQ?.id || "",
                                    optId,
                                  )
                                }
                              />
                              <span className="font-mono font-bold text-muted-foreground">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              {opt.imageUrl && (
                                <img
                                  src={opt.imageUrl}
                                  alt={opt.text}
                                  className="w-10 h-10 object-cover rounded border"
                                />
                              )}
                              <span className="text-sm flex-1">{opt.text}</span>
                            </Label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. TRUE / FALSE */}
                  {isTrueFalse && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Select True or False:
                      </div>
                      <RadioGroup
                        value={answers[currentQ?.id || ""] || ""}
                        onValueChange={(val) =>
                          handleSelectAnswer(currentQ?.id || "", val)
                        }
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {["True", "False"].map((tfValue) => {
                          const isSelected =
                            (answers[currentQ?.id || ""] || "").toLowerCase() ===
                            tfValue.toLowerCase();

                          return (
                            <Label
                              key={tfValue}
                              htmlFor={`tf-${tfValue}`}
                              className={cn(
                                "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all text-sm font-semibold",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border hover:bg-muted/50 hover:border-primary/30",
                              )}
                            >
                              <RadioGroupItem
                                value={tfValue}
                                id={`tf-${tfValue}`}
                              />
                              <span>{tfValue}</span>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  )}

                  {/* 3. STANDARD MCQ (including single choice, assertion-reason, and fill-in-blanks with options) */}
                  {!isCoding && !isMultipleCorrect && !isTrueFalse && (
                    <div className="space-y-4 pt-2">
                      {optionsList.length > 0 ? (
                        <RadioGroup
                          value={answers[currentQ?.id || ""] || ""}
                          onValueChange={(val) =>
                            handleSelectAnswer(currentQ?.id || "", val)
                          }
                          className="space-y-2 pt-2"
                        >
                          {optionsList.map((opt, idx) => {
                            const optId = opt.id || opt.text || `opt-${idx}`;
                            const isSelected =
                              answers[currentQ?.id || ""] === optId;

                            return (
                              <Label
                                key={idx}
                                htmlFor={`opt-${idx}`}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border hover:bg-muted/50 hover:border-primary/30",
                                )}
                              >
                                <RadioGroupItem
                                  value={optId}
                                  id={`opt-${idx}`}
                                />
                                <span className="font-mono font-bold text-muted-foreground">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                {opt.imageUrl && (
                                  <img
                                    src={opt.imageUrl}
                                    alt={opt.text}
                                    className="w-10 h-10 object-cover rounded border"
                                  />
                                )}
                                <span className="text-sm flex-1">{opt.text}</span>
                              </Label>
                            );
                          })}
                        </RadioGroup>
                      ) : (
                        <div className="max-w-md space-y-2 pt-2">
                          <Input
                            placeholder="Type your answer here..."
                            value={answers[currentQ?.id || ""] || ""}
                            onChange={(e) =>
                              handleSelectAnswer(currentQ?.id || "", e.target.value)
                            }
                            className="h-10 text-sm"
                          />
                        </div>
                      )}
                      {answers[currentQ?.id || ""] && (
                        <div className="flex justify-end items-center gap-1.5 text-xs text-muted-foreground font-medium pt-1">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          <span>Selection auto-saved</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. CODING INTERFACE - Matching TestInterface styling */}
                  {isCoding && (
                    <div className="space-y-4 pt-2">
                      <div className="rounded-lg border overflow-hidden">
                        <div className="flex justify-between items-center border-b px-4 py-2 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Code Editor</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedLanguage}
                              onChange={(e) => setSelectedLanguage(e.target.value)}
                              className="rounded border bg-background px-2.5 py-1 text-xs"
                            >
                              <option value="python">Python 3</option>
                              <option value="javascript">JavaScript (Node.js)</option>
                              <option value="java">Java 17</option>
                              <option value="cpp">C++ (GCC 11)</option>
                            </select>
                          </div>
                        </div>

                        <Textarea
                          rows={11}
                          placeholder="# Write your candidate code solution here..."
                          value={answers[currentQ?.id || ""] || ""}
                          onChange={(e) =>
                            handleSelectAnswer(currentQ?.id || "", e.target.value)
                          }
                          className="font-mono text-xs border-0 rounded-none bg-slate-950 text-emerald-400 focus-visible:ring-0"
                        />

                        <div className="flex gap-2 p-3 border-t bg-muted/30">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRunCodeMock}
                            disabled={isRunningCode}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {isRunningCode ? "Running..." : "Run Code"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (answers[currentQ?.id || ""]) {
                                alert("Solution submitted & saved in candidate test preview.");
                              }
                            }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Submit Solution
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (currentQ?.id) {
                                setAnswers((prev) => {
                                  const next = { ...prev };
                                  delete next[currentQ.id];
                                  return next;
                                });
                              }
                            }}
                            className="text-muted-foreground hover:text-foreground ml-auto"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset Code
                          </Button>
                        </div>

                        {codeOutput && (
                          <div className="border-t bg-card p-3 font-mono text-xs text-green-600 bg-green-500/10 whitespace-pre-wrap">
                            {codeOutput}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </main>

          {/* Right Question Navigation Palette */}
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Question Palette
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any question number to jump
                </p>
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-500" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-100 border border-amber-500" />
                  <span>Flagged</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-indigo-600 border border-indigo-600" />
                  <span>Current</span>
                </div>
              </div>

              {/* Question Buttons Grid */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {questions.map((tq, idx) => {
                  const qId = tq.question?.id || `q-${idx}`;
                  const isCurrent = idx === currentIndex;
                  const isAnswered = !!answers[qId];
                  const isFlagged = flagged.has(qId);

                  let bgClass = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
                  if (isCurrent) {
                    bgClass = "bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20";
                  } else if (isFlagged) {
                    bgClass = "bg-amber-100 border-amber-400 text-amber-900 font-semibold";
                  } else if (isAnswered) {
                    bgClass = "bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "h-10 rounded-lg border flex items-center justify-center font-mono text-xs font-medium transition-all",
                        bgClass,
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Summary */}
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Answered:</span>
                <span className="font-bold text-emerald-700">
                  {Object.keys(answers).length} / {totalQuestions}
                </span>
              </div>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Test
              </Button>
            </div>
          </aside>
        </div>

        {/* Footer Navigation Bar */}
        <footer className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex >= totalQuestions - 1}
              onClick={() =>
                setCurrentIndex((prev) =>
                  Math.min(totalQuestions - 1, prev + 1),
                )
              }
              className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (currentQ?.id) {
                  setAnswers((prev) => {
                    const next = { ...prev };
                    delete next[currentQ.id];
                    return next;
                  });
                }
              }}
              className="text-slate-500 hover:text-slate-800 text-xs gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Response
            </Button>
          </div>
        </footer>

        {/* Submit Confirmation Dialog - matching candidate exam */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Submit Test?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2" asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    You have answered {Object.keys(answers).length} out of{" "}
                    {totalQuestions} questions.
                  </div>
                  {Object.keys(answers).length < totalQuestions && (
                    <div className="text-yellow-600 font-medium">
                      ⚠️ You have {totalQuestions - Object.keys(answers).length} unanswered questions.
                    </div>
                  )}
                  {flagged.size > 0 && (
                    <div className="text-yellow-600">
                      📌 You have {flagged.size} question(s) flagged for review.
                    </div>
                  )}
                  <div className="mt-2">This action cannot be undone.</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back to Test</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowSubmitDialog(false);
                  setIsSubmitted(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Submit Test
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Simulated Assessment Results Screen - exact copy of TestResults.tsx */}
        {isSubmitted && (
          <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 overflow-y-auto animate-in fade-in duration-300">
            {/* Top Close / Return Banner */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSubmitted(false)}
                className="border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-enter Sandbox
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                Exit Preview
              </Button>
            </div>

            <div className="w-full max-w-md relative">
              <Card className="border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl overflow-hidden">
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 w-full" />

                <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
                  {/* Animated checkmark */}
                  <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
                      Assessment Submitted
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Your responses have been successfully recorded and submitted for evaluation.
                    </p>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono py-1">
                    <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-left">
                      <span className="text-slate-400 block text-[10px] uppercase">Answered</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {Object.keys(answers).length} / {totalQuestions}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-left">
                      <span className="text-slate-400 block text-[10px] uppercase">Flagged</span>
                      <span className="text-amber-400 font-bold text-sm">
                        {flagged.size}
                      </span>
                    </div>
                  </div>

                  {/* Info pills */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-300 text-left">
                        All responses are securely stored and cannot be modified.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-xs text-slate-300 text-left">
                        Results will be shared by your administrator once evaluation is complete.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-400 font-mono text-left break-all">
                        Session Mode: <span className="text-slate-300">Live Preview Simulation</span>
                      </span>
                    </div>
                  </div>
                </CardContent>

                <div className="px-8 pb-8 flex justify-center">
                  <div className="w-full text-center p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 font-mono text-xs text-slate-400">
                    You can close this tab now
                  </div>
                </div>
              </Card>

              <p className="text-center text-xs text-slate-500 mt-4 font-mono">
                Candidate assessment lifecycle complete.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
