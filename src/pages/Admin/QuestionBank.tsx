import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Plus,
  Search,
  Code,
  ListChecks,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { testService, Question } from "@/lib/test-service";
import { useAuth } from "@/lib/auth-context";

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-500 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  HARD: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AdminQuestionBank() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"MCQ" | "CODING">("MCQ");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const allQuestions = await testService.getAllQuestions();
      setQuestions(allQuestions);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const allSubjects = await testService.getAllSubjects();
      setSubjects(allSubjects);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const handleDeleteClick = (question: Question) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuestion) return;

    setDeleting(true);
    try {
      await testService.deleteQuestion(selectedQuestion.id);
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      fetchQuestions();
    } catch (error: any) {
      console.error("Failed to delete question:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete question",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
    }
  };

  const handleView = (question: Question) => {
    if (question.questionType === "CODING") {
      navigate(`/admin/questions/playground/${question.id}`);
    } else {
      // For MCQ, show a dialog or navigate to view page
      toast({
        title: "Question Preview",
        description: question.prompt?.substring(0, 200),
      });
    }
  };

  const handleEdit = (question: Question) => {
    navigate(`/admin/questions/edit/${question.id}`);
  };

  const handleAdd = () => {
    navigate("/admin/questions/add");
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesType = question.questionType === activeTab;
    const matchesSearch = 
      question.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "ALL" || question.difficulty === difficultyFilter;
    const matchesSubject = subjectFilter === "all" || question.subjectId === subjectFilter;
    
    return matchesType && matchesSearch && matchesDifficulty && matchesSubject;
  });

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || "Unknown";
  };

  // Check if admin can delete (only if question not used in any test)
  const canDelete = (question: Question) => {
    // Add logic later when you have usedInTests count from backend
    return true;
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage questions for your tests
          </p>
        </div>
        <Button variant="hero" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Tab Navigation */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "MCQ" | "CODING")}
      >
        <TabsList>
          <TabsTrigger value="MCQ" className="gap-2">
            <ListChecks className="w-4 h-4" />
            MCQ ({questions.filter(q => q.questionType === "MCQ").length})
          </TabsTrigger>
          <TabsTrigger value="CODING" className="gap-2">
            <Code className="w-4 h-4" />
            Coding ({questions.filter(q => q.questionType === "CODING").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or prompt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Subject" />
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

          {/* Questions Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-[40%]">Question</TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold">Marks</TableHead>
                  <TableHead className="font-semibold text-center">Used in Tests</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Loading questions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      {searchTerm || difficultyFilter !== "ALL" || subjectFilter !== "all"
                        ? "No questions match your filters"
                        : "No questions found. Click 'Add Question' to create one."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => (
                    <TableRow key={question.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {question.title || question.prompt?.substring(0, 60)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {question.prompt?.substring(0, 100)}
                            {question.prompt && question.prompt.length > 100 && "..."}
                          </p>
                          {question.tags && question.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {question.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {question.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{question.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSubjectName(question.subjectId)}
                      </TableCell>
                      <TableCell>
                        {question.difficulty ? (
                          <Badge className={difficultyColors[question.difficulty]}>
                            {question.difficulty}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{question.marks || 0} marks</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">0</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(question)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Question
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(question)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Question
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteClick(question)}
                              disabled={!canDelete(question)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Question
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
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question "{selectedQuestion?.title || selectedQuestion?.prompt?.substring(0, 50)}".
              {selectedQuestion?.questionType === "CODING" && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ This will also delete all test cases associated with this question.
                </span>
              )}
              This action cannot be undone.
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
                  Deleting...
                </>
              ) : (
                "Delete Question"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}