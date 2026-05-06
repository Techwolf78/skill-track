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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, Test } from "@/lib/test-service";
import { useAuth } from "@/lib/auth-context";

export default function AdminTests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "published" | "draft" | "archived" | "inactive"
  >("all");

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);

      const allTests = await testService.getAllTests();

      if (user?.role === "ADMIN" && user.organisationData?.id) {
        const adminOrgId = user.organisationData.id;
        const filtered = allTests.filter(
          (t) => t.organisationId === adminOrgId,
        );
        setTests(filtered);
      } else if (user?.role === "SUPERADMIN") {
        setTests(allTests);
      } else {
        setTests([]);
      }
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
  }, [toast, user]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

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
      if (activeFilter === "inactive") {
        filtered = filtered.filter((test) => test.isActive === false);
      } else {
        filtered = filtered.filter(
          (test) => test.status.toLowerCase() === activeFilter.toLowerCase(),
        );
      }
    }

    return filtered;
  };

  const filteredTests = getFilteredTests();

  // Get counts for each filter
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
      case "inactive":
        return tests.filter((t) => t.isActive === false).length;
      default:
        return 0;
    }
  };

  const handleDelete = async (testId: string) => {
    try {
      await testService.deleteTest(testId);
      toast({
        title: "Test Deleted",
        description: "The test has been deleted successfully.",
      });
      fetchTests();
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
      const duplicateTest = {
        title: `${test.title} (Copy)`,
        description: test.description,
        durationMins: test.durationMins,
        difficulty: test.difficulty,
        status: "DRAFT" as const,
        passMark: test.passMark,
        isActive: true,
      };

      const newTest = await testService.createTest(duplicateTest);
      toast({
        title: "Test Duplicated",
        description: "The test has been duplicated successfully.",
      });

      navigate(`/admin/tests/edit/${newTest.id}`);
    } catch (error: any) {
      console.error("Failed to duplicate test:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to duplicate test",
        variant: "destructive",
      });
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

  // Calculate stats
  const totalTests = tests.length;
  const publishedTests = tests.filter((t) => t.status === "PUBLISHED").length;
  const draftTests = tests.filter((t) => t.status === "DRAFT").length;
  const archivedTests = tests.filter((t) => t.status === "ARCHIVED").length;
  const inactiveTests = tests.filter((t) => t.isActive === false).length;
  const publishedPercentage =
    totalTests > 0 ? (publishedTests / totalTests) * 100 : 0;

  // Stats cards data
  const statsCards = [
    {
      title: "Total Tests",
      value: totalTests,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/5",
      borderColor: "border-blue-200",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Published",
      value: publishedTests,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/5",
      borderColor: "border-emerald-200",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      suffix:
        publishedPercentage > 0 ? `(${Math.round(publishedPercentage)}%)` : "",
    },
    {
      title: "Drafts",
      value: draftTests,
      icon: Edit,
      gradient: "from-amber-500 to-amber-600",
      bgGradient: "from-amber-500/10 to-amber-600/5",
      borderColor: "border-amber-200",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      title: "Inactive",
      value: inactiveTests,
      icon: Archive,
      gradient: "from-slate-500 to-slate-600",
      bgGradient: "from-slate-500/10 to-slate-600/5",
      borderColor: "border-slate-200",
      iconBg: "bg-slate-500/10",
      iconColor: "text-slate-600",
    },
  ];

  // Filter tabs configuration
  const filterTabs = [
    { id: "all", label: "All Tests", count: getFilterCount("all") },
    { id: "published", label: "Published", count: getFilterCount("published") },
    { id: "draft", label: "Drafts", count: getFilterCount("draft") },
    { id: "archived", label: "Archived", count: getFilterCount("archived") },
    { id: "inactive", label: "Inactive", count: getFilterCount("inactive") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-heading font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Test Library
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Create, manage, and organize your assessments
            </p>
          </div>
          <Button
            variant="hero"
            onClick={() => navigate("/admin/tests/create")}
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 group"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Create New Test
          </Button>
        </div>

        {/* Stats Cards Grid */}
        {/* Stats Cards Grid - Reduced Size */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statsCards.map((stat, index) => (
            <Card
              key={stat.title}
              className={`relative overflow-hidden border ${stat.borderColor} hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`}
              />
              <CardContent className="p-3 relative">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      {stat.suffix && (
                        <span className="text-xs font-medium text-emerald-600">
                          {stat.suffix}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`p-1.5 rounded-lg ${stat.iconBg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search Bar */}
          {/* Search Bar */}
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
            <Input
              placeholder="Search tests by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-200 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Filter Tabs - Tabs Component from shadcn */}
          <Tabs
            value={activeFilter}
            onValueChange={(v) => setActiveFilter(v as any)}
            className="w-full lg:w-auto"
          >
            <TabsList className="bg-white/50 backdrop-blur-sm border border-slate-200 p-1 h-auto w-full lg:w-auto">
              {filterTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 md:px-4 py-2 text-sm"
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Tests Table */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-white border-b-2">
                  <TableHead className="font-semibold text-slate-700">
                    Test Title
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    Status
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
                  <TableHead className="font-semibold text-slate-700 text-center">
                    Active
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
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
                    <TableCell colSpan={7} className="text-center py-16">
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
                            onClick={() => navigate("/admin/tests/create")}
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
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(test.status)} border`}
                        >
                          {getStatusBadge(test.status)}
                        </Badge>
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
                      <TableCell className="text-center">
                        <Badge
                          className={
                            test.isActive
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-slate-500/10 text-slate-600"
                          }
                        >
                          {test.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-orange-600 hover:bg-orange-50/40 dark:hover:bg-orange-950/10"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/tests/${test.id}`)
                              }
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/tests/edit/${test.id}`)
                              }
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
                              className="text-primary"
                              onClick={() =>
                                navigate("/admin/schedules", {
                                  state: { testId: test.id },
                                })
                              }
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Schedule Test
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
      </div>
    </div>
  );
}
