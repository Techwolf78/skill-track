import { useState } from "react";
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

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-500 border-green-500/20",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Hard: "bg-red-500/10 text-red-500 border-red-500/20",
};

// Sample data for Admin's questions
const sampleQuestions = [
  {
    id: "1",
    title: "What is React?",
    type: "mcq",
    difficulty: "Easy",
    subject: "Web Development",
    topic: "React",
    usedInTests: 3,
  },
  {
    id: "2",
    title: "Implement Binary Search",
    type: "coding",
    difficulty: "Medium",
    subject: "Data Structures",
    topic: "Searching",
    usedInTests: 2,
  },
  {
    id: "3",
    title: "Design a Library System",
    type: "coding",
    difficulty: "Hard",
    subject: "System Design",
    topic: "OOP",
    usedInTests: 1,
  },
];

export default function AdminQuestionBank() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const filteredQuestions = sampleQuestions.filter((question) => {
    const matchesSearch = question.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = activeTab === "mcq" ? question.type === "mcq" : question.type === "coding";
    const matchesDifficulty =
      difficultyFilter === "All" || question.difficulty === difficultyFilter;
    const matchesSubject =
      subjectFilter === "all" || question.subject === subjectFilter;
    return matchesSearch && matchesType && matchesDifficulty && matchesSubject;
  });

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Manage questions for your organization
          </p>
        </div>
        <Button variant="hero" onClick={() => navigate("/admin/questions/add")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "mcq" | "coding")}>
        <TabsList>
          <TabsTrigger value="mcq" className="gap-2">
            <ListChecks className="w-4 h-4" />
            MCQ ({sampleQuestions.filter(q => q.type === "mcq").length})
          </TabsTrigger>
          <TabsTrigger value="coding" className="gap-2">
            <Code className="w-4 h-4" />
            Coding ({sampleQuestions.filter(q => q.type === "coding").length})
          </TabsTrigger>
        </TabsList>

        {/* MCQ Tab */}
        <TabsContent value="mcq" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
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
                <SelectItem value="All">All Levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Web Development">Web Development</SelectItem>
                <SelectItem value="Data Structures">Data Structures</SelectItem>
                <SelectItem value="System Design">System Design</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Questions Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Question</TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold text-center">Used in Tests</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => (
                    <TableRow key={question.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">{question.title}</p>
                          <p className="text-sm text-muted-foreground">{question.topic}</p>
                        </div>
                      </TableCell>
                      <TableCell>{question.subject}</TableCell>
                      <TableCell>
                        <Badge className={difficultyColors[question.difficulty]}>
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{question.usedInTests}</Badge>
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
                              View Question
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Question
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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

        {/* Coding Tab */}
        <TabsContent value="coding" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search coding questions..."
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
                <SelectItem value="All">All Levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Questions Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Question</TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Difficulty</TableHead>
                  <TableHead className="font-semibold text-center">Used in Tests</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No coding questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuestions.map((question) => (
                    <TableRow key={question.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">{question.title}</p>
                          <p className="text-sm text-muted-foreground">{question.topic}</p>
                        </div>
                      </TableCell>
                      <TableCell>{question.subject}</TableCell>
                      <TableCell>
                        <Badge className={difficultyColors[question.difficulty]}>
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{question.usedInTests}</Badge>
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
                              View Question
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Question
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
