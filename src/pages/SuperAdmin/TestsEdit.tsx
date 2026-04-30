// src/pages/admin/tests/TestsEdit.tsx
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
} from "lucide-react";
import { testService, Test, CreateTestRequest } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

export default function TestsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [questionsData, setQuestionsData] = useState<any[]>([]);

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
      navigate("/superadmin/tests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    if (id) {
      fetchTest();
    } else {
      navigate("/superadmin/tests");
    }
  }, [id, fetchTest]);

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
      navigate("/superadmin/tests");
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
      navigate("/superadmin/tests");
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

  const handleAddQuestions = () => {
    navigate(`/superadmin/tests/${id}/questions`);
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
        <Link to="/superadmin/tests">
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
          <Link to="/superadmin/tests">
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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="questions">
            Questions ({questionCount})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="mt-6 space-y-6">
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
                  value={formData.title || ""}
                  onChange={handleInputChange}
                  placeholder="e.g., JavaScript Fundamentals Assessment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleInputChange}
                  placeholder="Describe the purpose and scope of this test..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMins">Duration (minutes)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="durationMins"
                      name="durationMins"
                      type="number"
                      value={formData.durationMins || 60}
                      onChange={handleInputChange}
                      className="pl-10"
                      min="1"
                      max="480"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passMark">Passing Mark (%)</Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="passMark"
                      name="passMark"
                      type="number"
                      value={formData.passMark || 40}
                      onChange={handleInputChange}
                      className="pl-10"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={formData.difficulty || "MEDIUM"}
                    onValueChange={(value) =>
                      handleSelectChange("difficulty", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">
                        <Badge className="bg-green-500/10 text-green-500">
                          Easy
                        </Badge>
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        <Badge className="bg-yellow-500/10 text-yellow-500">
                          Medium
                        </Badge>
                      </SelectItem>
                      <SelectItem value="HARD">
                        <Badge className="bg-red-500/10 text-red-500">
                          Hard
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || "DRAFT"}
                    onValueChange={(value) =>
                      handleSelectChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">
                        <Badge variant="outline" className="bg-gray-500/10">
                          Draft
                        </Badge>
                      </SelectItem>
                      <SelectItem value="PUBLISHED">
                        <Badge className="bg-green-500/10 text-green-500">
                          Published
                        </Badge>
                      </SelectItem>
                      <SelectItem value="ARCHIVED">
                        <Badge className="bg-red-500/10 text-red-500">
                          Archived
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Questions</CardTitle>
                  <CardDescription>
                    Manage questions for this test
                  </CardDescription>
                </div>
                <Button onClick={handleAddQuestions}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Questions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questionsData.length > 0 ? (
                <div className="space-y-4">
                  {questionsData
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((tq, index) => (
                      <div
                        key={tq.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            <Badge variant="secondary">{tq.marks} marks</Badge>
                            {tq.timeLimitSecs > 0 && (
                              <Badge variant="outline">
                                {tq.timeLimitSecs} seconds
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {tq.question?.questionType ||
                                tq.question?.type ||
                                "MCQ"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">
                            {tq.question?.prompt ||
                              `Question ID: ${tq.questionId}`}
                          </p>
                          {tq.question?.subjectId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Subject ID: {tq.question.subjectId}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (
                                confirm("Remove this question from the test?")
                              ) {
                                try {
                                  await testService.deleteTestQuestion(tq.id);
                                  toast({
                                    title: "Success",
                                    description: "Question removed from test.",
                                  });
                                  fetchTest();
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to remove question.",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No questions added yet.</p>
                  <p className="text-sm mt-2">
                    Add questions to this test to make it available for
                    students.
                  </p>
                  <Button onClick={handleAddQuestions} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Questions
                  </Button>
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
                Advanced configuration for your test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Test ID</Label>
                <Input value={test.id} disabled className="font-mono" />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this test
                </p>
              </div>

              <div className="space-y-2">
                <Label>Created By</Label>
                <Input
                  value={
                    test.createdBy?.name || test.createdBy?.email || "Unknown"
                  }
                  disabled
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Created At</Label>
                  <Input
                    value={
                      test.createdAt
                        ? new Date(test.createdAt).toLocaleString()
                        : "N/A"
                    }
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <Input
                    value={
                      test.updatedAt
                        ? new Date(test.updatedAt).toLocaleString()
                        : "N/A"
                    }
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test "{test?.title}". This action
              cannot be undone. All questions and responses will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
