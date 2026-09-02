import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  Users,
  User,
  UserPlus,
  BarChart2,
  MoreVertical,
  Check,
  PlusCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Edit,
  Copy,
  Trash2,
  Layers,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTestsQuery, useCreateTestMutation, useDeleteTestMutation } from "@/hooks/use-query-hooks";
import { auditLogService, AuditLog } from "@/lib/audit-log-service";
import { stripHtml } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function NewAdminHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Create Test Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDuration, setNewTestDuration] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  // 1. Fetch Real Tests from Backend
  const { data: tests = [], isLoading: isLoadingTests } = useTestsQuery();
  const createTestMutation = useCreateTestMutation();
  const deleteTestMutation = useDeleteTestMutation();

  const handleDuplicate = async (test: any) => {
    try {
      const questionsPayload = (test.testQuestions || test.questions || []).map(
        (q: any, index: number) => ({
          questionId: q.questionId || q.question?.id || q.id,
          sectionName: q.sectionName || "General",
          orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
          marks: q.marks || 0,
          timeLimitSecs: q.timeLimitSecs || 120,
        })
      );

      const duplicateTest = {
        title: `${test.title} (Copy)`,
        description: test.description || "",
        durationMins: test.durationMins,
        difficulty: test.difficulty || "MEDIUM",
        status: "DRAFT" as const,
        passMark: test.passMark || 40,
        isActive: true,
        questions: questionsPayload,
        proctoringMode: test.proctoringMode,
        enableTabSwitchTracking: test.enableTabSwitchTracking,
        blockCopyPaste: test.blockCopyPaste,
        blockRightClick: test.blockRightClick,
        warnOnFullscreenExit: test.warnOnFullscreenExit,
        maxWarnings: test.maxWarnings,
        requireWebcam: test.requireWebcam,
        detectFaceNotVisible: test.detectFaceNotVisible,
        detectMultipleFaces: test.detectMultipleFaces,
        detectSuspiciousAudio: test.detectSuspiciousAudio,
        detectObjects: test.detectObjects,
        periodicSnapshots: test.periodicSnapshots,
        evidenceCapture: test.evidenceCapture,
        requireMicrophone: test.requireMicrophone,
        requireScreenShare: test.requireScreenShare,
        detectDevTools: test.detectDevTools,
        detectScreenShareStop: test.detectScreenShareStop,
        enableLiveProctoring: test.enableLiveProctoring,
        autoSubmitOnCriticalViolations: test.autoSubmitOnCriticalViolations,
        maxCriticalViolations: test.maxCriticalViolations,
      };

      const created = await createTestMutation.mutateAsync(duplicateTest);
      toast.success("Test duplicated successfully!");
      if (created?.id) {
        navigate(`/admin/tests/edit/${created.id}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to duplicate test");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      try {
        await deleteTestMutation.mutateAsync(id);
        toast.success("Test deleted successfully");
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || "Failed to delete test");
      }
    }
  };

  const handleCreateTestSubmit = async () => {
    if (!newTestName.trim()) {
      toast.error("Please enter a test name");
      return;
    }
    try {
      setIsCreating(true);
      const payload = {
        title: newTestName.trim(),
        durationMins: Number(newTestDuration) || 60,
        difficulty: "MEDIUM" as const,
        status: "DRAFT" as const,
        passMark: 40,
        isActive: true,
      };
      const newTest = await createTestMutation.mutateAsync(payload);
      toast.success("Test created successfully");
      setIsCreateDialogOpen(false);
      setNewTestName("");
      setNewTestDuration(60);
      navigate(`/admin/tests/edit/${newTest.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to create test");
    } finally {
      setIsCreating(false);
    }
  };

  // Top recent tests sorted by creation date descending
  const recentTests = useMemo(() => {
    return [...tests]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [tests]);

  // 2. Fetch Real Activity Feed (Audit Logs) from Backend
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const response = await auditLogService.getAuditLogs({ size: 50 });
      const rawContent = response.content || [];

      // Filter out raw submission/calculation events, keep admin operational activities
      const adminLogs = rawContent
        .filter((log) => {
          const details = (log.details || "").toLowerCase();
          const action = (log.action || "").toLowerCase();
          if (
            details.includes("testsession") ||
            details.includes("submission") ||
            details.includes("testresult") ||
            action === "submit" ||
            action === "calculate"
          ) {
            return false;
          }
          return true;
        })
        .slice(0, 10);

      setLogs(adminLogs);
    } catch (err: unknown) {
      console.warn("Could not fetch real audit logs:", err);
      setLogsError("Unable to load activity feed");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Format Duration string
  const formatDuration = (mins?: number) => {
    if (!mins || mins <= 0) return "3 hours";
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0 && remainingMins > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMins} minutes`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${mins} minutes`;
  };

  return (
    <div className="space-y-6 pb-20 font-sans antialiased text-slate-800">
      {/* ── 1. RECENT TESTS SECTION ── */}
      <div className="bg-white border border-slate-200/90 shadow-xs">
        {/* Header Bar */}
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
            Recent tests
          </h2>
          <button
            onClick={() => navigate("/admin/tests")}
            className="text-xs font-bold text-[#4353a4] hover:text-[#334182] uppercase tracking-wider transition-colors cursor-pointer"
          >
            All tests
          </button>
        </div>

        {/* Tests List Content */}
        {isLoadingTests ? (
          <div className="py-16 flex justify-center items-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#4353a4]" />
            <span>Loading recent tests...</span>
          </div>
        ) : recentTests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-3">
            <p>No tests found in this organisation.</p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4353a4] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#334182] transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Test</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recentTests.map((test) => {
              const questionCount =
                test.questions?.length ||
                test.testQuestions?.length ||
                (test as any).questionCount ||
                100;

              const sectionCount =
                (test as any).sections?.length ||
                (test as any).sectionCount ||
                1;

              const candidateCount =
                (test as any).candidateCount ??
                test.testSchedules?.length ??
                (test as any).totalCandidates ??
                0;

              const orgName =
                test.organisation?.name ||
                user?.organisationData?.name ||
                "GryphonAcademy";

              return (
                <div
                  key={test.id}
                  className="px-8 py-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Left Side: Test Info & Metadata */}
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Title + Green Check Badge */}
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => navigate(`/admin/tests/edit/${test.id}`)}
                        className="font-bold text-slate-900 text-base hover:text-[#4353a4] transition-colors truncate cursor-pointer tracking-tight"
                      >
                        {test.title}
                      </h3>
                      <span
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#10B981] text-white shrink-0 shadow-xs"
                        title="Active & Published"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 font-normal">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {questionCount} {questionCount === 1 ? "problem" : "problems"} in {sectionCount} {sectionCount === 1 ? "section" : "sections"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDuration(test.durationMins)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {candidateCount} {candidateCount === 1 ? "candidate" : "candidates"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          <span className="truncate">{orgName}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Actions */}
                  <div className="flex items-center gap-1 shrink-0 text-slate-500">
                    <button
                      title="Invite Candidates"
                      onClick={() => navigate(`/admin/tests/edit/${test.id}?tab=candidates`)}
                      className="p-2 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      title="View Reports / Analytics"
                      onClick={() => navigate(`/admin/tests/edit/${test.id}?tab=candidates`)}
                      className="p-2 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          title="More Options"
                          className="p-2 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-xl p-1 text-xs">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/tests/edit/${test.id}`)}
                          className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Test</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(test)}
                          className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Duplicate Test</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        <DropdownMenuItem
                          onClick={() => handleDelete(test.id)}
                          className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Delete Test</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. ACTIVITY FEED SECTION ── */}
      <div className="bg-white border border-slate-200/90 shadow-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Activity feed
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live operational audit log of administrative activities and events.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="h-8 px-3 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${
                isLoadingLogs ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Feed List */}
        <div className="divide-y divide-slate-200">
          {isLoadingLogs ? (
            <div className="py-14 flex justify-center items-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-[#4353a4]" />
              <span>Loading activities...</span>
            </div>
          ) : logsError || logs.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-sm">
              No recent admin activity recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <ActivityFeedItem key={log.id} log={log} />
            ))
          )}
        </div>
      </div>

      {/* ── 3. Create Test Modal (Flat Square DoSelect / New-Admin Theme) ── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-none border border-slate-300 bg-white p-6 shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Create New Test
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter the basic details for your assessment to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="homeNewTestName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Test Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="homeNewTestName"
                placeholder="e.g. Fullstack Developer Assessment"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                className="rounded-none border-slate-300 focus-visible:ring-1 focus-visible:ring-[#4353a4] text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="homeNewTestDuration" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Duration (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="homeNewTestDuration"
                type="number"
                min="1"
                value={newTestDuration}
                onChange={(e) => setNewTestDuration(parseInt(e.target.value) || 0)}
                className="rounded-none border-slate-300 focus-visible:ring-1 focus-visible:ring-[#4353a4] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-none border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTestSubmit}
              disabled={isCreating}
              className="rounded-none bg-[#4353a4] hover:bg-[#344285] text-white text-xs font-bold uppercase tracking-wider px-5"
            >
              {isCreating ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Real Activity Feed Item Component
 */
function ActivityFeedItem({ log }: { log: AuditLog }) {
  const actorName = "You";

  let timeAgo = "recently";
  try {
    if (log.timestamp) {
      timeAgo = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });
    }
  } catch (e) {}

  const { prefix, highlighted, textAfter, entityName } = parseDoSelectSentence(
    log,
    actorName
  );

  return (
    <div className="px-6 py-4 flex items-start gap-3.5 hover:bg-slate-50/60 transition-colors">
      <Avatar className="w-8 h-8 mt-0.5 border border-amber-300 bg-amber-500 text-white font-bold text-xs shrink-0 rounded-none">
        <AvatarFallback className="bg-amber-500 text-white font-semibold rounded-none">
          Y
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 text-sm text-slate-600 leading-snug">
        <p>
          <span className="text-slate-800">{prefix} </span>
          {highlighted && (
            <span className="font-semibold text-slate-900">{highlighted} </span>
          )}
          {textAfter && <span className="text-slate-800">{textAfter} </span>}
          {entityName && (
            <span className="font-bold text-slate-900">{entityName}</span>
          )}
          .
        </p>
        <span className="text-xs text-slate-400 block mt-1">{timeAgo}</span>
      </div>
    </div>
  );
}

/**
 * Natural language parser for Backend Audit Logs
 */
function parseDoSelectSentence(log: AuditLog, actorName: string = "You") {
  const action = (log.action || "").toUpperCase();
  const details = stripHtml(log.details || "");

  let afterObj: Record<string, any> = {};
  if (log.afterSnapshot) {
    try {
      afterObj = JSON.parse(log.afterSnapshot);
    } catch (e) {}
  }

  let beforeObj: Record<string, any> = {};
  if (log.beforeSnapshot) {
    try {
      beforeObj = JSON.parse(log.beforeSnapshot);
    } catch (e) {}
  }

  // 1. Candidate Invitations
  if (
    details.toLowerCase().includes("invited") ||
    details.toLowerCase().includes("candidate")
  ) {
    const emailMatches =
      details.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const testTitle =
      stripHtml(afterObj.testTitle || afterObj.title || beforeObj.testTitle || extractTestTitleFromDetails(details) || "the test");

    if (emailMatches.length > 0) {
      const primaryEmail = emailMatches[0];
      const restCount = emailMatches.length - 1;
      const extraText = restCount > 0 ? `and ${restCount} others ` : "";

      return {
        prefix: `${actorName} invited`,
        highlighted: `${primaryEmail} ${extraText}`,
        textAfter: "to take the test",
        entityName: testTitle,
      };
    }
  }

  // 2. Question / Problem updates to Test
  if (
    details.toLowerCase().includes("added") &&
    details.toLowerCase().includes("problem")
  ) {
    const numMatch = details.match(/\d+/);
    const count = numMatch ? numMatch[0] : "1";
    const testTitle = stripHtml(afterObj.testTitle || afterObj.title || "the test");
    return {
      prefix: `${actorName} added`,
      highlighted: `${count} problems`,
      textAfter: "to the test",
      entityName: testTitle,
    };
  }

  if (
    action === "DELETE" &&
    (details.toLowerCase().includes("problem") ||
      details.toLowerCase().includes("question"))
  ) {
    const questionName =
      stripHtml(afterObj.title ||
      beforeObj.title ||
      afterObj.name ||
      beforeObj.name ||
      extractQuestionFromDetails(details) ||
      "the problem");
    const testTitle = stripHtml(afterObj.testTitle || beforeObj.testTitle || "the test");
    return {
      prefix: `${actorName} removed the problem`,
      highlighted: questionName,
      textAfter: "from the test",
      entityName: testTitle,
    };
  }

  // 3. Test Duration / Configuration Updates
  if (
    action === "UPDATE" &&
    (details.toLowerCase().includes("duration") || afterObj.durationMinutes)
  ) {
    const testTitle = stripHtml(afterObj.title || beforeObj.title || "the test");
    const duration =
      afterObj.durationMinutes || afterObj.timeLimit || "updated";
    return {
      prefix: `${actorName} updated the duration of the test`,
      highlighted: testTitle,
      textAfter: `to ${duration} minutes`,
      entityName: "",
    };
  }

  // 4. Question Creation & Update
  if (
    action === "CREATE" &&
    (details.toLowerCase().includes("question") ||
      log.afterSnapshot?.includes("prompt"))
  ) {
    const qTitle =
      stripHtml(afterObj.title || afterObj.prompt?.slice(0, 60) || extractQuestionFromDetails(details) || "New Question");
    return {
      prefix: `${actorName} created the question`,
      highlighted: qTitle,
      textAfter: "",
      entityName: "",
    };
  }

  if (
    action === "UPDATE" &&
    (details.toLowerCase().includes("question") ||
      log.afterSnapshot?.includes("prompt"))
  ) {
    const qTitle =
      stripHtml(afterObj.title || afterObj.prompt?.slice(0, 60) || beforeObj.title || beforeObj.prompt?.slice(0, 60) || extractQuestionFromDetails(details) || "the question");
    return {
      prefix: `${actorName} updated the question`,
      highlighted: qTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 5. User / Admin creation
  if (
    action === "CREATE" &&
    (details.toLowerCase().includes("user") ||
      details.toLowerCase().includes("admin"))
  ) {
    const userName = stripHtml(afterObj.name || afterObj.email || "a new user");
    return {
      prefix: `${actorName} created user account`,
      highlighted: userName,
      textAfter: "",
      entityName: "",
    };
  }

  // 6. Test Creation
  if (action === "CREATE" && details.toLowerCase().includes("test")) {
    const tTitle = stripHtml(afterObj.title || afterObj.name || "a new test");
    return {
      prefix: `${actorName} created the test`,
      highlighted: tTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 7. Test Activation / Deactivation
  if (
    action.includes("DEACTIVATE") ||
    details.toLowerCase().includes("deactivate")
  ) {
    const testTitle =
      stripHtml(afterObj.title || beforeObj.title || extractTestTitleFromDetails(details));
    return {
      prefix: `${actorName} deactivated the test`,
      highlighted: testTitle,
      textAfter: "",
      entityName: "",
    };
  }

  if (
    action.includes("ACTIVATE") ||
    details.toLowerCase().includes("activate")
  ) {
    const testTitle =
      stripHtml(afterObj.title || beforeObj.title || extractTestTitleFromDetails(details));
    return {
      prefix: `${actorName} activated the test`,
      highlighted: testTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 8. General fallback
  const rawAction = action.toLowerCase();
  let actionFormatted = "performed action on";
  if (rawAction === "patch" || rawAction === "update" || rawAction === "put") {
    actionFormatted = "updated";
  } else if (rawAction === "create" || rawAction === "post") {
    actionFormatted = "created";
  } else if (rawAction === "delete") {
    actionFormatted = "deleted";
  } else if (rawAction === "get") {
    actionFormatted = "viewed";
  } else if (rawAction) {
    actionFormatted = rawAction.endsWith("e") ? `${rawAction}d` : `${rawAction}ed`;
  }

  let cleanDetails = details
    .replace(/^(Performed|Executed)\s+/i, "")
    .replace(/\(ID:[^)]+\)/gi, "")
    .replace(/^(update|patch)\s+question\s+on\s+question/i, "question")
    .replace(/^(create|post)\s+question\s+on\s+question/i, "question")
    .replace(/^on\s+question/i, "question")
    .replace(/^patch\s+/i, "updated ")
    .trim();

  if (cleanDetails.toLowerCase().startsWith(actionFormatted)) {
    cleanDetails = cleanDetails.slice(actionFormatted.length).trim();
  } else if (cleanDetails.toLowerCase().startsWith(rawAction)) {
    cleanDetails = cleanDetails.slice(rawAction.length).trim();
  }

  return {
    prefix: `${actorName} ${actionFormatted} ${cleanDetails}`,
    highlighted: "",
    textAfter: "",
    entityName: "",
  };
}

function extractQuestionFromDetails(details: string): string {
  const match = details.match(/Question\s+["']?([^"']+)["']?/i);
  if (match && match[1]) {
    return stripHtml(match[1]).trim();
  }
  return "";
}

function extractTestTitleFromDetails(details: string): string {
  const match = details.match(/Test\s+["']?([^"']+)["']?/i);
  if (match && match[1]) {
    return stripHtml(match[1]).trim();
  }
  return "the test";
}

