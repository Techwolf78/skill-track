import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  Check,
  BookOpen,
  Code,
  FileText,
  X,
} from "lucide-react";
import {
  testService,
  Test,
  Question,
  Subject,
  Topic,
} from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

export default function TestQuestions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Marks and time limit for selected questions
  const [defaultMarks, setDefaultMarks] = useState<number>(5);
  const [defaultTimeLimit, setDefaultTimeLimit] = useState<number>(60);

  useEffect(() => {
    if (id) {
      fetchTestAndQuestions();
    }
  }, [id]);

  const fetchTestAndQuestions = async () => {
    try {
      setLoading(true);
      const [testData, allQuestions, allSubjects] = await Promise.all([
        testService.getTestById(id!),
        testService.getAllQuestions(),
        testService.getAllSubjects(),
      ]);

      setTest(testData);
      setQuestions(allQuestions);
      setSubjects(allSubjects);
    } catch (error: any) {
      console.error("Failed to fetch:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSelect = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleAddQuestions = async () => {
    if (selectedQuestions.size === 0) {
      toast({
        title: "No Questions Selected",
        description: "Please select at least one question to add.",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      // Get current max order index
      const currentQuestions = test?.questions || [];
      const maxOrderIndex = currentQuestions.length;

      // Use bulk add endpoint
      await testService.bulkAddQuestionsToTest({
        testId: id!,
        questionIds: Array.from(selectedQuestions),
        startOrderIndex: maxOrderIndex + 1,
        defaultMarks: defaultMarks,
        defaultTimeLimitSecs: defaultTimeLimit,
      });

      toast({
        title: "Success",
        description: `${selectedQuestions.size} question(s) added to test.`,
      });

      // Navigate back to test edit page
      navigate(`/admin/tests/edit/${id}`);
    } catch (error: any) {
      console.error("Failed to add questions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add questions",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case "MCQ":
        return <FileText className="w-4 h-4" />;
      case "CODING":
        return <Code className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || "Unknown Subject";
  };

  // Filter questions - only show ones not already in test
  const alreadyAddedIds = new Set(
    test?.questions?.map((q) => q.questionId) || [],
  );
  const availableQuestions = questions.filter(
    (q) => !alreadyAddedIds.has(q.id),
  );

  const filteredQuestions = availableQuestions.filter((q) => {
    const matchesSearch = q.prompt
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSubject =
      subjectFilter === "all" || q.subjectId === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Get already added questions count
  const alreadyAddedCount = test?.questions?.length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/admin/tests/edit/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold">Add Questions</h1>
            <p className="text-muted-foreground mt-1">
              Select questions from bank to add to "{test?.title}"
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Already Added: {alreadyAddedCount}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Questions</CardTitle>
          <CardDescription>
            Select questions to add to your test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No questions available to add.</p>
                <p className="text-sm mt-2">
                  {searchTerm || subjectFilter !== "all"
                    ? "Try different search or filter criteria."
                    : "Create questions in the Question Bank first."}
                </p>
                {!searchTerm && subjectFilter === "all" && (
                  <Link to="/admin/questions">
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Go to Question Bank
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">
                  Showing {filteredQuestions.length} available questions
                </div>
                {filteredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedQuestions.has(question.id)}
                      onCheckedChange={() => handleQuestionSelect(question.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          {getQuestionTypeIcon(
                            question.questionType || question.type || "MCQ",
                          )}
                          {question.questionType || question.type || "MCQ"}
                        </Badge>
                        <Badge variant="outline">
                          {getSubjectName(question.subjectId)}
                        </Badge>
                        <Badge variant="secondary">
                          {question.marks || 0} marks
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{question.prompt}</p>
                      {question.mcqOptions &&
                        question.mcqOptions.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {question.mcqOptions.length} options available
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Summary with Marks and Time Limit */}
      {selectedQuestions.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold">
                  {selectedQuestions.size} Question(s) Selected
                </p>
                <p className="text-xs opacity-80">
                  Configure marks and time limit
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-white/80">Marks:</Label>
                <Input
                  type="number"
                  value={defaultMarks}
                  onChange={(e) =>
                    setDefaultMarks(parseInt(e.target.value) || 0)
                  }
                  className="w-20 h-8 text-sm bg-white/10 text-white border-white/20"
                  min={1}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-white/80">Time (sec):</Label>
                <Input
                  type="number"
                  value={defaultTimeLimit}
                  onChange={(e) =>
                    setDefaultTimeLimit(parseInt(e.target.value) || 0)
                  }
                  className="w-20 h-8 text-sm bg-white/10 text-white border-white/20"
                  min={30}
                />
              </div>
              <Button
                size="default"
                variant="secondary"
                onClick={handleAddQuestions}
                disabled={adding}
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add Selected"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
