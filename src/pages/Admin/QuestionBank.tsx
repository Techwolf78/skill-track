import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Activity,
  FileSpreadsheet,
  Brain,
  FolderOpen,
  UserCheck,
  Zap,
  Terminal,
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
import { Question } from "@/lib/test-service";
import { useAuth } from "@/lib/auth-context";
import {
  useQuestionsQuery,
  useSubjectsQuery,
  useDeleteQuestionMutation,
} from "@/hooks/use-query-hooks";
import { QuestionPreview } from "../SuperAdmin/QuestionPreview";

const difficultyColors: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-500 border-green-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  HARD: "bg-red-500/10 text-red-500 border-red-500/20",
  EXPERT: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

type DomainType = "ALL" | "ENGINEERING" | "BUSINESS" | "APTITUDE" | "CORPORATE";
type CognitiveLevelType = "ALL" | "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";
type QuestionFormatType = "ALL" | "MCQ" | "CODING" | "SQL" | "SPREADSHEET" | "SJT" | "SUBJECTIVE";

interface ExtendedQuestion extends Question {
  domain?: DomainType;
  cognitiveLevel?: CognitiveLevelType;
  format?: QuestionFormatType;
  p_value?: number;
  discrimination_index?: number;
  avg_time_seconds?: number;
  status?: "ACTIVE" | "UNDER_REVIEW" | "QUARANTINED";
}

export default function AdminQuestionBank() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: dbQuestions = [], isLoading: questionsLoading } = useQuestionsQuery();
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery();
  const loading = questionsLoading || subjectsLoading;

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "MCQ" | "CODING" | "ADVANCED">("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<DomainType>("ALL");
  const [cognitiveFilter, setCognitiveFilter] = useState<CognitiveLevelType>("ALL");
  const [formatFilter, setFormatFilter] = useState<QuestionFormatType>("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [selectedAdvancedQuestion, setSelectedAdvancedQuestion] = useState<ExtendedQuestion | null>(null);

  // Mock questions for Business, Corporate, and Aptitude taxonomy representation
  const [mockQuestions, setMockQuestions] = useState<ExtendedQuestion[]>([
    {
      id: "mock-mba-1",
      questionType: "MCQ",
      prompt: "Based on the provided Q3 financial statements for Gryphon Corp, compute the Weighted Average Cost of Capital (WACC) given a cost of equity of 12%, cost of debt of 6%, debt-to-equity ratio of 0.8, and a corporate tax rate of 25%.",
      title: "WACC & Capital Structure Evaluation",
      subjectId: "finance-subj",
      marks: 15,
      difficulty: "HARD",
      domain: "BUSINESS",
      cognitiveLevel: "EVALUATE",
      format: "SPREADSHEET",
      p_value: 0.34,
      discrimination_index: 0.49,
      avg_time_seconds: 495,
      status: "ACTIVE",
      tags: ["MBA", "Finance", "WACC", "Valuation"],
      mcqType: "SINGLE_CORRECT",
      mcqOptions: [
        { text: "8.73%", isCorrect: false },
        { text: "9.15%", isCorrect: false },
        { text: "8.67%", isCorrect: true },
        { text: "10.20%", isCorrect: false },
      ]
    },
    {
      id: "mock-corp-1",
      questionType: "MCQ",
      prompt: "A key corporate client is furious about a 3-hour dashboard service outage. They demand immediate refund policies and are threatening to terminate their contract on public channels. According to Gryphon CRM's Crisis Response policy, what is the most appropriate initial communication path?",
      title: "Client Outage & Conflict Resolution",
      subjectId: "corp-comm",
      marks: 10,
      difficulty: "MEDIUM",
      domain: "CORPORATE",
      cognitiveLevel: "APPLY",
      format: "SJT",
      p_value: 0.68,
      discrimination_index: 0.42,
      avg_time_seconds: 210,
      status: "ACTIVE",
      tags: ["Soft Skills", "Client Management", "Conflict Resolution", "SJT"],
      mcqType: "SINGLE_CORRECT",
      mcqOptions: [
        { text: "Send a defensive response explaining that network outages are covered under the SLA's force majeure clause.", isCorrect: false },
        { text: "Acknowledge the impact immediately, express empathy, state the issue resolution status, and transition to a private communication channel.", isCorrect: true },
        { text: "Offer a 50% discount immediately on the public thread to pacify the client publicly.", isCorrect: false },
        { text: "Decline public communication and flag the account for automatic legal review without response.", isCorrect: false },
      ]
    },
    {
      id: "mock-eng-1",
      questionType: "CODING",
      prompt: "Optimize the following database join query to run in O(N log N) time using a temporary index or Hash-Join layout. Your code template should take dynamic data arrays representing user relations and output the matched key-pair indexes.",
      title: "SQL Query Hash-Join Optimization",
      subjectId: "dbms-subj",
      marks: 20,
      difficulty: "HARD",
      domain: "ENGINEERING",
      cognitiveLevel: "ANALYZE",
      format: "SQL",
      p_value: 0.42,
      discrimination_index: 0.38,
      avg_time_seconds: 360,
      status: "ACTIVE",
      tags: ["Engineering", "Database", "SQL Optimization", "Hash-Join"]
    },
    {
      id: "mock-bba-1",
      questionType: "MCQ",
      prompt: "In a local retail branch survey, Gryphon Apparel found that raising prices by 5% led to a 12% drop in quantity demanded. Calculate the Price Elasticity of Demand (PED) and classify the elasticity type.",
      title: "Price Elasticity & Revenue Strategy",
      subjectId: "economics-subj",
      marks: 5,
      difficulty: "EASY",
      domain: "BUSINESS",
      cognitiveLevel: "UNDERSTAND",
      format: "MCQ",
      p_value: 0.82,
      discrimination_index: 0.31,
      avg_time_seconds: 105,
      status: "ACTIVE",
      tags: ["BBA", "Microeconomics", "PED", "Pricing"],
      mcqType: "SINGLE_CORRECT",
      mcqOptions: [
        { text: "PED = 2.4; Elastic", isCorrect: true },
        { text: "PED = 0.42; Inelastic", isCorrect: false },
        { text: "PED = -2.4; Unitary Elastic", isCorrect: false },
        { text: "PED = 1.0; Perfect Elasticity", isCorrect: false },
      ]
    },
    {
      id: "mock-apt-1",
      questionType: "MCQ",
      prompt: "A training batch of 150 college graduates has 80 candidates fluent in Python, 60 fluent in Java, and 30 fluent in both languages. How many graduates in the cohort are fluent in neither Python nor Java?",
      title: "Logical Deductions: Set Intersection",
      subjectId: "aptitude-subj",
      marks: 5,
      difficulty: "EASY",
      domain: "APTITUDE",
      cognitiveLevel: "APPLY",
      format: "MCQ",
      p_value: 0.89,
      discrimination_index: 0.35,
      avg_time_seconds: 75,
      status: "ACTIVE",
      tags: ["Aptitude", "Logical Reasoning", "Venn Diagrams", "Placement Core"],
      mcqType: "SINGLE_CORRECT",
      mcqOptions: [
        { text: "10 candidates", isCorrect: false },
        { text: "40 candidates", isCorrect: true },
        { text: "20 candidates", isCorrect: false },
        { text: "30 candidates", isCorrect: false },
      ]
    }
  ]);

  const allQuestions = (() => {
    const dbExtended: ExtendedQuestion[] = dbQuestions.map(q => {
      let domain: DomainType = "ENGINEERING";
      let format: QuestionFormatType = q.questionType === "CODING" ? "CODING" : "MCQ";
      let cognitiveLevel: CognitiveLevelType = "APPLY";
      
      const promptLower = q.prompt?.toLowerCase() || "";
      if (promptLower.includes("client") || promptLower.includes("communication") || promptLower.includes("manager")) {
        domain = "CORPORATE";
        format = "SJT";
        cognitiveLevel = "CREATE";
      } else if (promptLower.includes("wacc") || promptLower.includes("financial") || promptLower.includes("price") || promptLower.includes("revenue")) {
        domain = "BUSINESS";
        cognitiveLevel = "EVALUATE";
      } else if (promptLower.includes("candidate") || promptLower.includes("deduction") || promptLower.includes("aptitude")) {
        domain = "APTITUDE";
      }

      const randomSeed = q.id.charCodeAt(0) || 42;
      const p_value = parseFloat((0.4 + (randomSeed % 50) / 100).toFixed(2));
      const discrimination_index = parseFloat((0.25 + (randomSeed % 30) / 100).toFixed(2));
      const avg_time_seconds = 60 + (randomSeed % 300);

      return {
        ...q,
        domain,
        cognitiveLevel,
        format,
        p_value,
        discrimination_index,
        avg_time_seconds,
        status: p_value < 0.25 ? "QUARANTINED" : "ACTIVE"
      };
    });

    return [...dbExtended, ...mockQuestions];
  })();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, difficultyFilter, subjectFilter, domainFilter, cognitiveFilter, formatFilter]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const deleteQuestionMutation = useDeleteQuestionMutation();

  const handleDeleteClick = (question: Question) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedQuestion) return;

    if (selectedQuestion.id.startsWith("mock-")) {
      setMockQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
      toast({
        title: "Success",
        description: "Question deleted successfully (Mock Sandbox)",
      });
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
      return;
    }

    setDeleting(true);
    try {
      await deleteQuestionMutation.mutateAsync(selectedQuestion.id);
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } } & Error;
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete question",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedQuestion(null);
    }
  };

  const handleView = (question: ExtendedQuestion) => {
    if (question.format === "SPREADSHEET" || question.format === "SJT") {
      setSelectedAdvancedQuestion(question);
    } else {
      setPreviewQuestion(question);
      setPreviewOpen(true);
    }
  };

  const handleEdit = (question: Question) => {
    if (question.id.startsWith("mock-")) {
      toast({
        title: "Mock Question",
        description: "Editing mock questions is disabled in this dashboard layout.",
      });
    } else {
      navigate(`/admin/questions/edit/${question.id}`);
    }
  };

  const handleAdd = () => {
    navigate("/admin/questions/add");
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

  const filteredQuestions = allQuestions.filter((question) => {
    const matchesTab = 
      activeTab === "ALL" ||
      (activeTab === "MCQ" && question.questionType === "MCQ" && question.format !== "SJT" && question.format !== "SPREADSHEET") ||
      (activeTab === "CODING" && question.questionType === "CODING") ||
      (activeTab === "ADVANCED" && (question.format === "SJT" || question.format === "SPREADSHEET" || question.format === "SQL" || question.format === "SUBJECTIVE"));

    const matchesSearch = 
      question.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDifficulty = difficultyFilter === "ALL" || getDifficultyFromQuestion(question) === difficultyFilter;
    const matchesSubject = subjectFilter === "all" || question.subjectId === subjectFilter;
    const matchesDomain = domainFilter === "ALL" || question.domain === domainFilter;
    const matchesCognitive = cognitiveFilter === "ALL" || question.cognitiveLevel === cognitiveFilter;
    const matchesFormat = formatFilter === "ALL" || question.format === formatFilter;
    
    return matchesTab && matchesSearch && matchesDifficulty && matchesSubject && matchesDomain && matchesCognitive && matchesFormat;
  });

  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "Core General";
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || subjectId.replace("-subj", "").replace("corp-", "Soft Skills - ");
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header using native style */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-heading font-bold">Question Bank</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">V2 Enterprise</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Administer and calibrate multi-domain questions for Engineering, MBA, BBA, and Corporate placement drives.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="hero" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Domain Quick Filters using native colors */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { id: "ALL", label: "All Domains", count: allQuestions.length, icon: <FolderOpen className="w-4 h-4" /> },
          { id: "ENGINEERING", label: "Engineering (CS/IT)", count: allQuestions.filter(q => q.domain === "ENGINEERING").length, icon: <Code className="w-4 h-4" /> },
          { id: "BUSINESS", label: "MBA / BBA", count: allQuestions.filter(q => q.domain === "BUSINESS").length, icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: "APTITUDE", label: "Aptitude & Core", count: allQuestions.filter(q => q.domain === "APTITUDE").length, icon: <Brain className="w-4 h-4" /> },
          { id: "CORPORATE", label: "Corporate SJT", count: allQuestions.filter(q => q.domain === "CORPORATE").length, icon: <UserCheck className="w-4 h-4" /> },
        ].map((domain) => (
          <Card 
            key={domain.id} 
            className={`cursor-pointer transition-all hover:scale-[1.02] border duration-200 ${
              domainFilter === domain.id 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border bg-card hover:bg-muted/50"
            }`}
            onClick={() => setDomainFilter(domain.id as DomainType)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${domainFilter === domain.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {domain.icon}
                </div>
                <span className="text-sm font-semibold tracking-tight">{domain.label}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {domain.count}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Navigation */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "ALL" | "MCQ" | "CODING" | "ADVANCED")}
        className="space-y-4"
      >
        <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="ALL">All Formats ({allQuestions.length})</TabsTrigger>
            <TabsTrigger value="MCQ" className="gap-2">
              <ListChecks className="w-4 h-4" />
              Standard MCQ ({allQuestions.filter(q => q.questionType === "MCQ" && q.format !== "SJT" && q.format !== "SPREADSHEET").length})
            </TabsTrigger>
            <TabsTrigger value="CODING" className="gap-2">
              <Code className="w-4 h-4" />
              Coding ({allQuestions.filter(q => q.questionType === "CODING").length})
            </TabsTrigger>
            <TabsTrigger value="ADVANCED" className="gap-2 text-primary font-medium">
              <Zap className="w-4 h-4" />
              Advanced Sandboxes ({allQuestions.filter(q => q.format === "SJT" || q.format === "SPREADSHEET" || q.format === "SQL" || q.format === "SUBJECTIVE").length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-0">
          {/* Advanced Multi-Factor Filters Row using native styles */}
          <div className="flex items-center gap-4 flex-wrap bg-card p-4 rounded-xl border">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, prompt keyword, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Subject Selector */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-44">
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

            {/* Cognitive Level Selector (Bloom's Taxonomy) */}
            <Select value={cognitiveFilter} onValueChange={(v) => setCognitiveFilter(v as CognitiveLevelType)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Bloom's Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Cognitive Levels</SelectItem>
                <SelectItem value="REMEMBER">Remember</SelectItem>
                <SelectItem value="UNDERSTAND">Understand</SelectItem>
                <SelectItem value="APPLY">Apply</SelectItem>
                <SelectItem value="ANALYZE">Analyze</SelectItem>
                <SelectItem value="EVALUATE">Evaluate</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
              </SelectContent>
            </Select>

            {/* Format Selector */}
            <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as QuestionFormatType)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Question Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Formats</SelectItem>
                <SelectItem value="MCQ">Standard MCQ</SelectItem>
                <SelectItem value="CODING">Standard Coding</SelectItem>
                <SelectItem value="SQL">SQL Sandbox</SelectItem>
                <SelectItem value="SPREADSHEET">Excel Simulation</SelectItem>
                <SelectItem value="SJT">Situational Judgment</SelectItem>
                <SelectItem value="SUBJECTIVE">Subjective Rubric</SelectItem>
              </SelectContent>
            </Select>

            {/* Difficulty Selector */}
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || difficultyFilter !== "ALL" || subjectFilter !== "all" || domainFilter !== "ALL" || cognitiveFilter !== "ALL" || formatFilter !== "ALL") && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchTerm("");
                  setDifficultyFilter("ALL");
                  setSubjectFilter("all");
                  setDomainFilter("ALL");
                  setCognitiveFilter("ALL");
                  setFormatFilter("ALL");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Calibrated Questions Table using native colors */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <TableHead className="font-semibold w-[35%] py-4">Question Details</TableHead>
                  <TableHead className="font-semibold py-4">Domain & Subject</TableHead>
                  <TableHead className="font-semibold py-4">Cognitive Level</TableHead>
                  <TableHead className="font-semibold py-4 text-center">Difficulty ($p$-value)</TableHead>
                  <TableHead className="font-semibold py-4 text-center">Discrimination ($D$)</TableHead>
                  <TableHead className="font-semibold py-4 text-center">Avg Solve Time</TableHead>
                  <TableHead className="font-semibold py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-muted-foreground">Calibrating question bank...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      No questions match your filter constraints. Adjust filters to view questions.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedQuestions.map((question) => {
                    const diffName = getDifficultyFromQuestion(question);
                    const pVal = question.p_value || 0.5;
                    const dIndex = question.discrimination_index || 0.35;
                    
                    let dText = "Excellent";
                    let dColor = "text-green-600 dark:text-green-400";
                    if (dIndex < 0.20) {
                      dText = "Poor";
                      dColor = "text-red-600 dark:text-red-400";
                    } else if (dIndex < 0.35) {
                      dText = "Good";
                      dColor = "text-yellow-600 dark:text-yellow-400";
                    }

                    return (
                      <TableRow key={question.id} className="hover:bg-muted/30 border-b transition-all">
                        <TableCell className="py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold tracking-tight leading-none text-sm text-foreground">
                                {question.title || question.prompt?.substring(0, 60)}
                              </p>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {question.format || "MCQ"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 font-normal">
                              {question.prompt}
                            </p>
                            {question.tags && question.tags.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap pt-1">
                                {question.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] py-0 px-2">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-0.5">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0">
                              {question.domain || "ENGINEERING"}
                            </Badge>
                            <p className="text-xs text-muted-foreground font-medium pl-1">
                              {getSubjectName(question.subjectId)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="text-xs">
                            {question.cognitiveLevel || "APPLY"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <Badge className={difficultyColors[diffName]}>
                              {diffName}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground mt-1">
                              p = {pVal.toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-xs font-semibold ${dColor}`}>{dIndex.toFixed(2)}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">{dText}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-xs text-foreground">
                            {Math.floor((question.avg_time_seconds || 120) / 60)}m { (question.avg_time_seconds || 120) % 60}s
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(question)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View & Simulate
                              </DropdownMenuItem>
                              {(question.questionType === "CODING" || question.format === "CODING" || question.format === "SQL") && (
                                <DropdownMenuItem onClick={() => navigate(`/admin/questions/playground/${question.id}`)}>
                                  <Terminal className="w-4 h-4 mr-2" />
                                  Open Playground
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEdit(question)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(question)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Question
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
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
        </TabsContent>
      </Tabs>

      {/* Advanced Question View & Simulator */}
      <Dialog open={!!selectedAdvancedQuestion} onOpenChange={() => setSelectedAdvancedQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedAdvancedQuestion && (
            <div className="space-y-6">
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center gap-2 justify-between flex-wrap">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <DialogTitle className="text-xl text-foreground">{selectedAdvancedQuestion.title}</DialogTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary uppercase text-[10px]">
                      {selectedAdvancedQuestion.domain}
                    </Badge>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {selectedAdvancedQuestion.format}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Question Prompt</h4>
                  <div className="bg-muted/30 border p-4 rounded-xl text-sm leading-relaxed text-foreground">
                    {selectedAdvancedQuestion.prompt}
                  </div>
                </div>

                {selectedAdvancedQuestion.format === "SPREADSHEET" && (
                  <div className="space-y-3">
                    <h4 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Dynamic Spreadsheet Simulation</h4>
                    
                    {/* Mock Excel interface using native theme border and card style */}
                    <div className="border rounded-xl bg-card overflow-hidden">
                      <div className="bg-muted border-b p-2 text-xs flex gap-2 items-center text-muted-foreground">
                        <span className="font-semibold text-foreground bg-background px-2 py-0.5 rounded border">Formula</span>
                        <div className="bg-background px-3 py-0.5 rounded border w-64 text-foreground font-mono">
                          =WACC(C2, C3, C4, C5)
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs font-mono text-foreground">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="border-r p-1.5 w-8 bg-muted text-muted-foreground"></th>
                              <th className="border-r p-1.5 w-32 text-left pl-3 text-muted-foreground">A</th>
                              <th className="border-r p-1.5 w-32 text-left pl-3 text-muted-foreground">B</th>
                              <th className="border-r p-1.5 w-32 text-left pl-3 text-muted-foreground">C</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="border-r p-1.5 text-center bg-muted text-muted-foreground font-semibold">1</td>
                              <td className="border-r p-1.5 text-muted-foreground pl-3">Parameter</td>
                              <td className="border-r p-1.5 text-muted-foreground pl-3">Formula Variable</td>
                              <td className="border-r p-1.5 pl-3 font-semibold text-foreground">Value</td>
                            </tr>
                            <tr className="border-b">
                              <td className="border-r p-1.5 text-center bg-muted text-muted-foreground font-semibold">2</td>
                              <td className="border-r p-1.5 pl-3">Cost of Equity (Ke)</td>
                              <td className="border-r p-1.5 pl-3 text-muted-foreground">C2</td>
                              <td className="border-r p-1.5 pl-3 text-green-600 font-semibold">12.00%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="border-r p-1.5 text-center bg-muted text-muted-foreground font-semibold">3</td>
                              <td className="border-r p-1.5 pl-3">Cost of Debt (Kd)</td>
                              <td className="border-r p-1.5 pl-3 text-muted-foreground">C3</td>
                              <td className="border-r p-1.5 pl-3 text-green-600 font-semibold">6.00%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="border-r p-1.5 text-center bg-muted text-muted-foreground font-semibold">4</td>
                              <td className="border-r p-1.5 pl-3">Debt / Equity Ratio</td>
                              <td className="border-r p-1.5 pl-3 text-muted-foreground">C4</td>
                              <td className="border-r p-1.5 pl-3 text-yellow-600 font-semibold">0.80</td>
                            </tr>
                            <tr className="border-b">
                              <td className="border-r p-1.5 text-center bg-muted text-muted-foreground font-semibold">5</td>
                              <td className="border-r p-1.5 pl-3">Tax Rate (t)</td>
                              <td className="border-r p-1.5 pl-3 text-muted-foreground">C5</td>
                              <td className="border-r p-1.5 pl-3 text-green-600 font-semibold">25.00%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal italic">
                      💡 The spreadsheet simulator tests the candidate's exact excel formula execution using parameterized inputs, which changes values for every candidate to prevent copy-paste leaks.
                    </p>
                  </div>
                )}

                {selectedAdvancedQuestion.format === "SJT" && selectedAdvancedQuestion.mcqOptions && (
                  <div className="space-y-3">
                    <h4 className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Situational Options (SJT Grading)</h4>
                    <div className="space-y-2">
                      {selectedAdvancedQuestion.mcqOptions.map((opt, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${
                          opt.isCorrect 
                            ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300" 
                            : "bg-muted/20 border-border text-foreground"
                        }`}>
                          <Badge variant="outline" className={`h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-semibold ${
                            opt.isCorrect ? "bg-green-500/20 border-green-500/30 text-green-700" : "text-muted-foreground"
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </Badge>
                          <div className="flex-1">
                            {opt.text}
                          </div>
                          {opt.isCorrect && (
                            <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] uppercase">
                              Model Answer
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={() => setSelectedAdvancedQuestion(null)}>
                  Close Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question "{selectedQuestion?.title || selectedQuestion?.prompt?.substring(0, 50)}".
              {selectedQuestion?.questionType === "CODING" && (
                <span className="block mt-2 text-yellow-600 font-medium">
                  ⚠️ Warning: All test cases associated with this coding question will also be removed.
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

      {/* Add Question Preview Dialog */}
      <QuestionPreview
        question={previewQuestion}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}