import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  Plus,
  FileQuestion,
  Clock,
  Target,
  AlertCircle,
  X,
} from "lucide-react";
import { testService, Test, CreateTestRequest } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export default function AdminTestsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteQuestionDialogOpen, setDeleteQuestionDialogOpen] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateTestRequest>>({
    title: "",
    description: "",
    durationMins: 60,
    difficulty: "MEDIUM",
    passMark: 40,
    status: "DRAFT",
    instructions: {},
  });

  const fetchTest = useCallback(async () => {
    try {
      setLoading(true);
      const data = await testService.getTestById(id!);
      setTest(data);

      // Fetch full question details for each question in the test
      if (data.questions && data.questions.length > 0) {
        const allQuestions = await testService.getAllQuestions();
        const enrichedQuestions = data.questions.map((tq) => ({
          ...tq,
          question: allQuestions.find((q) => q.id === tq.questionId),
        }));
        setQuestionsData(enrichedQuestions);
      } else {
        setQuestionsData([]);
      }

      // Populate form with test data
      setFormData({
        title: data.title,
        description: data.description || "",
        durationMins: data.durationMins,
        difficulty: data.difficulty,
        passMark: data.passMark,
        status: data.status,
        instructions: data.instructions || {},
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load test. Please try again.";
      console.error("Failed to fetch test:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      navigate("/admin/tests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    if (id) {
      fetchTest();
    } else {
      navigate("/admin/tests");
    }
  }, [id, fetchTest, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "durationMins" || name === "passMark"
          ? parseInt(value, 10)
          : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Test title is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.durationMins && formData.durationMins <= 0) {
      toast({
        title: "Validation Error",
        description: "Duration must be greater than 0 minutes.",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.passMark &&
      (formData.passMark < 0 || formData.passMark > 100)
    ) {
      toast({
        title: "Validation Error",
        description: "Passing mark must be between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await testService.updateTest(id!, {
        title: formData.title,
        description: formData.description,
        durationMins: formData.durationMins,
        difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
        passMark: formData.passMark,
        status: formData.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        instructions: formData.instructions,
      });
      toast({
        title: "Success",
        description: "Test has been updated successfully.",
      });
      navigate("/admin/tests");
    } catch (error: any) {
      console.error("Failed to update test:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to update test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await testService.deleteTest(id!);
      toast({
        title: "Success",
        description: `"${test?.title}" has been deleted successfully.`,
      });
      navigate("/admin/tests");
    } catch (error: any) {
      console.error("Failed to delete test:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to delete test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return;

    try {
      setDeletingQuestion(true);
      // Call API to remove question from test
      await testService.removeQuestionFromTest(id!, selectedQuestion.id);

      toast({
        title: "Success",
        description: `Question has been removed from the test.`,
      });

      // Refresh the test data
      await fetchTest();
    } catch (error: any) {
      console.error("Failed to remove question:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to remove question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingQuestion(false);
      setDeleteQuestionDialogOpen(false);
      setSelectedQuestion(null);
    }
  };

  const handleAddQuestions = () => {
    navigate(`/admin/tests/${id}/questions`);
  };

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

  const questionCount = test.questions?.length || 0;

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
            <h1 className="text-3xl font-heading font-bold">Edit Test</h1>
            <p className="text-muted-foreground mt-1">
              Modify test details and configuration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="details">Basic Information</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questionCount})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Details</CardTitle>
                  <CardDescription>
                    Configure the basic information for your test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Test Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Frontend Engineering Assessment"
                      value={formData.title}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter test description..."
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="durationMins">Duration (minutes)</Label>
                      <Input
                        id="durationMins"
                        name="durationMins"
                        type="number"
                        value={formData.durationMins}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passMark">Passing Mark (%)</Label>
                      <Input
                        id="passMark"
                        name="passMark"
                        type="number"
                        value={formData.passMark}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(v) =>
                          handleSelectChange("difficulty", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EASY">Easy</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HARD">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => handleSelectChange("status", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileQuestion className="w-4 h-4" />
                      <span>Questions</span>
                    </div>
                    <span className="font-semibold">{questionCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Total Duration</span>
                    </div>
                    <span className="font-semibold">
                      {formData.durationMins} mins
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span>Avg. Difficulty</span>
                    </div>
                    <Badge variant="secondary">{formData.difficulty}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleAddQuestions}
                  >
                    <Plus className="w-4 h-4" />
                    Manage Questions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Test Questions</CardTitle>
                <CardDescription>
                  Manage and organize questions in this test
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddQuestions}>
                <Plus className="w-4 h-4 mr-2" />
                Add Questions
              </Button>
            </CardHeader>
            <CardContent>
              {questionsData.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No questions added yet.
                  </p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={handleAddQuestions}
                  >
                    Add your first question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questionsData.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">
                            {item.question?.title || "Unknown Question"}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span className="capitalize">
                              {item.question?.type?.toLowerCase()}
                            </span>
                            <span>•</span>
                            <span>{item.marks} marks</span>
                            <span>•</span>
                            <span>{item.timeLimitSecs}s</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-red-50/80 dark:hover:bg-red-950/20"
                        onClick={() => {
                          setSelectedQuestion(item);
                          setDeleteQuestionDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Settings</CardTitle>
              <CardDescription>
                Advanced configuration for the test environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Settings related to proctoring, navigation, and results display
                will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Test Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test "
              <span className="font-semibold text-foreground">
                {test.title}
              </span>
              " and remove it from our servers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Question Confirmation Dialog */}
      <AlertDialog
        open={deleteQuestionDialogOpen}
        onOpenChange={setDeleteQuestionDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "
              <span className="font-semibold text-foreground">
                {selectedQuestion?.question?.title}
              </span>
              " from this test? This action can be undone by adding the question
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteQuestion}
              disabled={deletingQuestion}
            >
              {deletingQuestion ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
