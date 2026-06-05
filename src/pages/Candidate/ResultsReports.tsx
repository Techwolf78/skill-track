import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Download,
  Eye,
  Calendar,
  Trophy,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  Award,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function ResultsReports() {
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const results = [
    {
      id: "res-001",
      title: "React & State Management",
      date: "June 03, 2026",
      score: 92,
      percentile: 96,
      status: "Passed",
      timeSpent: "74 Mins",
      totalQuestions: 40,
      sections: [
        { name: "React Basics & Hooks", score: 95, questions: 15 },
        { name: "State Management (Redux/Zustand)", score: 90, questions: 15 },
        { name: "Performance Optimization", score: 90, questions: 10 },
      ],
    },
    {
      id: "res-002",
      title: "Database Systems & SQL Basics",
      date: "May 28, 2026",
      score: 85,
      percentile: 88,
      status: "Passed",
      timeSpent: "55 Mins",
      totalQuestions: 30,
      sections: [
        { name: "DDL & DML Queries", score: 90, questions: 10 },
        { name: "Joins & Subqueries", score: 80, questions: 10 },
        { name: "Indexing & Normalization", score: 85, questions: 10 },
      ],
    },
    {
      id: "res-003",
      title: "System Design Patterns",
      date: "May 20, 2026",
      score: 76,
      percentile: 81,
      status: "Passed",
      timeSpent: "85 Mins",
      totalQuestions: 50,
      sections: [
        { name: "Caching & CDN", score: 80, questions: 15 },
        { name: "Load Balancing & Scaling", score: 70, questions: 20 },
        { name: "Microservices", score: 80, questions: 15 },
      ],
    },
    {
      id: "res-004",
      title: "Asynchronous JavaScript (Mock)",
      date: "May 12, 2026",
      score: 64,
      percentile: 70,
      status: "In Review",
      timeSpent: "40 Mins",
      totalQuestions: 20,
      sections: [
        { name: "Promises & Async/Await", score: 70, questions: 10 },
        { name: "Event Loop & Callbacks", score: 58, questions: 10 },
      ],
    },
  ];

  const handleDownload = (title: string) => {
    toast.success(`Downloading PDF Report for '${title}'...`, {
      description: "Generating detailed score sheets and evaluation charts.",
      duration: 3000,
    });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">
          Results & Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          View overall rankings, download official score sheets, and inspect
          section-by-section analytics.
        </p>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border/60 bg-indigo-500/10 text-indigo-600 flex-shrink-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-xl bg-indigo-500/10 text-indigo-600 flex-shrink-0">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Average Percentile
              </span>
              <h3 className="text-3xl font-extrabold text-foreground">88.7%</h3>
              <p className="text-xs text-indigo-600 font-medium">
                Top 12% in your batch pool
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-emerald-500/10 text-emerald-600 flex-shrink-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 flex-shrink-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Highest Score
              </span>
              <h3 className="text-3xl font-extrabold text-foreground">92%</h3>
              <p className="text-xs text-emerald-600 font-medium">
                React & State Management
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/60 bg-rose-500/10 text-rose-600 flex-shrink-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-xl bg-rose-500/10 text-rose-600 flex-shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Rank Pool
              </span>
              <h3 className="text-3xl font-extrabold text-foreground">
                #18 / 240
              </h3>
              <p className="text-xs text-rose-600 font-medium">
                Candidate Batch Rank
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card className="border border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold font-heading">
            Assessment Attempts
          </CardTitle>
          <CardDescription>
            Click View Details to break down scores by conceptual section.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {results.map((res) => (
              <div
                key={res.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors"
              >
                {/* Title & Info */}
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {res.status === "Passed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Info className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground leading-none">
                      {res.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Attempted: {res.date}
                      </span>
                      <span>Questions: {res.totalQuestions}</span>
                      <span>Duration: {res.timeSpent}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="flex items-center gap-8 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground block font-medium">
                      Score / Percentile
                    </span>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="text-lg font-extrabold text-foreground">
                        {res.score}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({res.percentile}th)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border gap-1 hover:bg-muted"
                      onClick={() => setSelectedReport(res)}
                    >
                      <Eye className="w-4 h-4" /> Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary hover:bg-primary/5"
                      onClick={() => handleDownload(res.title)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedReport && (
        <Dialog
          open={!!selectedReport}
          onOpenChange={(open) => !open && setSelectedReport(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">
                {selectedReport.title}
              </DialogTitle>
              <DialogDescription>
                Attempted on {selectedReport.date} | Score:{" "}
                {selectedReport.score}%
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>OVERALL SCORE</span>
                  <span className="text-primary">{selectedReport.score}%</span>
                </div>
                <Progress
                  value={selectedReport.score}
                  className="h-2 [&>div]:bg-gradient-primary"
                />
              </div>

              {/* Percentile Stats */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Batch Percentile</span>
                </div>
                <span className="font-bold text-foreground">
                  {selectedReport.percentile}th Percentile
                </span>
              </div>

              {/* Sections Breakdown */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-foreground border-b border-border pb-1">
                  Section-wise Performance
                </h4>
                <div className="space-y-4">
                  {selectedReport.sections.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {sec.name}
                        </span>
                        <span className="font-bold text-muted-foreground">
                          {sec.score}%
                        </span>
                      </div>
                      <Progress
                        value={sec.score}
                        className="h-1.5 [&>div]:bg-gradient-accent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setSelectedReport(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1"
                onClick={() => {
                  handleDownload(selectedReport.title);
                  setSelectedReport(null);
                }}
              >
                <Download className="w-4 h-4" /> Download Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
