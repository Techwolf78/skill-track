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
  FolderTree,
  Trophy,
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
  DialogDescription,
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
import {
  testService,
  Subject,
  Question,
  Topic,
  Subtopic,
} from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "All" | "Easy" | "Medium" | "Hard" | "EASY" | "MEDIUM" | "HARD"
  >("All");
  const [tagSearch, setTagSearch] = useState("");

  // Filter states
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterSubtopic, setFilterSubtopic] = useState<string>("all");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Fetch questions and subjects from backend
  const fetchData = async () => {
    try {
      setLoading(true);

      const [allQuestions, allSubjects, allTopics, allSubtopics] =
        await Promise.all([
          testService.getAllQuestions(),
          testService.getAllSubjects(),
          testService.getAllTopics(),
          testService.getAllSubtopics(),
        ]);

      setQuestions(allQuestions);
      setSubjects(allSubjects);
      setTopics(allTopics);
      setSubtopics(allSubtopics);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load questions";
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: errorMessage,
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
      console.error("Failed to delete question:", error);

      // Handle the 400 Bad Request with IllegalStateException for test usage
      const errorData = error.response?.data;
      const errorMessage =
        errorData?.message || error.message || "Failed to delete question";

      toast({
        title: "Deletion Restricted",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/superadmin/questions/edit/${id}`);
  };

  const handlePreview = (question: Question) => {
    // Show preview dialog
    toast({
      title: "Question Preview",
      description: question.prompt,
    });
  };

  const handleSolve = (id: string) => {
    navigate(`/superadmin/questions/playground/${id}`);
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "No Subject";
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || "Unknown";
  };

  const getTopicName = (topicId?: string) => {
    if (!topicId) return "No Topic";
    const topic = topics.find((t) => t.id === topicId);
    return topic?.name || "Unknown";
  };

  const getSubtopicName = (subtopicId?: string) => {
    if (!subtopicId) return "No Subtopic";
    const subtopic = subtopics.find((s) => s.id === subtopicId);
    return subtopic?.name || "Unknown";
  };

  const getDifficultyFromQuestion = (question: Question): string => {
    if (question.difficulty) return question.difficulty;
    // Fallback based on marks
    if (question.marks) {
      if (question.marks <= 2) return "EASY";
      if (question.marks <= 5) return "MEDIUM";
      return "HARD";
    }
    return "MEDIUM";
  };

  const getDifficultyColor = (difficulty: string) => {
    const d = difficulty?.toUpperCase();
    if (d === "EASY") return difficultyColors.Easy;
    if (d === "MEDIUM") return difficultyColors.Medium;
    if (d === "HARD") return difficultyColors.Hard;
    return difficultyColors.Medium;
  };

  // Apply filters to questions
  const filterQuestions = (questionsList: Question[]) => {
    return questionsList.filter((q) => {
      // Search filter
      const matchesSearch =
        q.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.title && q.title.toLowerCase().includes(searchTerm.toLowerCase()));

      // Tag search filter
      const matchesTags =
        !tagSearch ||
        (q.tags &&
          q.tags.some((tag) =>
            tag.toLowerCase().includes(tagSearch.toLowerCase()),
          ));

      // Subject filter
      const matchesSubject =
        filterSubject === "all" || q.subjectId === filterSubject;

      // Topic filter
      const matchesTopic = filterTopic === "all" || q.topicId === filterTopic;

      // Subtopic filter
      const matchesSubtopic =
        filterSubtopic === "all" || q.subtopicId === filterSubtopic;

      // Difficulty filter
      const qDifficulty = getDifficultyFromQuestion(q)?.toUpperCase();
      const fDifficulty = difficultyFilter?.toUpperCase();
      const matchesDifficulty =
        difficultyFilter === "All" || qDifficulty === fDifficulty;

      return (
        matchesSearch &&
        matchesTags &&
        matchesSubject &&
        matchesTopic &&
        matchesSubtopic &&
        matchesDifficulty
      );
    });
  };

  // Get available topics for selected subject
  const getTopicsForSubject = (subjectId: string) => {
    if (subjectId === "all") return topics;
    return topics.filter((t) => t.subjectId === subjectId);
  };

  // Get available subtopics for selected topic
  const getSubtopicsForTopic = (topicId: string) => {
    if (topicId === "all") return subtopics;
    return subtopics.filter((s) => s.topicId === topicId);
  };

  // Handle subject filter change
  const handleSubjectFilterChange = (subjectId: string) => {
    setFilterSubject(subjectId);
    setFilterTopic("all");
    setFilterSubtopic("all");
  };

  // Handle topic filter change
  const handleTopicFilterChange = (topicId: string) => {
    setFilterTopic(topicId);
    setFilterSubtopic("all");
  };

  // Reset all filters
  const resetFilters = () => {
    setFilterSubject("all");
    setFilterTopic("all");
    setFilterSubtopic("all");
    setDifficultyFilter("All");
    setSearchTerm("");
  };

  // Filter MCQ questions (type === "MCQ")
  const mcqQuestions = questions.filter((q) => q.questionType === "MCQ");
  const filteredMCQ = filterQuestions(mcqQuestions);

  // Filter Coding questions (type === "CODING")
  const codingQuestions = questions.filter((q) => q.questionType === "CODING");
  const filteredCoding = filterQuestions(codingQuestions);

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Manage your MCQ and coding questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setFilterDialogOpen(true)}>
            <Search className="w-4 h-4 mr-2" />
            Advanced Filters
            {(filterSubject !== "all" ||
              filterTopic !== "all" ||
              filterSubtopic !== "all" ||
              difficultyFilter !== "All") && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/superadmin/subjects/manage")}
          >
            <FolderTree className="w-4 h-4 mr-2" />
            Manage Subjects
          </Button>
          <Button
            variant="hero"
            onClick={() => navigate("/superadmin/questions/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions by text or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative w-full max-w-xs">
          <Input
            placeholder="Search by tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {(filterSubject !== "all" ||
        filterTopic !== "all" ||
        filterSubtopic !== "all" ||
        difficultyFilter !== "All") && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterSubject !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Subject: {getSubjectName(filterSubject)}
            </Badge>
          )}
          {filterTopic !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Topic: {getTopicName(filterTopic)}
            </Badge>
          )}
          {filterSubtopic !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Subtopic: {getSubtopicName(filterSubtopic)}
            </Badge>
          )}
          {difficultyFilter !== "All" && (
            <Badge variant="secondary" className="gap-1">
              Difficulty: {difficultyFilter}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2"
          >
            Clear all
          </Button>
        </div>
      )}

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
              {filteredMCQ.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="coding" className="gap-2 px-6">
            <Code className="w-4 h-4" />
            Coding Questions
            <Badge variant="secondary" className="ml-1">
              {filteredCoding.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* MCQ Tab */}
        <TabsContent value="mcq" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-[40%]">
                    Question
                  </TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold">Marks</TableHead>
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
                      colSpan={6}
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
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span className="line-clamp-2">
                            {q.title || q.prompt}
                          </span>
                          {q.tags && q.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {q.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getSubjectName(q.subjectId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(
                            getDifficultyFromQuestion(q),
                          )}
                        >
                          {getDifficultyFromQuestion(q)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{q.marks || 0} marks</Badge>
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
        {/* Coding Tab */}
        <TabsContent value="coding" className="mt-6">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                  <TableHead className="font-bold text-xs uppercase tracking-wider py-4 pl-6">
                    Title
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider py-4">
                    Subject / Topic
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider py-4">
                    Difficulty
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider py-4">
                    Marks
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider py-4 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoding.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-20 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Code className="w-10 h-10 opacity-20" />
                        <p>No coding questions found matching your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoding.map((q, index) => (
                    <TableRow
                      key={q.id}
                      className={cn(
                        "group transition-all hover:bg-muted/50 border-b last:border-0",
                        index % 2 === 0 ? "bg-background" : "bg-muted/10",
                      )}
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
                            onClick={() => handleSolve(q.id)}
                          >
                            {index + 1}. {q.title || q.prompt}
                          </span>
                          {q.tags && q.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {q.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium border border-border/50"
                                >
                                  {tag}
                                </span>
                              ))}
                              {q.tags.length > 3 && (
                                <span className="text-[10px] text-muted-foreground pl-1">
                                  +{q.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">
                            {getSubjectName(q.subjectId)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {getTopicName(q.topicId)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span
                          className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-full border",
                            getDifficultyColor(getDifficultyFromQuestion(q)),
                          )}
                        >
                          {getDifficultyFromQuestion(q)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                          {q.marks || 0}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right pr-6">
                        {/* REMOVED opacity-0 group-hover:opacity-100 - Now always visible */}
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleSolve(q.id)}
                            title="Open Playground"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(q.id)}
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onSelect={() => handlePreview(q)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onSelect={() => handleDelete(q.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Advanced Filters Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>
              Filter questions by subject, topic, or subtopic
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={filterSubject}
                onValueChange={handleSubjectFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Select
                value={filterTopic}
                onValueChange={handleTopicFilterChange}
                disabled={filterSubject === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {getTopicsForSubject(filterSubject).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subtopic</Label>
              <Select
                value={filterSubtopic}
                onValueChange={setFilterSubtopic}
                disabled={filterTopic === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subtopics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subtopics</SelectItem>
                  {getSubtopicsForTopic(filterTopic).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficultyFilter}
                onValueChange={(v) => setDifficultyFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Difficulties</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilters} className="flex-1">
              Reset All
            </Button>
            <Button
              onClick={() => setFilterDialogOpen(false)}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Label component since it's missing
const Label = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <label
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
  >
    {children}
  </label>
);
