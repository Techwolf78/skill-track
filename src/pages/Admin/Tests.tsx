import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
  Edit,
  Clock,
  Target,
  FileQuestion,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample test data for Admin
const sampleTests = [
  {
    id: "1",
    title: "JavaScript Fundamentals",
    description: "Basic JavaScript concepts and syntax",
    status: "Published",
    candidates: 25,
    submissions: 18,
    questionsCount: 20,
    duration: 60,
    createdAt: "2024-04-10",
  },
  {
    id: "2",
    title: "React Advanced",
    description: "Advanced React patterns and hooks",
    status: "Draft",
    candidates: 12,
    submissions: 5,
    questionsCount: 15,
    duration: 90,
    createdAt: "2024-04-12",
  },
  {
    id: "3",
    title: "System Design Concepts",
    description: "Architecture and design patterns",
    status: "Published",
    candidates: 8,
    submissions: 8,
    questionsCount: 10,
    duration: 120,
    createdAt: "2024-04-15",
  },
];

export default function AdminTests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [tests, setTests] = useState(sampleTests);

  const filteredTests = tests.filter(
    (test) =>
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (testId: string) => {
    setTests(tests.filter((t) => t.id !== testId));
    toast({
      title: "Test Deleted",
      description: "The test has been deleted successfully.",
    });
  };

  const getStatusColor = (status: string) => {
    return status === "Published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Tests</h1>
          <p className="text-muted-foreground mt-1">
            Manage tests for your organization
          </p>
        </div>
        <Button
          variant="hero"
          onClick={() => navigate("/admin/tests/create")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tests Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Test Title</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Questions</TableHead>
              <TableHead className="font-semibold text-center">Duration</TableHead>
              <TableHead className="font-semibold text-center">Submissions</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No tests found
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map((test) => (
                <TableRow key={test.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="font-medium">{test.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {test.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileQuestion className="w-4 h-4 text-muted-foreground" />
                      {test.questionsCount}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {test.duration}m
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{test.submissions}</Badge>
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
                          onClick={() => navigate(`/admin/tests/${test.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/tests/edit/${test.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Test
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate Test
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(test.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Test
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold">{tests.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileQuestion className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Published</p>
              <p className="text-2xl font-bold">
                {tests.filter((t) => t.status === "Published").length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Badge className="w-5 h-5 text-success">✓</Badge>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">
                {tests.reduce((sum, t) => sum + t.submissions, 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
