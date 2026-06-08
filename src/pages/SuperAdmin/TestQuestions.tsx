import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
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
  const { user } = useAuth();

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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, subjectFilter, typeFilter, difficultyFilter]);

  // Marks and time limit for selected questions
  const [defaultMarks, setDefaultMarks] = useState<number>(5);
  const [defaultTimeLimit, setDefaultTimeLimit] = useState<number>(10);

  const fetchTestAndQuestions = useCallback(async () => {
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
    } catch (error: unknown) {
      console.error("Failed to fetch:", error);
      const errMsg = error instanceof Error ? error.message : "Failed to load data";
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      fetchTestAndQuestions();
    }
  }, [id, fetchTestAndQuestions]);

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
    // Get current questions to determine starting order index
    const testWithQuestions = await testService.getTestById(id!);
    const currentQuestions = testWithQuestions.testQuestions || testWithQuestions.questions || [];
    
    // Find the maximum order index currently in the test
    let maxOrderIndex = -1;
    currentQuestions.forEach((tq: { orderIndex?: number }) => {
      if (tq.orderIndex !== undefined && tq.orderIndex > maxOrderIndex) {
        maxOrderIndex = tq.orderIndex;
      }
    });

    let orderIndex = maxOrderIndex + 1;
    let successCount = 0;
    let failCount = 0;
    const failedQuestions: string[] = [];

    console.log("Starting to add questions:", {
      testId: id,
      selectedQuestions: Array.from(selectedQuestions),
      startOrderIndex: orderIndex,
      defaultMarks,
      defaultTimeLimit
    });

    // Add each question individually (since no bulk endpoint)
    for (const questionId of selectedQuestions) {
      try {
        const currentOrderIndex = orderIndex++;
        const requestData = {
          testId: id!,
          questionId: questionId,
          orderIndex: currentOrderIndex,
          marks: defaultMarks,
          timeLimitSecs: defaultTimeLimit * 60,
        };
        
        console.log("Adding question:", requestData);
        
        const response = await testService.addQuestionToTest(
          id!,
          questionId,
          currentOrderIndex,
          defaultMarks,
          defaultTimeLimit * 60
        );
        
        console.log("Question added successfully:", response);
        successCount++;
      } catch (error: unknown) {
        console.error(`Failed to add question ${questionId}:`, error);
        if (error && typeof error === "object" && "response" in error) {
          console.error("Error response:", (error as { response?: { data?: unknown } }).response?.data);
        }
        failCount++;
        failedQuestions.push(questionId);
      }
    }

    console.log("Add questions completed:", { successCount, failCount, failedQuestions });

    if (successCount > 0) {
      toast({
        title: "Success",
        description: `${successCount} question(s) added to test.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
      });
      // Navigate back to test edit page with role-awareness
      const rolePath = user?.role === 'ADMIN' ? 'admin' : 'superadmin';
      navigate(`/${rolePath}/tests/edit/${id}`);
    } else {
      throw new Error("Failed to add any questions");
    }
  } catch (error: unknown) {
    console.error("Failed to add questions:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to add questions";
    toast({
      title: "Error",
      description: errMsg,
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

  const getDifficultyFromQuestion = (question: Question): string => {
    if (question.difficulty) return question.difficulty;
    if (question.marks) {
      if (question.marks <= 2) return "EASY";
      if (question.marks <= 5) return "MEDIUM";
      return "HARD";
    }
    return "MEDIUM";
  };

  const getDifficultyColor = (diff: string): string => {
    switch (diff?.toUpperCase()) {
      case "EASY":
        return "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20";
      case "HARD":
        return "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
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
    
    const qType = q.questionType || "MCQ";
    const matchesType =
      typeFilter === "all" || qType.toUpperCase() === typeFilter.toUpperCase();
      
    const qDiff = getDifficultyFromQuestion(q);
    const matchesDifficulty =
      difficultyFilter === "all" || qDiff.toUpperCase() === difficultyFilter.toUpperCase();

    return matchesSearch && matchesSubject && matchesType && matchesDifficulty;
  });

  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
          <Link to={`/${user?.role === 'ADMIN' ? 'admin' : 'superadmin'}/tests/edit/${id}`}>
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
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[180px]">
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

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MCQ">MCQ Questions</SelectItem>
            <SelectItem value="CODING">Coding Questions</SelectItem>
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
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
                  <Link to={`/${user?.role === 'ADMIN' ? 'admin' : 'superadmin'}/questions`}>
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
                {paginatedQuestions.map((question) => (
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
                            question.questionType || "MCQ",
                          )}
                          {question.questionType || "MCQ"}
                        </Badge>
                        <Badge variant="outline">
                          {getSubjectName(question.subjectId)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(getDifficultyFromQuestion(question))}
                        >
                          {getDifficultyFromQuestion(question)}
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
                    <p className="text-xs text-muted-foreground font-medium">
                      Showing <span className="font-semibold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                      <span className="font-semibold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)}</span> of{" "}
                      <span className="font-semibold text-foreground">{filteredQuestions.length}</span> questions
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 text-xs font-semibold"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0 text-xs font-semibold"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 text-xs font-semibold"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
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
                <Label className="text-xs text-white/80">Time (min):</Label>
                <Input
                  type="number"
                  value={defaultTimeLimit}
                  onChange={(e) =>
                    setDefaultTimeLimit(parseInt(e.target.value) || 0)
                  }
                  className="w-20 h-8 text-sm bg-white/10 text-white border-white/20"
                  min={1}
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
