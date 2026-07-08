import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  SearchIcon,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
  Edit,
  Clock,
  Target,
  FileQuestion,
  Loader2,
  Calendar,
  TrendingUp,
  CheckCircle,
  FileText,
  Archive,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Test } from "@/lib/test-service";
import { useAuth } from "@/lib/auth-context";
import {
  useTestsQuery,
  useCreateTestMutation,
  useDeleteTestMutation,
  useUpdateTestMutation,
} from "@/hooks/use-query-hooks";

export default function AdminTests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: allTests = [], isLoading: loading, refetch } = useTestsQuery();

  const tests = useMemo(() => {
    let list: Test[] = [];
    if (user?.role === "ADMIN" && user.organisationData?.id) {
      const adminOrgId = user.organisationData.id;
      list = allTests.filter((t) => t.organisationId === adminOrgId);
    } else if (user?.role === "SUPERADMIN") {
      list = allTests;
    }
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [allTests, user]);

  const [activeFilter, setActiveFilter] = useState<
    "all" | "published" | "draft" | "archived"
  >("all");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestDuration, setNewTestDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const deleteTestMutation = useDeleteTestMutation();
  const createTestMutation = useCreateTestMutation();
  const updateTestMutation = useUpdateTestMutation();

  const handleCreateTestSubmit = async () => {
    if (!newTestName.trim()) {
      toast({
        title: "Validation Error",
        description: "Test name is required.",
        variant: "destructive",
      });
      return;
    }

    if (newTestDuration <= 0) {
      toast({
        title: "Validation Error",
        description: "Duration must be greater than 0 minutes.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const payload = {
        title: newTestName.trim(),
        durationMins: newTestDuration,
        difficulty: "MEDIUM" as const,
        status: "DRAFT" as const,
        passMark: 40,
        isActive: true,
      };

      const newTest = await createTestMutation.mutateAsync(payload);
      toast({
        title: "Success",
        description: "Test created successfully.",
      });

      setIsCreateDialogOpen(false);
      setNewTestName("");
      setNewTestDuration(60);

      // Route directly to edit page
      navigate(`/admin/tests/edit/${newTest.id}`);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } } & Error;
      console.error("Failed to create test:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create test",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (
    testId: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    successMessage: string,
  ) => {
    try {
      await updateTestMutation.mutateAsync({
        id: testId,
        test: { status },
      });
      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } } & Error;
      console.error("Failed to update test status:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update test status",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (test: Test) => {
    try {
      const testQuestions = test.questions || test.testQuestions || [];
      const questionsPayload = testQuestions.map((q: any) => ({
        questionId: q.questionId,
        orderIndex: q.orderIndex,
        marks: q.marks || 0,
        timeLimitSecs: q.timeLimitSecs || 120,
      }));

      const duplicateTest = {
        title: `${test.title} (Copy)`,
        description: test.description || "",
        durationMins: test.durationMins,
        difficulty: test.difficulty,
        status: "PUBLISHED" as const,
        passMark: test.passMark,
        isActive: true,
        questions: questionsPayload,
        // Proctoring Settings
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

      await createTestMutation.mutateAsync(duplicateTest);
      toast({
        title: "Test Duplicated",
        description: "The test has been duplicated successfully.",
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } } & Error;
      console.error("Failed to duplicate test:", err);
      toast({
        title: "Error",
        description:
          err.response?.data?.message || "Failed to duplicate test",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      try {
        await deleteTestMutation.mutateAsync(id);
        toast({
          title: "Success",
          description: "Test deleted successfully",
        });
      } catch (error) {
        const err = error as { response?: { data?: { message?: string } } } & Error;
        console.error("Failed to delete test:", err);
        toast({
          title: "Error",
          description: err.response?.data?.message || "Failed to delete test",
          variant: "destructive",
        });
      }
    }
  };

  // Apply filters based on search term and status filter
  const getFilteredTests = () => {
    let filtered = tests;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (test) =>
          test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (test.description &&
            test.description.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    // Apply status filter
    if (activeFilter !== "all") {
      filtered = filtered.filter(
        (test) => test.status.toLowerCase() === activeFilter.toLowerCase(),
      );
    }

    return filtered;
  };

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case "all":
        return tests.length;
      case "published":
        return tests.filter((t) => t.status === "PUBLISHED").length;
      case "draft":
        return tests.filter((t) => t.status === "DRAFT").length;
      case "archived":
        return tests.filter((t) => t.status === "ARCHIVED").length;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    return status === "PUBLISHED"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
      : status === "DRAFT"
        ? "bg-amber-500/10 text-amber-600 border-amber-200"
        : "bg-slate-500/10 text-slate-600 border-slate-200";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "Published";
      case "DRAFT":
        return "Draft";
      case "ARCHIVED":
        return "Archived";
      default:
        return status;
    }
  };

  const getProctoringModeBadge = (mode?: string) => {
    switch (mode) {
      case "LOW":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Low</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Medium</Badge>;
      case "HIGH":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200">High</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  const filteredTests = getFilteredTests();

  // Filter tabs configuration
  const filterTabs = [
    { id: "all", label: "All Tests", count: getFilterCount("all") },
    { id: "published", label: "Published", count: getFilterCount("published") },
    { id: "draft", label: "Drafts", count: getFilterCount("draft") },
    { id: "archived", label: "Archived", count: getFilterCount("archived") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Row: Tabs (Left), Search (Center), Actions (Right) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Tab Navigation */}
        <div className="shrink-0">
          <h2 className="text-xl font-semibold text-slate-800">All Tests ({tests.length})</h2>
        </div>

        {/* Center: Search Bar */}
        <div className="relative flex-1 max-w-md w-full md:mx-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <Input
            placeholder="Search tests by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white border-slate-200 focus:border-primary/50 transition-all w-full"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-11 border-slate-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="hero"
            onClick={() => setIsCreateDialogOpen(true)}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 group h-11"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Create New Test
          </Button>
        </div>
      </div>

      {/* Tests Table */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/75 backdrop-blur-sm border-b border-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">
                  Test Info
                </TableHead>

                <TableHead className="font-semibold text-slate-700 text-center">
                  Proctoring
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">
                  Questions
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">
                  Duration
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">
                  Difficulty
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Loading tests...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <FileQuestion className="w-12 h-12 text-muted-foreground/50" />
                      <div>
                        <p className="text-muted-foreground font-medium">
                          No tests found
                        </p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {searchTerm
                            ? "Try a different search term"
                            : "Create your first test to get started"}
                        </p>
                      </div>
                      {!searchTerm && activeFilter === "all" && (
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(true)}
                          className="mt-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Test
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTests.map((test, index) => (
                  <TableRow
                    key={test.id}
                    className="hover:bg-slate-50/80 transition-colors group animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {test.title}
                        </p>
                        {test.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {test.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      {getProctoringModeBadge(test.proctoringMode)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <FileQuestion className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {test.questions?.length ||
                            test.testQuestions?.length ||
                            0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {test.durationMins}m
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize font-medium">
                          {test.difficulty?.toLowerCase() || "medium"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        open={openDropdownId === test.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenDropdownId(test.id);
                          } else {
                            setOpenDropdownId(null);
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-orange-600 hover:bg-orange-50/40 dark:hover:bg-orange-950/10"
                          >
                            {openDropdownId === test.id ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <MoreVertical className="w-4 h-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">

                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/admin/tests/edit/${test.id}`)
                            }
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Test
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/admin/tests/edit/${test.id}?tab=reports`)
                            }
                          >
                            <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
                            View Reports
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(test)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Test
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-primary"
                            onClick={() =>
                              navigate(`/admin/tests/edit/${test.id}`, {
                                state: { activeTab: "settings" },
                              })
                            }
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Test
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-primary"
                            onClick={() =>
                              navigate(`/admin/tests/edit/${test.id}`, {
                                state: { activeTab: "invite" },
                              })
                            }
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Invite Candidates
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(test.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Test
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Test Modal */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>
              Enter the basic details for the new test.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="testName">Test Name</Label>
              <Input
                id="testName"
                placeholder="e.g. React Intermediate Assessment"
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="testDuration">Duration (minutes)</Label>
              <Input
                id="testDuration"
                type="number"
                min="1"
                value={newTestDuration}
                onChange={(e) => setNewTestDuration(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTestSubmit} disabled={creating}>
              {creating ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
