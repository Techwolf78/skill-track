import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Play, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, CreateTestRequest } from "@/lib/test-service";

export default function AdminTestCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CreateTestRequest>>({
    title: "",
    description: "",
    durationMins: 60,
    difficulty: "MEDIUM",
    passMark: 40,
    status: "DRAFT",
    instructions: {},
    questions: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Test title is required";
    }

    if ((formData.durationMins || 0) < 1) {
      newErrors.durationMins = "Duration must be at least 1 minute";
    }

    if ((formData.durationMins || 0) > 480) {
      newErrors.durationMins = "Duration cannot exceed 480 minutes";
    }

    if ((formData.passMark || 0) < 0 || (formData.passMark || 0) > 100) {
      newErrors.passMark = "Passing mark must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleNumberChange = (name: string, value: string) => {
    const numValue = parseInt(value, 10);
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createTestAndContinue = async (status: "DRAFT" | "PUBLISHED") => {
    if (status === "PUBLISHED" && !validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before publishing",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Test title is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const createData: CreateTestRequest = {
        title: formData.title!,
        description: formData.description || "",
        durationMins: formData.durationMins || 60,
        difficulty: formData.difficulty as "EASY" | "MEDIUM" | "HARD",
        passMark: formData.passMark || 40,
        status: status as "DRAFT" | "PUBLISHED",
        instructions: formData.instructions || {},
        questions: [],
        isActive: true,
      };

      const createdTest = await testService.createTest(createData);

      toast({
        title: "Success",
        description:
          status === "DRAFT"
            ? "Test saved as draft! Now add questions."
            : "Test published! Now add questions.",
      });

      let testId =
        typeof createdTest === "object"
          ? createdTest.id || createdTest._id
          : null;

      if (!testId) {
        const allTests = await testService.getAllTests();
        const foundTest = allTests.find((t) => t.title === createData.title);
        if (foundTest) testId = foundTest.id;
      }

      if (!testId) {
        navigate("/admin/tests");
        return;
      }

      navigate(`/admin/tests/${testId}/questions`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/tests")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">Create New Test</h1>
            <p className="text-muted-foreground mt-1">
              Step 1: Configure basic test settings
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => createTestAndContinue("DRAFT")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save as Draft & Add Questions
          </Button>
          <Button
            variant="hero"
            onClick={() => createTestAndContinue("PUBLISHED")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Publish & Add Questions
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Initial settings for your evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Senior Frontend Developer Assessment"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="What is this test about? (Optional)"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMins">Duration (Mins)</Label>
                  <Input
                    id="durationMins"
                    type="number"
                    value={formData.durationMins}
                    onChange={(e) => handleNumberChange("durationMins", e.target.value)}
                  />
                  {errors.durationMins && (
                    <p className="text-sm text-destructive">{errors.durationMins}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => handleSelectChange("difficulty", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passMark">Pass Mark (%)</Label>
                  <Input
                    id="passMark"
                    type="number"
                    value={formData.passMark}
                    onChange={(e) => handleNumberChange("passMark", e.target.value)}
                  />
                  {errors.passMark && (
                    <p className="text-sm text-destructive">{errors.passMark}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">
                After creating the test, you'll be able to add questions from your question bank or create new ones.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Process</p>
                <p>1. Create basic test info</p>
                <p>2. Add questions from bank</p>
                <p>3. Schedule test for candidates</p>
              </div>
              <div className="pt-2 border-t">
                <p className="font-medium text-foreground mb-1">Pro Tips</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use a clear, specific title</li>
                  <li>Set a realistic pass mark (standard is 40%)</li>
                  <li>Check duration covers all questions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
