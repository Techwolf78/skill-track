import { useState, useEffect } from "react";
import { ExecutiveHeader } from "@/components/dashboard/ExecutiveHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { LiveProctoringFeed } from "@/components/dashboard/LiveProctoringFeed";
import { RecentTestsTable } from "@/components/dashboard/RecentTestsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  FileQuestion,
  ClipboardCheck,
  ShieldCheck,
  Zap,
  UserPlus,
  PlusCircle,
  UploadCloud,
  Code2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateService } from "@/lib/candidate-service";
import { testService } from "@/lib/test-service";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState("7D");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real backend metrics
  const [totalCandidates, setTotalCandidates] = useState<number | null>(null);
  const [activeSchedulesCount, setActiveSchedulesCount] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [mcqCount, setMcqCount] = useState<number | null>(null);
  const [codingCount, setCodingCount] = useState<number | null>(null);

  const loadLiveStats = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch real candidates count
      const candidates = await candidateService.getCandidates();
      setTotalCandidates(candidates ? candidates.length : 0);

      // 2. Fetch real active & total test schedules
      const schedules = await testService.getAllTestSchedules();
      const liveOrScheduled = (schedules || []).filter((s) => {
        const st = String(s.status || "").toUpperCase();
        return st === "ACTIVE" || st === "SCHEDULED" || st === "UPCOMING" || st === "LIVE";
      }).length;
      setActiveSchedulesCount(liveOrScheduled);

      // 3. Fetch real questions from question bank
      const qList = await testService.getAllQuestions();
      const safeQList = Array.isArray(qList) ? qList : [];
      setTotalQuestions(safeQList.length);

      const mcqs = safeQList.filter(q => q.questionType !== "CODING").length;
      const coding = safeQList.filter(q => q.questionType === "CODING").length;
      setMcqCount(mcqs);
      setCodingCount(coding);
    } catch (err) {
      console.error("Failed to load dashboard live stats:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveStats();
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen text-foreground font-sans">
      {/* 1. Executive Header */}
      <ExecutiveHeader
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        onRefresh={loadLiveStats}
        isRefreshing={isRefreshing}
      />

      {/* 2. Key Performance Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Candidates"
          value={totalCandidates !== null ? totalCandidates.toString() : "0"}
          subtitle="Enrolled candidates"
          icon={Users}
        />
        <StatsCard
          title="Active Test Schedules"
          value={activeSchedulesCount !== null ? activeSchedulesCount.toString() : "0"}
          subtitle="Active / Live schedules"
          icon={GraduationCap}
        />
        <StatsCard
          title="Question Repository"
          value={totalQuestions !== null ? totalQuestions.toString() : "0"}
          subtitle={mcqCount !== null && codingCount !== null ? `MCQ: ${mcqCount} | Coding: ${codingCount}` : "Live repository"}
          icon={FileQuestion}
        />
        <StatsCard
          title="Proctor Integrity Index"
          value="98.4%"
          subtitle="Clean verified sessions"
          icon={ShieldCheck}
        />
      </div>

      {/* 3. Main Section: Active Assessments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Tests & Active Schedules Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-500" />
              Active & Recent Assessments
            </h2>
          </div>
          <RecentTestsTable />
        </div>

        {/* Right Column: Quick Action Hub & System Audit Feed */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Launch Control Hub */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  Quick Actions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <Button
                onClick={() => navigate("/superadmin/invitations")}
                variant="outline"
                className="w-full justify-start h-9 border-border bg-muted/20 hover:bg-accent text-foreground text-xs gap-2.5 font-medium"
              >
                <UserPlus className="w-4 h-4 text-emerald-500" />
                Invite Candidates
              </Button>

              <Button
                onClick={() => navigate("/superadmin/questions/add")}
                variant="outline"
                className="w-full justify-start h-9 border-border bg-muted/20 hover:bg-accent text-foreground text-xs gap-2.5 font-medium"
              >
                <PlusCircle className="w-4 h-4 text-sky-500" />
                Add New Question
              </Button>

              <Button
                onClick={() => navigate("/superadmin/students?action=bulk-upload")}
                variant="outline"
                className="w-full justify-start h-9 border-border bg-muted/20 hover:bg-accent text-foreground text-xs gap-2.5 font-medium"
              >
                <UploadCloud className="w-4 h-4 text-amber-500" />
                Bulk Upload Candidates
              </Button>

              <Button
                onClick={() => navigate("/superadmin/dsa-playground")}
                variant="outline"
                className="w-full justify-start h-9 border-border bg-muted/20 hover:bg-accent text-foreground text-xs gap-2.5 font-medium"
              >
                <Code2 className="w-4 h-4 text-indigo-500" />
                DSA Playground & IDE
              </Button>
            </CardContent>
          </Card>

          {/* System Telemetry Stream */}
          <LiveProctoringFeed />
        </div>
      </div>
    </div>
  );
}