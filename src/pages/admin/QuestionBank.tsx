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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  fetchLeetCodeProblems,
  LeetCodeProblem,
  mapLeetCodeToAppQuestion,
} from "@/lib/leetcode";
import AddQuestion from "./AddQuestion";
import EditQuestion from "./EditQuestion";

const mcqQuestions = [
  {
    id: "1",
    question: "What is the time complexity of binary search?",
    topic: "Algorithms",
    difficulty: "Easy",
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    question: "Which of the following is not a valid Python data type?",
    topic: "Python",
    difficulty: "Easy",
    createdAt: "2024-01-09",
  },
  {
    id: "3",
    question: "What is the purpose of the 'final' keyword in Java?",
    topic: "Java",
    difficulty: "Medium",
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    question: "Which data structure uses LIFO principle?",
    topic: "Data Structures",
    difficulty: "Easy",
    createdAt: "2024-01-07",
  },
  {
    id: "5",
    question: "What is the difference between == and === in JavaScript?",
    topic: "JavaScript",
    difficulty: "Medium",
    createdAt: "2024-01-06",
  },
];

const difficultyColors = {
  Easy: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Hard: "bg-destructive/10 text-destructive border-destructive/20",
};

interface FirebaseCodingQuestion {
  id: string;
  questionId?: string; // ✅ added
  title: string;
  topic: string;
  difficulty: string;
  languages: string[];
  testCases: number;
}

interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

interface TestCase {
  input: string;
  expected: string;
}

interface FullCodingQuestion {
  id: string;
  title: string;
  content: string;
  categoryTitle: string;
  difficulty: string;
  codeSnippets: CodeSnippet[];
  sampleTestCases?: TestCase[];
  hiddenTestCases?: TestCase[];
}

export default function QuestionBank() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [firebaseCodingQuestions, setFirebaseCodingQuestions] = useState<
    FirebaseCodingQuestion[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [leetCodeProblems, setLeetCodeProblems] = useState<LeetCodeProblem[]>(
    [],
  );
  const [isFetchingLeetCode, setIsFetchingLeetCode] = useState(false);
  const [leetCodeSearch, setLeetCodeSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "All" | "Easy" | "Medium" | "Hard"
  >("All");

  // Coding Specific

  const fetchQuestions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "questions"));
      const fetched: FirebaseCodingQuestion[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include if it looks like a coding question (has codeSnippets or specific structure)
        if (data.codeSnippets || data.sampleTestCases) {
          fetched.push({
            id: doc.id,
            questionId: data.questionId || `C-${doc.id.slice(0, 5)}`, // ✅ added
            title: data.title || "Untitled",
            topic: data.categoryTitle || "General",
            difficulty: data.difficulty || "Easy",
            languages: data.codeSnippets
              ? data.codeSnippets.map((s: { lang: string }) => s.lang)
              : ["Python"],
            testCases: data.sampleTestCases ? data.sampleTestCases.length : 0,
          });
        }
      });
      setFirebaseCodingQuestions(fetched);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleOpenEditDialog = (questionId: string) => {
    setEditingQuestionId(questionId);
    setIsEditDialogOpen(true);
  };

  const handleOpenImport = async () => {
    setIsImportDialogOpen(true);
    if (leetCodeProblems.length === 0) {
      setIsFetchingLeetCode(true);
      const problems = await fetchLeetCodeProblems();
      setLeetCodeProblems(problems);
      setIsFetchingLeetCode(false);
    }
  };

  const handleImportLeetCode = async (problem: LeetCodeProblem) => {
    try {
      const questionData = {
        ...mapLeetCodeToAppQuestion(problem),
        addedAt: serverTimestamp(),
      };
      await addDoc(collection(db, "questions"), questionData);
      alert(`Successfully imported ${problem.title}`);
      fetchQuestions();
    } catch (error) {
      console.error("Error importing LeetCode question:", error);
      alert("Failed to import question");
    }
  };

  const handleTakeTest = (questionId: string) => {
    navigate(`/admin/questions/playground/${questionId}`);
  };

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
          <Button variant="outline" onClick={handleOpenImport}>
            <Code className="w-4 h-4 mr-2" />
            Import LeetCode
          </Button>
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
          <Button variant="hero" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      <AddQuestion
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdded={fetchQuestions}
      />

      {/* Import LeetCode Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import from LeetCode</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search LeetCode problems..."
                className="pl-10"
                value={leetCodeSearch}
                onChange={(e) => setLeetCodeSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFetchingLeetCode ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                          <span>Fetching from LeetCode...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leetCodeProblems
                      .filter((p) =>
                        p.title
                          .toLowerCase()
                          .includes(leetCodeSearch.toLowerCase()),
                      )
                      .slice(0, 50)
                      .map((problem) => (
                        <TableRow key={problem.questionId}>
                          <TableCell>{problem.questionId}</TableCell>
                          <TableCell className="font-medium">
                            {problem.title}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                difficultyColors[
                                  mapLeetCodeToAppQuestion(problem)
                                    .difficulty as keyof typeof difficultyColors
                                ]
                              }
                            >
                              {mapLeetCodeToAppQuestion(problem).difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleImportLeetCode(problem)}
                            >
                              Import
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditQuestion
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingQuestionId(null);
          }
          setIsEditDialogOpen(open);
        }}
        questionId={editingQuestionId}
        onSaved={() => {
          fetchQuestions();
        }}
      />

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
      <Tabs defaultValue="mcq" className="w-full">
        <TabsList className="h-12">
          <TabsTrigger value="mcq" className="gap-2 px-6">
            <ListChecks className="w-4 h-4" />
            MCQ Questions
            <Badge variant="secondary" className="ml-1">
              890
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="coding" className="gap-2 px-6">
            <Code className="w-4 h-4" />
            Coding Questions
            <Badge variant="secondary" className="ml-1">
              {firebaseCodingQuestions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-[50%]">
                    Question
                  </TableHead>
                  <TableHead className="font-semibold">Topic</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mcqQuestions.map((q) => (
                  <TableRow
                    key={q.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">{q.question}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{q.topic}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          difficultyColors[
                            q.difficulty as keyof typeof difficultyColors
                          ]
                        }
                      >
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {q.createdAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="coding" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Q ID</TableHead>{" "}
                  {/* ✅ NEW */}
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Topic</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold">Languages</TableHead>
                  <TableHead className="font-semibold text-center">
                    Test Cases
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firebaseCodingQuestions
                  .filter(
                    (q) =>
                      difficultyFilter === "All" ||
                      q.difficulty === difficultyFilter,
                  )
                  .filter((q) =>
                    q.title.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .sort((a, b) => {
                    const aId = Number(a.questionId?.replace(/\D/g, "")) || 0;
                    const bId = Number(b.questionId?.replace(/\D/g, "")) || 0;
                    return aId - bId; // ✅ ascending
                  })
                  .map((q) => (
                    <TableRow
                      key={q.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          #{q.questionId}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{q.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.topic}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            difficultyColors[
                              q.difficulty as keyof typeof difficultyColors
                            ]
                          }
                        >
                          {q.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {q.languages.slice(0, 3).map((lang: string) => (
                            <Badge
                              key={lang}
                              variant="secondary"
                              className="text-xs"
                            >
                              {lang}
                            </Badge>
                          ))}
                          {q.languages.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{q.languages.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {q.testCases}
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
                              onSelect={() => handleTakeTest(q.id)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Solve Ques
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleOpenEditDialog(q.id)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
