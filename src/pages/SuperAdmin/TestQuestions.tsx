// src/pages/SuperAdmin/TestQuestions.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogTrigger,
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
  X
} from "lucide-react";
import { testService, Test, Question } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

export default function TestQuestions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [subjects, setSubjects] = useState<any[]>([]);

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
        testService.getAllSubjects()
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
      // Add selected questions to test
      const orderIndex = test?.testQuestions?.length || 0;
      const promises = Array.from(selectedQuestions).map((questionId, index) =>
        testService.addQuestionToTest({
          testId: id!,
          questionId: questionId,
          orderIndex: orderIndex + index,
          marks: 5,
          timeLimitSecs: 60,
        })
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: `${selectedQuestions.size} question(s) added to test.`,
      });
      
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
      case "CODE":
        return <Code className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || "Unknown Subject";
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || q.subjectId === subjectFilter;
    const notAdded = !test?.testQuestions?.some(tq => tq.questionId === q.id);
    return matchesSearch && matchesSubject && notAdded;
  });

  // Get already added questions count
  const alreadyAddedCount = test?.testQuestions?.length || 0;

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
          <Button onClick={handleAddQuestions} disabled={adding || selectedQuestions.size === 0}>
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Selected ({selectedQuestions.size})
              </>
            )}
          </Button>
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
                <p>No questions found.</p>
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
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getQuestionTypeIcon(question.type)}
                          {question.type}
                        </Badge>
                        <Badge variant="outline">
                          {getSubjectName(question.subjectId)}
                        </Badge>
                        {question.topicId && (
                          <Badge variant="secondary" className="text-xs">
                            Topic ID: {question.topicId.substring(0, 8)}...
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{question.prompt}</p>
                      {question.type === "MCQ" && question.mcqOptions && (
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

      {/* Selected Summary */}
      {selectedQuestions.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-semibold">{selectedQuestions.size} Question(s) Selected</p>
              <p className="text-xs opacity-80">Click "Add Selected" to continue</p>
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleAddQuestions}
              disabled={adding}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Now"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}