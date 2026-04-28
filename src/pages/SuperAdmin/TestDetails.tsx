import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ArrowLeft,
  Edit,
  Play,
  Archive,
  Copy,
  Trash2,
  Clock,
  Target,
  FileQuestion,
  Users,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  Code,
  FileText,
} from "lucide-react";
import { testService, Test, Question } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

export default function TestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<
    (Question & { marks: number; timeLimitSecs: number; orderIndex: number })[]
  >([]);

  useEffect(() => {
    if (id) {
      fetchTestDetails();
    }
  }, [id]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const testData = await testService.getTestById(id!);
      setTest(testData);

      // Fetch full question details
      if (testData.questions && testData.questions.length > 0) {
        const allQuestions = await testService.getAllQuestions();
        const enrichedQuestions = testData.questions
          .map((tq) => {
            const question = allQuestions.find((q) => q.id === tq.questionId);
            return {
              ...question,
              marks: tq.marks,
              timeLimitSecs: tq.timeLimitSecs,
              orderIndex: tq.orderIndex,
            } as Question & {
              marks: number;
              timeLimitSecs: number;
              orderIndex: number;
            };
          })
          .filter((q) => q.id) // Filter out any undefined questions
          .sort((a, b) => a.orderIndex - b.orderIndex);

        setQuestions(enrichedQuestions);
      }
    } catch (error: any) {
      console.error("Failed to fetch test details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load test details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/admin/tests/edit/${id}`);
  };

  const handleAddQuestions = () => {
    navigate(`/admin/tests/${id}/questions`);
  };

  const handlePublish = async () => {
    try {
      await testService.updateTest(id!, { status: "PUBLISHED" });
      toast({
        title: "Success",
        description: "Test has been published successfully.",
      });
      fetchTestDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish test",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    try {
      await testService.updateTest(id!, { status: "ARCHIVED" });
      toast({
        title: "Success",
        description: "Test has been archived successfully.",
      });
      fetchTestDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to archive test",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.id) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      await testService.createTest({
        title: `${test!.title} (Copy)`,
        description: test!.description,
        durationMins: test!.durationMins,
        difficulty: test!.difficulty,
        instructions: test!.instructions,
        status: "DRAFT",
        passMark: test!.passMark,
        createdById: user.id,
      });

      toast({
        title: "Success",
        description: "Test duplicated successfully.",
      });
      navigate("/admin/tests");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate test",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this test? This action cannot be undone.",
      )
    ) {
      try {
        await testService.deleteTest(id!);
        toast({
          title: "Success",
          description: "Test deleted successfully.",
        });
        navigate("/admin/tests");
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete test",
          variant: "destructive",
        });
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500/10 text-green-500";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "hard":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "bg-green-500/10 text-green-500";
      case "draft":
        return "bg-gray-500/10 text-gray-500";
      case "archived":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mcq":
        return <FileText className="w-4 h-4" />;
      case "coding":
        return <Code className="w-4 h-4" />;
      default:
        return <FileQuestion className="w-4 h-4" />;
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const totalTimeMinutes = Math.ceil(
    questions.reduce((sum, q) => sum + (q.timeLimitSecs || 0), 0) / 60,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Test Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The test you're looking for doesn't exist or has been deleted.
        </p>
        <Link to="/admin/tests">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/tests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold">{test.title}</h1>
            {test.description && (
              <p className="text-muted-foreground mt-1">{test.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
          {test.status === "DRAFT" && (
            <Button onClick={handlePublish}>
              <Play className="w-4 h-4 mr-2" />
              Publish
            </Button>
          )}
          {test.status === "PUBLISHED" && (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{test.durationMins} min</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passing Mark</p>
                <p className="text-2xl font-bold">{test.passMark}%</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold">{questions.length}</p>
              </div>
              <FileQuestion className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="text-2xl font-bold">{totalMarks}</p>
              </div>
              <FileQuestion className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
              <CardDescription>
                Detailed information about this test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Difficulty
                  </label>
                  <div className="mt-1">
                    <Badge className={getDifficultyColor(test.difficulty)}>
                      {test.difficulty}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created By
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {test.createdBy?.name ||
                        test.createdBy?.email ||
                        "Unknown"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {test.createdAt
                        ? new Date(test.createdAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {test.updatedAt
                        ? new Date(test.updatedAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Total Time (Estimated)
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{totalTimeMinutes} minutes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {test.instructions && Object.keys(test.instructions).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {JSON.stringify(test.instructions, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Questions</CardTitle>
                  <CardDescription>
                    Questions included in this test
                  </CardDescription>
                </div>
                <Button onClick={handleAddQuestions}>
                  <FileQuestion className="w-4 h-4 mr-2" />
                  Manage Questions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No questions added yet.</p>
                  <Button onClick={handleAddQuestions} className="mt-4">
                    Add Questions
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Time Limit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((question, index) => (
                        <TableRow key={question.id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{question.prompt}</p>
                              {question.mcqOptions &&
                                question.mcqOptions.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {question.mcqOptions.length} options
                                  </div>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 w-fit"
                            >
                              {getQuestionTypeIcon(
                                question.questionType || question.type || "MCQ",
                              )}
                              {question.questionType || question.type || "MCQ"}
                            </Badge>
                          </TableCell>
                          <TableCell>{question.marks}</TableCell>
                          <TableCell>{question.timeLimitSecs} sec</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Settings</CardTitle>
              <CardDescription>
                Advanced configuration and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Test ID
                </label>
                <p className="font-mono text-sm mt-1">{test.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Duration
                </label>
                <p className="mt-1">{test.durationMins} minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Passing Mark
                </label>
                <p className="mt-1">{test.passMark}%</p>
              </div>
              {test.instructions && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Instructions (JSON)
                  </label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
                    {JSON.stringify(test.instructions, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
