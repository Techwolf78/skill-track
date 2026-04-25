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
  Play,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { testService } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

// Types for new backend
interface Question {
  id: string;
  subjectId: string;
  topicId: string;
  subtopicId: string;
  type: "MCQ" | "TEXT" | "CODE";
  prompt: string;
  mcqOptions?: Array<Record<string, unknown>>;
}

interface Subject {
  id: string;
  name: string;
}

const difficultyColors = {
  Easy: "bg-green-500/10 text-green-500 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Hard: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "All" | "Easy" | "Medium" | "Hard"
  >("All");

  // Fetch questions and subjects from backend
  const fetchData = async () => {
    try {
      setLoading(true);

      const [allQuestions, allSubjects] = await Promise.all([
        testService.getAllQuestions(),
        testService.getAllSubjects(),
      ]);

      console.log("Subjects API:", allSubjects);

      // Normalize subjects
      const normalizedSubjects = allSubjects.map((s: any) => ({
        id: s.id || s._id,
        name: s.name || s.title,
      }));

      setQuestions(allQuestions);
      setSubjects(normalizedSubjects);
    } catch (error: any) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      await testService.deleteQuestion(id);
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/questions/edit/${id}`);
  };

  const handlePreview = (question: Question) => {
    // Show preview dialog or navigate
    toast({
      title: "Preview",
      description: question.prompt,
    });
  };

  const handleSolve = (id: string) => {
    navigate(`/admin/questions/playground/${id}`);
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(
      (s: any) =>
        s.id === subjectId || s._id === subjectId || s.subjectId === subjectId,
    );

    return subject?.name || subject?.title || "Unknown";
  };

  const getDifficultyFromQuestion = (question: Question): string => {
    // You might want to add a difficulty field to your Question model
    // For now, return based on subject or random
    return "Medium";
  };

  // Filter MCQ questions (type === "MCQ")
  const mcqQuestions = questions.filter((q) => q.type === "MCQ");

  // Filter Coding questions (type === "CODE")
  const codingQuestions = questions.filter((q) => q.type === "CODE");

  const filteredMCQ = mcqQuestions.filter((q) =>
    q.prompt.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCoding = codingQuestions.filter((q) => {
    const matchesSearch = q.prompt
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "All" ||
      getDifficultyFromQuestion(q) === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Manage your MCQ and coding questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={difficultyFilter}
            onValueChange={(value) =>
              setDifficultyFilter(value as "All" | "Easy" | "Medium" | "Hard")
            }
          >
            <SelectTrigger className="h-10 w-40">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="hero"
            onClick={() => navigate("/admin/questions/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="mcq"
        className="w-full"
        onValueChange={(v) => setActiveTab(v as "mcq" | "coding")}
      >
        <TabsList className="h-12">
          <TabsTrigger value="mcq" className="gap-2 px-6">
            <ListChecks className="w-4 h-4" />
            MCQ Questions
            <Badge variant="secondary" className="ml-1">
              {mcqQuestions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="coding" className="gap-2 px-6">
            <Code className="w-4 h-4" />
            Coding Questions
            <Badge variant="secondary" className="ml-1">
              {codingQuestions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* MCQ Tab */}
        <TabsContent value="mcq" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-[50%]">
                    Question
                  </TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold">Options</TableHead>
                  <TableHead className="font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMCQ.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No MCQ questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMCQ.map((q) => (
                    <TableRow
                      key={q.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">{q.prompt}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getSubjectName(q.subjectId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            difficultyColors[
                              getDifficultyFromQuestion(
                                q,
                              ) as keyof typeof difficultyColors
                            ]
                          }
                        >
                          {getDifficultyFromQuestion(q)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {q.mcqOptions?.length || 0} options
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handlePreview(q)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEdit(q.id)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => handleDelete(q.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

        {/* Coding Tab */}
        <TabsContent value="coding" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Question</TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoding.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No coding questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoding.map((q) => (
                    <TableRow
                      key={q.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium">{q.prompt}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getSubjectName(q.subjectId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            difficultyColors[
                              getDifficultyFromQuestion(
                                q,
                              ) as keyof typeof difficultyColors
                            ]
                          }
                        >
                          {getDifficultyFromQuestion(q)}
                        </Badge>
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
                              onSelect={() => handleSolve(q.id)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Solve Question
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handlePreview(q)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEdit(q.id)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => handleDelete(q.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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
    </div>
  );
}
