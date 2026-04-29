import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Clock, FileQuestion, Users, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const sampleSubmissions = [
  {
    id: "1",
    candidateName: "John Doe",
    score: 85,
    submittedAt: "2024-04-15 10:30 AM",
    status: "Completed",
  },
  {
    id: "2",
    candidateName: "Jane Smith",
    score: 92,
    submittedAt: "2024-04-15 11:15 AM",
    status: "Completed",
  },
  {
    id: "3",
    candidateName: "Mike Johnson",
    score: 78,
    submittedAt: "2024-04-15 2:45 PM",
    status: "Completed",
  },
];

export default function AdminTestDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/tests")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">JavaScript Fundamentals</h1>
            <p className="text-muted-foreground mt-1">
              Test ID: {id}
            </p>
          </div>
        </div>
        <Button
          variant="hero"
          onClick={() => navigate(`/admin/tests/edit/${id}`)}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Test
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold">20</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileQuestion className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">60m</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">85%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Details */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>Basic JavaScript concepts and syntax</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="bg-success/10 text-success">Published</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>2024-04-10</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-semibold">90%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: "90%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Pass Rate</span>
                  <span className="font-semibold">72%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: "72%" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            Latest test submissions from candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Candidate</TableHead>
                <TableHead className="font-semibold">Score</TableHead>
                <TableHead className="font-semibold">Submitted</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">
                    {submission.candidateName}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{submission.score}%</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {submission.submittedAt}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-success/10 text-success">
                      {submission.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
