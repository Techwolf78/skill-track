import { useState, useEffect, useCallback } from "react";
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
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
  Edit,
  Clock,
  Target,
  FileQuestion,
  Users,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, Test, TestViewModel } from "@/lib/test-service";

export default function AdminTests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await testService.getAllTests();
      setTests(data);
    } catch (error: any) {
      console.error("Failed to fetch tests:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const filteredTests = tests.filter(
    (test) =>
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (testId: string) => {
    try {
      await testService.deleteTest(testId);
      toast({
        title: "Test Deleted",
        description: "The test has been deleted successfully.",
      });
      fetchTests(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to delete test:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete test",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (test: Test) => {
    try {
      // Create a duplicate test with "Copy" suffix
      const duplicateTest = {
        title: `${test.title} (Copy)`,
        description: test.description,
        durationMins: test.durationMins,
        difficulty: test.difficulty,
        status: "DRAFT" as const,
        passMark: test.passMark,
        isActive: false,
      };
      
      const newTest = await testService.createTest(duplicateTest);
      toast({
        title: "Test Duplicated",
        description: "The test has been duplicated successfully.",
      });
      
      // Navigate to edit the new test
      navigate(`/admin/tests/edit/${newTest.id}`);
    } catch (error: any) {
      console.error("Failed to duplicate test:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to duplicate test",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === "PUBLISHED" 
      ? "bg-green-500/10 text-green-500" 
      : status === "DRAFT" 
        ? "bg-yellow-500/10 text-yellow-500"
        : "bg-gray-500/10 text-gray-500";
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

  // Calculate total submissions (if you have this data from backend)
  const totalSubmissions = tests.reduce((sum, test) => {
    // If you have submissions count in your test object
    // return sum + (test.submissions || 0);
    return sum; // Placeholder until you have submissions data
  }, 0);

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Tests</h1>
          <p className="text-muted-foreground mt-1">
            Manage tests for your organization
          </p>
        </div>
        <Button
          variant="hero"
          onClick={() => navigate("/admin/tests/create")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tests Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Test Title</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Questions</TableHead>
              <TableHead className="font-semibold text-center">Duration</TableHead>
              <TableHead className="font-semibold text-center">Difficulty</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No tests found
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map((test) => (
                <TableRow key={test.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{test.title}</p>
                      {test.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {test.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(test.status)}>
                      {getStatusBadge(test.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileQuestion className="w-4 h-4 text-muted-foreground" />
                      {test.questions?.length || test.testQuestions?.length || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {test.durationMins}m
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      {test.difficulty}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/tests/${test.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/tests/edit/${test.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Test
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(test)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate Test
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold">{tests.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileQuestion className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Published</p>
              <p className="text-2xl font-bold">
                {tests.filter((t) => t.status === "PUBLISHED").length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Badge className="w-5 h-5 text-green-500">✓</Badge>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Draft</p>
              <p className="text-2xl font-bold">
                {tests.filter((t) => t.status === "DRAFT").length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Edit className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}