import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Plus,
  Search,
  MoreVertical,
  Play,
  Eye,
  Copy,
  Trash2,
  Loader2,
  Edit,
  Archive,
  RefreshCw,
  Clock,
  Target,
  FileQuestion,
  Users,
} from "lucide-react";
import { testService, TestViewModel } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

export default function Tests() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [tests, setTests] = useState<TestViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestViewModel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both active and inactive tests from backend
      const [activeData, inactiveData] = await Promise.all([
        testService.getAllTests(),
        testService.getInactiveTests()
      ]);

      const activeViewModels = activeData.map((t) => testService.toViewModel(t));
      const inactiveViewModels = inactiveData.map((t) => testService.toViewModel(t));

      setTests([...activeViewModels, ...inactiveViewModels]);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load tests. Please try again.";
      console.error("Failed to fetch tests:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUserId(user.id || "");
    fetchTests();
  }, [fetchTests]);

  const handleDeleteClick = (test: TestViewModel) => {
    setSelectedTest(test);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTest) return;

    setDeleting(true);
    try {
      await testService.deleteTest(selectedTest.id);
      toast({
        title: "Success",
        description: `"${selectedTest.name}" has been deactivated successfully.`,
      });
      await fetchTests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete test. Please try again.";
      console.error("Failed to delete test:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedTest(null);
    }
  };

  const handleDuplicate = async (test: TestViewModel) => {
    try {
      if (!currentUserId) {
        toast({
          title: "Error",
          description: "User not authenticated. Please log in.",
          variant: "destructive",
        });
        return;
      }

      const createRequest: CreateTestRequest = {
        title: `${test.name} (Copy)`,
        description: test.description,
        durationMins: test.duration,
        difficulty: test.difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD",
        instructions: {},
        status: "DRAFT" as const,
        passMark: test.passMark,
        isActive: true, // New tests should be active
      };

      await testService.createTest(createRequest);
      toast({
        title: "Success",
        description: `"${test.name}" has been duplicated successfully.`,
      });
      await fetchTests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to duplicate test. Please try again.";
      console.error("Failed to duplicate test:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePublish = async (test: TestViewModel) => {
    try {
      await testService.updateTest(test.id, {
        status: "PUBLISHED",
      });
      toast({
        title: "Test Published",
        description: `"${test.name}" has been published successfully.`,
      });
      await fetchTests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to publish test. Please try again.";
      console.error("Failed to publish test:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (test: TestViewModel) => {
    try {
      await testService.updateTest(test.id, {
        status: "ARCHIVED",
      });
      toast({
        title: "Test Archived",
        description: `"${test.name}" has been archived successfully.`,
      });
      await fetchTests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to archive test. Please try again.";
      console.error("Failed to archive test:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMoveToDraft = async (test: TestViewModel) => {
    try {
      await testService.updateTest(test.id, {
        status: "DRAFT",
      });
      toast({
        title: "Test Moved to Draft",
        description: `"${test.name}" has been moved to drafts.`,
      });
      await fetchTests();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update test status.";
      console.error("Failed to move test to draft:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (test: TestViewModel) => {
    navigate(`/superadmin/tests/${test.id}`);
  };

  const handleEdit = (test: TestViewModel) => {
    navigate(`/superadmin/tests/edit/${test.id}`);
  };

  const formatStatus = (status: string): string => {
    if (!status) return "";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const filteredTests = tests.filter((test) =>
    test.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getFilteredTests = (statusFilter: string) => {
    // Search filter already applied in filteredTests
    if (statusFilter === "all") return filteredTests.filter(t => t.isActive !== false);
    if (statusFilter === "inactive") return filteredTests.filter(t => t.isActive === false);
    
    // Status filters for active tests
    return filteredTests.filter(
      (test) => {
        const testStatus = test.status.toLowerCase();
        const targetStatus = statusFilter.toLowerCase();
        return testStatus === targetStatus && test.isActive !== false;
      }
    );
  };

  const getStatusCount = (statusFilter: string) => {
    if (statusFilter === "all") return tests.filter(t => t.isActive !== false).length;
    if (statusFilter === "inactive") return tests.filter(t => t.isActive === false).length;
    
    return tests.filter(
      (test) => {
        const testStatus = test.status.toLowerCase();
        const targetStatus = statusFilter.toLowerCase();
        return testStatus === targetStatus && test.isActive !== false;
      }
    ).length;
  };

  const renderTestsTable = (statusFilter: string) => {
    const filtered = getFilteredTests(statusFilter);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No tests found.</p>
          <p className="text-sm mt-2">
            {searchTerm
              ? "Try a different search term."
              : "Create your first test to get started."}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <Link to="/superadmin/tests/create" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Pass Mark</TableHead>
              <TableHead>Total Marks</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((test) => (
              <TableRow key={test.id} className="group">
                <TableCell className="font-medium">
                  <div>
                    <div>{test.name}</div>
                    {test.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {test.description.length > 50
                          ? test.description.substring(0, 50) + "..."
                          : test.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={testService.getTypeStyle(test.type)}>
                    {test.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={testService.getStatusStyle(test.status)}
                  >
                    {formatStatus(test.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={testService.getDifficultyStyle(test.difficulty)}
                  >
                    {test.difficulty.charAt(0).toUpperCase() +
                      test.difficulty.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{test.duration} min</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <FileQuestion className="w-3 h-3 text-muted-foreground" />
                    <span>{test.questions}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-muted-foreground" />
                    <span>{test.passMark}%</span>
                  </div>
                </TableCell>
                <TableCell>{test.totalMarks}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span>{test.participants || 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(test)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(test)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      {test.status === "draft" && (
                        <>
                          <DropdownMenuItem onClick={() => handlePublish(test)}>
                            <Play className="w-4 h-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(test)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        </>
                      )}

                      {test.status === "published" && (
                        <>
                          <DropdownMenuItem onClick={() => handleArchive(test)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMoveToDraft(test)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Move to Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(test)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        </>
                      )}

                      {test.status === "archived" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleMoveToDraft(test)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Restore to Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(test)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuSeparator />
                      {test.isActive === false ? (
                        <DropdownMenuItem
                          className="text-primary"
                          onClick={async () => {
                            try {
                              await testService.activateTest(test.id);
                              toast({ title: "Success", description: "Test reactivated" });
                              fetchTests();
                            } catch (e) {
                              toast({ title: "Error", description: "Failed to reactivate", variant: "destructive" });
                            }
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(test)}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Tests</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track assessments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTests}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link to="/superadmin/tests/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tests by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">
            All Tests ({getStatusCount("all")})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published ({getStatusCount("published")})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({getStatusCount("draft")})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({getStatusCount("archived")})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({getStatusCount("inactive")})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderTestsTable("all")}
        </TabsContent>
        <TabsContent value="published" className="mt-6">
          {renderTestsTable("published")}
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          {renderTestsTable("draft")}
        </TabsContent>
        <TabsContent value="archived" className="mt-6">
          {renderTestsTable("archived")}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {renderTestsTable("inactive")}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the test "{selectedTest?.name}". It will no longer be visible to candidates but will remain in the records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
