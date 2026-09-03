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
  FolderTree,
  FolderOpen,
  UserCheck,
  Zap,
  Terminal,
  Upload,
  FileCode,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { Question, CreateQuestionRequest, McqOption } from "@/lib/test-service";
import { authService } from "@/lib/auth-service";
import {
  useQuestionsQuery,
  useSubjectsQuery,
  useTopicsQuery,
  useSubtopicsQuery,
  useDeleteQuestionMutation,
  useBulkCreateQuestionsMutation,
} from "@/hooks/use-query-hooks";
import {
  ParsedQuestionRow,
  TaxonomyContext,
  parseImportRow,
  generateDynamicExcelTemplate,
  generateCodingExcelTemplate,
  resolveTaxonomyForRow,
} from "@/lib/admin/questionImport";
import { QuestionPreview } from "./QuestionPreview";

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
  format?: QuestionFormatType;
}

export default function SuperAdminQuestionBank() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentUser = authService.getCurrentUser();
  const isSuperAdmin = currentUser?.role === "SUPERADMIN";

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Mock questions for Business, Corporate, and Aptitude taxonomy representation
  const [mockQuestions, setMockQuestions] = useState<ExtendedQuestion[]>([]);

  const allQuestions = (() => {
    const dbExtended: ExtendedQuestion[] = dbQuestions.map(q => {
      let domain: Question['domain'] = q.domain || "ENGINEERING";
      let cognitiveLevel: Question['cognitiveLevel'] = q.cognitiveLevel || "APPLY";
      const status = q.status || "ACTIVE";
      
      let format: QuestionFormatType = q.questionType === "CODING" ? "CODING" : "MCQ";
      
      const promptLower = q.prompt?.toLowerCase() || "";
      const titleLower = q.title?.toLowerCase() || "";
      if (promptLower.includes("client") || promptLower.includes("communication") || promptLower.includes("conflict") || promptLower.includes("outage") || titleLower.includes("conflict")) {
        domain = q.domain || "CORPORATE";
        format = "SJT";
        cognitiveLevel = q.cognitiveLevel || "APPLY";
      } else if (promptLower.includes("wacc") || promptLower.includes("financial") || promptLower.includes("price") || promptLower.includes("revenue") || titleLower.includes("wacc")) {
        domain = q.domain || "BUSINESS";
        format = (promptLower.includes("wacc") || titleLower.includes("wacc")) ? "SPREADSHEET" : "MCQ";
        cognitiveLevel = q.cognitiveLevel || "EVALUATE";
      } else if (promptLower.includes("candidate") || promptLower.includes("deduction") || promptLower.includes("aptitude") || titleLower.includes("intersection") || titleLower.includes("deduction")) {
        domain = q.domain || "APTITUDE";
      }
      
      if (q.questionType === "CODING" && (promptLower.includes("sql") || promptLower.includes("database join") || promptLower.includes("hash-join") || titleLower.includes("sql"))) {
        format = "SQL";
      }

      const randomSeed = q.id.charCodeAt(0) || 42;
      const p_value = q.p_value !== undefined && q.p_value !== null ? q.p_value : parseFloat((0.4 + (randomSeed % 50) / 100).toFixed(2));
      const discrimination_index = q.discrimination_index !== undefined && q.discrimination_index !== null ? q.discrimination_index : parseFloat((0.25 + (randomSeed % 30) / 100).toFixed(2));
      const avg_time_seconds = q.avg_time_seconds !== undefined && q.avg_time_seconds !== null ? q.avg_time_seconds : 60 + (randomSeed % 300);

      return {
        ...q,
        domain,
        cognitiveLevel,
        format,
        p_value,
        discrimination_index,
        avg_time_seconds,
        status: q.status || (p_value < 0.25 ? "QUARANTINED" : "ACTIVE")
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

  const canMutateQuestion = (q: Question) => {
    if (isSuperAdmin) return true;
    if (q.visibility === "PUBLIC") return false;
    return true;
  };

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
      navigate(`/superadmin/questions/edit/${question.id}`);
    }
  };

  const handleAdd = () => {
    navigate("/superadmin/questions/add");
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
            <h1 className="text-3xl font-heading font-bold">SuperAdmin Question Bank</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Global Enterprise Management</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Control, audit, and calibrate global questions across Engineering, MBA, BBA, and Corporate clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/superadmin/subjects/manage")}
            className="gap-2"
          >
            <FolderTree className="w-4 h-4" />
            Manage Subjects
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Questions
          </Button>
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
                    const pVal = question.p_value ?? 0.5;
                    const dIndex = question.discrimination_index ?? 0.35;
                    
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold tracking-tight leading-none text-sm text-foreground">
                                {question.title || (question.prompt ? question.prompt.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().substring(0, 60) : "")}
                              </p>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {question.format || "MCQ"}
                              </Badge>

                              {/* Lifecycle Status and Verification Chips for Coding */}
                              {((question.questionType ?? "").toUpperCase() === "CODING" || question.format === "CODING") && (
                                <>
                                  <Badge variant="outline" className="text-[10px] py-0 bg-muted/50 text-muted-foreground border-border font-medium">
                                    {question.status === "UNDER_REVIEW" ? "Under Review" : "Active"}
                                  </Badge>

                                  {question.isLanguageSpecific && (
                                    <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground bg-muted/30">
                                      Single-Lang
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 font-normal">
                              {question.prompt ? question.prompt.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : ""}
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
                            {Math.floor((question.avg_time_seconds ?? 120) / 60)}m { (question.avg_time_seconds ?? 120) % 60}s
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
                                <DropdownMenuItem onClick={() => navigate(`/superadmin/questions/playground/${question.id}`)}>
                                  <Terminal className="w-4 h-4 mr-2" />
                                  Open Playground
                                </DropdownMenuItem>
                              )}
                              {canMutateQuestion(question) && (
                                <DropdownMenuItem onClick={() => handleEdit(question)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Settings
                                </DropdownMenuItem>
                              )}
                              {canMutateQuestion(question) && (
                                <DropdownMenuItem 
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick(question)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Question
                                </DropdownMenuItem>
                              )}
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

      {/* SuperAdmin Bulk Import Questions Dialog */}
      <SuperAdminImportQuestionsDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportSuccess={() => {
          // Questions query will automatically refetch
        }}
      />
    </div>
  );
}

// ─── SuperAdmin Import Questions Dialog (PUBLIC Visibility) ──────────────────

function SuperAdminImportQuestionsDialog({
  isOpen,
  onClose,
  onImportSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}) {
  const { data: subjects = [] } = useSubjectsQuery();
  const { data: allTopics = [] } = useTopicsQuery();
  const { data: allSubtopics = [] } = useSubtopicsQuery();
  const bulkCreateMutation = useBulkCreateQuestionsMutation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"FILE" | "JSON">("FILE");
  const [defaultSubjectId, setDefaultSubjectId] = useState<string>("");
  const [defaultTopicId, setDefaultTopicId] = useState<string>("");
  const [defaultSubtopicId, setDefaultSubtopicId] = useState<string>("");

  const [jsonText, setJsonText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedQuestionRow[]>([]);
  const [rawFileRows, setRawFileRows] = useState<any[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Set initial default subject
  useEffect(() => {
    if (subjects.length > 0 && !defaultSubjectId) {
      setDefaultSubjectId(subjects[0].id);
    }
  }, [subjects, defaultSubjectId]);

  // Cascading topics filtered by selected default subject
  const availableDefaultTopics = subjects.length > 0 && defaultSubjectId
    ? allTopics.filter((t) => t.subjectId === defaultSubjectId || (t.subject && t.subject.id === defaultSubjectId))
    : [];

  // Cascading subtopics filtered by selected default topic
  const availableDefaultSubtopics = defaultTopicId
    ? allSubtopics.filter((st) => st.topicId === defaultTopicId || (st.topic && st.topic.id === defaultTopicId))
    : [];

  // Helper to re-parse rows when default taxonomy fallbacks change
  const reparseRowsWithContext = (
    subId: string,
    topId: string,
    subtopId: string,
    sourceRows: any[]
  ) => {
    const context: TaxonomyContext = {
      subjects,
      topics: allTopics,
      subtopics: allSubtopics,
      fallbackSubjectId: subId,
      fallbackTopicId: topId || undefined,
      fallbackSubtopicId: subtopId || undefined,
    };

    const nextRows: ParsedQuestionRow[] = [];
    for (let i = 0; i < sourceRows.length; i++) {
      const parsed = parseImportRow(sourceRows[i], i + 1, context, "PUBLIC");
      if (parsed) nextRows.push(parsed);
    }
    setParsedRows(nextRows);
    setJsonText(JSON.stringify(nextRows.map((r) => r.question), null, 2));
  };

  const handleDefaultSubjectChange = (newSubId: string) => {
    setDefaultSubjectId(newSubId);
    setDefaultTopicId("");
    setDefaultSubtopicId("");
    if (rawFileRows && rawFileRows.length > 0) {
      reparseRowsWithContext(newSubId, "", "", rawFileRows);
    }
  };

  const handleDefaultTopicChange = (newTopId: string) => {
    setDefaultTopicId(newTopId);
    setDefaultSubtopicId("");
    if (rawFileRows && rawFileRows.length > 0) {
      reparseRowsWithContext(defaultSubjectId, newTopId, "", rawFileRows);
    }
  };

  const handleDefaultSubtopicChange = (newSubtopId: string) => {
    setDefaultSubtopicId(newSubtopId);
    if (rawFileRows && rawFileRows.length > 0) {
      reparseRowsWithContext(defaultSubjectId, defaultTopicId, newSubtopId, rawFileRows);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);

    const isJson = file.name.endsWith(".json");
    const reader = new FileReader();

    if (isJson) {
      reader.onload = (evt) => {
        try {
          const raw = JSON.parse(evt.target?.result as string);
          const list = Array.isArray(raw) ? raw : [raw];
          setRawFileRows(list);
          reparseRowsWithContext(defaultSubjectId, defaultTopicId, defaultSubtopicId, list);
        } catch (err: any) {
          setParseError("Invalid JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);

          if (!rows.length) {
            setParseError("The uploaded Excel sheet contains no rows.");
            return;
          }

          setRawFileRows(rows);
          reparseRowsWithContext(defaultSubjectId, defaultTopicId, defaultSubtopicId, rows);
        } catch (err: any) {
          setParseError("Failed to parse Excel file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle JSON Textarea Change
  const handleJsonChange = (text: string) => {
    setJsonText(text);
    setParseError(null);
    if (!text.trim()) {
      setParsedRows([]);
      setRawFileRows(null);
      return;
    }
    try {
      const raw = JSON.parse(text);
      const list = Array.isArray(raw) ? raw : [raw];
      setRawFileRows(list);
      reparseRowsWithContext(defaultSubjectId, defaultTopicId, defaultSubtopicId, list);
    } catch {
      setParseError("Invalid JSON syntax");
    }
  };

  // Inline row topic mapping
  const handleRowTopicChange = (rowIndex: number, newTopicId: string) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[rowIndex] };
      const matchedTopic = allTopics.find((t) => t.id === newTopicId);

      target.taxonomy = {
        ...target.taxonomy,
        topicId: newTopicId || undefined,
        topicName: matchedTopic?.name,
        topicStatus: newTopicId ? "MATCHED" : "NONE",
        // Reset subtopic if topic changed
        subtopicId: undefined,
        subtopicName: undefined,
        subtopicStatus: "NONE",
      };

      target.question = {
        ...target.question,
        topic_id: newTopicId || undefined,
        subtopic_id: undefined,
      };

      copy[rowIndex] = target;
      return copy;
    });
  };

  // Inline row subtopic mapping
  const handleRowSubtopicChange = (rowIndex: number, newSubtopicId: string) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[rowIndex] };
      const matchedSubtopic = allSubtopics.find((st) => st.id === newSubtopicId);

      target.taxonomy = {
        ...target.taxonomy,
        subtopicId: newSubtopicId || undefined,
        subtopicName: matchedSubtopic?.name,
        subtopicStatus: newSubtopicId ? "MATCHED" : "NONE",
      };

      target.question = {
        ...target.question,
        subtopic_id: newSubtopicId || undefined,
      };

      copy[rowIndex] = target;
      return copy;
    });
  };

  // Download DoSelect Sample Excel
  const downloadDoSelectSampleExcel = () => {
    const a = document.createElement("a");
    a.href = "/doselect_sample_questions.xlsx";
    a.download = "doselect_sample_questions.xlsx";
    a.click();
  };

  // Download Dynamic Standard Sample Excel
  const downloadDynamicExcel = () => {
    const wb = generateDynamicExcelTemplate({
      subjects,
      topics: allTopics,
      subtopics: allSubtopics,
    });
    XLSX.writeFile(wb, "superadmin_question_template.xlsx");
  };

  // Download Dynamic Coding Sample Excel
  const downloadSampleCodingExcel = () => {
    const wb = generateCodingExcelTemplate({
      subjects,
      topics: allTopics,
      subtopics: allSubtopics,
    });
    XLSX.writeFile(wb, "superadmin_coding_template.xlsx");
  };

  // Download Sample JSON
  const downloadSampleJson = () => {
    const sampleSub = subjects[0]?.name || "Computer Science";
    const sampleTop = allTopics.find((t) => subjects[0] && (t.subjectId === subjects[0].id || t.subject?.id === subjects[0].id))?.name || "Data Structures";

    const sampleJson = [
      {
        questionType: "MCQ",
        title: "Thread Safety in Java HashMap",
        subject: sampleSub,
        topic: sampleTop,
        prompt: "Which data structure provides synchronized thread-safe access in Java collections?",
        difficulty: "MEDIUM",
        marks: 3,
        visibility: "PUBLIC",
        mcqType: "SINGLE_CORRECT",
        multipleCorrect: false,
        shuffleOptions: true,
        tags: ["java", "concurrency"],
        avg_time_seconds: 90,
        mcqOptions: [
          { text: "ConcurrentHashMap", isCorrect: true },
          { text: "HashMap", isCorrect: false },
          { text: "TreeMap", isCorrect: false },
          { text: "WeakHashMap", isCorrect: false },
        ],
      },
      {
        questionType: "CODING",
        title: "LRU Cache Implementation",
        subject: sampleSub,
        topic: sampleTop,
        prompt: "Design a data structure that follows the constraints of a Least Recently Used (LRU) Cache.\n\nImplement the LRUCache class with get and put methods in O(1) time complexity.",
        difficulty: "HARD",
        marks: 10,
        visibility: "PUBLIC",
        timeLimitSecs: 3,
        memoryLimitMb: 512,
        constraints: "1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5",
        sampleExplanation: "LRUCache cache = new LRUCache(2);\ncache.put(1, 1);\ncache.get(1); // returns 1",
        tags: ["data-structures", "lru-cache", "design"],
        avg_time_seconds: 1200,
        languageTemplates: {
          java: { code: "// Write your code here", lang: "java", langSlug: "java" },
          python: { code: "# Write your code here", lang: "python", langSlug: "python" },
        },
        signatureMetadata: { functionName: "LRUCache" },
      },
    ];

    const blob = new Blob([JSON.stringify(sampleJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "superadmin_questions_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check metrics for preview table
  const totalRows = parsedRows.length;
  const unmatchedRows = parsedRows.filter(
    (r) => r.taxonomy.topicStatus === "UNMATCHED" || r.taxonomy.subtopicStatus === "UNMATCHED" || r.taxonomy.subjectStatus === "UNMATCHED"
  );
  const unmatchedCount = unmatchedRows.length;
  const matchedCount = totalRows - unmatchedCount;

  // Submit bulk create
  const handleBulkSubmit = async () => {
    if (!parsedRows.length) {
      toast({
        title: "No questions to import",
        description: "Please upload a valid file or JSON.",
        variant: "destructive",
      });
      return;
    }

    const payload = parsedRows.map((r) => r.question);

    try {
      await bulkCreateMutation.mutateAsync(payload);
      toast({
        title: "Import Successful",
        description: `Successfully imported ${payload.length} public questions.`,
      });
      onImportSuccess();
      onClose();
    } catch (err: any) {
      console.error("[SuperAdminQuestionBank] Bulk import error:", err);
      toast({
        title: "Bulk import failed",
        description: err.response?.data?.message || err.message || "Please check question parameters",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-5xl md:max-w-6xl max-h-[90vh] bg-background rounded-xl border border-border p-0 flex flex-col shadow-2xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold text-foreground leading-tight">
                Import Public Questions (SuperAdmin)
              </DialogTitle>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Visibility: PUBLIC
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload an Excel (.xlsx, .csv) or JSON file with intelligent taxonomy matching & pre-flight verification.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pr-8">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDynamicExcel}
              className="flex items-center gap-1 h-7 px-2.5 text-xs font-medium border-slate-200"
              title="Download MCQ Questions Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>MCQ Template</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCodingExcel}
              className="flex items-center gap-1 h-7 px-2.5 text-xs font-medium border-slate-200"
              title="Download Coding Questions Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#3b4992]" />
              <span>Coding Template</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {/* 1. Batch Hierarchy Selector */}
        <div className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#3b4992]" />
              Default Hierarchy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            {/* Target Subject (Required) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1 h-5">
                <span>Subject</span>
                <span className="text-destructive">*</span>
              </label>
              <select
                value={defaultSubjectId}
                onChange={(e) => handleDefaultSubjectChange(e.target.value)}
                className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer h-9 leading-tight"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Topic (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1 h-5">
                <span>Topic</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <select
                value={defaultTopicId}
                onChange={(e) => handleDefaultTopicChange(e.target.value)}
                className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer h-9 leading-tight"
              >
                <option value="">-- All Topics --</option>
                {availableDefaultTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Subtopic (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1 h-5">
                <span>Subtopic</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <select
                value={defaultSubtopicId}
                disabled={!defaultTopicId || availableDefaultSubtopics.length === 0}
                onChange={(e) => handleDefaultSubtopicChange(e.target.value)}
                className="w-full bg-background border border-input rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed h-9 leading-tight"
              >
                <option value="">-- All Subtopics / Unassigned --</option>
                {availableDefaultSubtopics.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-border pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("FILE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "FILE"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.xlsx / .csv / .json)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("JSON")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "JSON"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Direct JSON Editor</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "FILE" ? (
          <div className="w-full">
            <label
              htmlFor="superadmin-file-upload-input"
              className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer w-full text-center group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Click to browse or drag and drop your question spreadsheet
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Supports Excel (.xlsx, .xls, .csv) and JSON (.json) with case-insensitive taxonomy matching
                </p>
              </div>
              {fileName && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selected: {fileName}</span>
                </div>
              )}
            </label>
            <input
              id="superadmin-file-upload-input"
              type="file"
              accept=".xlsx, .xls, .csv, .json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Paste or Edit JSON Array:
            </label>
            <textarea
              rows={7}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={`[\n  {\n    "questionType": "MCQ",\n    "title": "Sample Question",\n    "subject": "Computer Science",\n    "topic": "Data Structures",\n    "prompt": "What is the time complexity of binary search?",\n    "marks": 2,\n    "difficulty": "EASY",\n    "mcqOptions": [\n      { "text": "O(log n)", "isCorrect": true },\n      { "text": "O(n)", "isCorrect": false }\n    ]\n  }\n]`}
              className="w-full font-mono text-[11px] p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y leading-relaxed"
            />
          </div>
        )}

        {/* Error Alert */}
        {parseError && (
          <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{parseError}</span>
          </div>
        )}

        {/* 2. Interactive Pre-Flight Mapping & Preview Table */}
        {totalRows > 0 && (
          <div className="space-y-2.5 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Pre-Flight Mapping & Preview ({totalRows} Questions)
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
                  ✅ {matchedCount} Ready
                </Badge>
                {unmatchedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/20 bg-amber-500/10 animate-pulse">
                    ⚠️ {unmatchedCount} Require Mapping
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Verify taxonomy mapping before confirming
              </span>
            </div>

            {unmatchedCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {unmatchedCount} question(s) contain topic/subject names not found in the database. Use the inline dropdowns below to map them.
                </span>
              </div>
            )}

            <div className="w-full max-h-64 overflow-x-auto overflow-y-auto border border-border rounded-lg">
              <Table className="text-xs w-full">
                <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="w-8 py-2 text-[11px]">#</TableHead>
                    <TableHead className="w-16 py-2 text-[11px]">Type</TableHead>
                    <TableHead className="py-2 text-[11px] min-w-[200px]">Title / Prompt</TableHead>
                    <TableHead className="py-2 text-[11px] min-w-[160px]">Detected Subject</TableHead>
                    <TableHead className="w-24 py-2 text-[11px] text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => {
                    const hasIssue = row.taxonomy.subjectStatus === "UNMATCHED";

                    return (
                      <TableRow key={row.id} className={hasIssue ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-muted/40"}>
                        <TableCell className="py-2 text-muted-foreground font-mono text-[11px]">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1 py-0 font-medium ${
                              row.question.questionType === "CODING"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            }`}
                          >
                            {row.question.questionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 max-w-[200px] truncate text-foreground font-medium text-[11px]">
                          <span title={row.question.prompt}>
                            {row.question.title || row.question.prompt}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground font-medium truncate max-w-[120px]">
                              {row.taxonomy.subjectName || "Default Subject"}
                            </span>
                            {row.taxonomy.subjectStatus === "FALLBACK" && (
                              <span className="text-[10px] text-muted-foreground">(Inherited)</span>
                            )}
                            {row.taxonomy.subjectStatus === "UNMATCHED" && (
                              <span className="text-[10px] text-amber-600">
                                Unmatched ("{row.taxonomy.rawSubject}")
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {hasIssue ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-semibold whitespace-nowrap">
                              ⚠️ Action
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold whitespace-nowrap">
                              ✅ Ready
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        </div>

        {/* Footer Actions (Sticky Bottom) */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-muted/30 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={bulkCreateMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="hero"
            size="sm"
            onClick={handleBulkSubmit}
            disabled={parsedRows.length === 0 || bulkCreateMutation.isPending}
            className="text-xs gap-1.5"
          >
            {bulkCreateMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Import {parsedRows.length} Questions</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


