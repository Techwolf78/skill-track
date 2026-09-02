import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  Users,
  User,
  UserPlus,
  BarChart2,
  MoreVertical,
  Search,
  PlusCircle,
  Check,
  ExternalLink,
  Edit,
  Loader2,
  Layers,
  Copy,
  Trash2,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTestsQuery, useCreateTestMutation, useDeleteTestMutation } from "@/hooks/use-query-hooks";
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
import { toast } from "sonner";

export default function NewAdminTests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Create Test Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDuration, setNewTestDuration] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  const { data: tests = [], isLoading } = useTestsQuery();
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

  const filteredTests = useMemo(() => {
    return tests.filter((t) =>
      (t.title || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [tests, search]);

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
    <div className="pb-20 bg-white border border-slate-200/90 shadow-xs font-sans antialiased text-slate-800">
      {/* ── 1. Top Search & Create Bar ── */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search for a test..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
          />
        </div>

        {/* Create New Test Button */}
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#4353a4] hover:text-[#334182] uppercase tracking-wider transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 fill-[#4353a4] text-white" />
          <span>CREATE NEW TEST</span>
        </button>
      </div>

      {/* ── 2. Test List ── */}
      <div>
        {isLoading ? (
          <div className="py-20 flex flex-col justify-center items-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#4353a4]" />
            <span>Loading tests...</span>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm space-y-3">
            <p>No tests found.</p>
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
            {filteredTests.map((test) => {
              const testQuestionsList = test.questions || test.testQuestions || [];
              const questionCount = testQuestionsList.length || (test as any).questionCount || 0;

              // Calculate unique distinct sections from questions list
              const uniqueSections = new Set(
                testQuestionsList
                  .map((q: any) => q.sectionName?.trim())
                  .filter((s: any) => Boolean(s))
              );
              const sectionCount = uniqueSections.size > 0 ? uniqueSections.size : 1;

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
                  className="px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Left Side: Title & Metadata */}
                  <div className="space-y-1.5 min-w-0 flex-1">
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

                    {/* Metadata Row with Icons */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 font-normal">
                      {/* Problems in section */}
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {questionCount} {questionCount === 1 ? "problem" : "problems"} in {sectionCount} {sectionCount === 1 ? "section" : "sections"}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDuration(test.durationMins)}</span>
                      </div>

                      {/* Candidates */}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {candidateCount} {candidateCount === 1 ? "candidate" : "candidates"}
                        </span>
                      </div>

                      {/* Organisation */}
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{orgName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Quick Action Icons */}
                  <div className="flex items-center gap-1 shrink-0 text-slate-500">
                    {/* Invite Candidates */}
                    <button
                      title="Invite Candidates"
                      onClick={() => navigate(`/admin/tests/edit/${test.id}?tab=candidates`)}
                      className="p-2 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>

                    {/* Reports / Analytics */}
                    <button
                      title="View Reports / Analytics"
                      onClick={() => navigate(`/admin/tests/edit/${test.id}?tab=candidates`)}
                      className="p-2 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>

                    {/* 3-Dots Dropdown Menu */}
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
              <Label htmlFor="newTestName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Test Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="newTestName"
                placeholder="e.g. Fullstack Developer Assessment"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                className="rounded-none border-slate-300 focus-visible:ring-1 focus-visible:ring-[#4353a4] text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newTestDuration" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Duration (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="newTestDuration"
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
