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
    <div className="p-6 lg:p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100 font-sans relative">
      {/* Cyberpunk background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* 1. Executive Header */}
      <ExecutiveHeader
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        onRefresh={loadLiveStats}
        isRefreshing={isRefreshing}
      />

      {/* 2. Key Performance Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        <StatsCard
          title="Total Candidates"
          value={totalCandidates !== null ? totalCandidates.toString() : "0"}
          subtitle="Enrolled candidates"
          icon={Users}
          variant="default"
        />
        <StatsCard
          title="Active Test Schedules"
          value={activeSchedulesCount !== null ? activeSchedulesCount.toString() : "0"}
          subtitle="Active / Live schedules"
          icon={GraduationCap}
          variant="accent"
        />
        <StatsCard
          title="Question Repository"
          value={totalQuestions !== null ? totalQuestions.toString() : "0"}
          subtitle={mcqCount !== null && codingCount !== null ? `MCQ: ${mcqCount} | Coding: ${codingCount}` : "Live repository"}
          icon={FileQuestion}
          variant="success"
        />
        <StatsCard
          title="Proctor Integrity Index"
          value="98.4%"
          subtitle="Clean verified sessions"
          icon={ShieldCheck}
          variant="warning"
        />
      </div>

      {/* 3. Next-Level Analytics Charts Suite (Recharts) */}
      <div className="relative z-10">
        <AnalyticsCharts />
      </div>

      {/* 4. Live Proctoring Ticker & Quick Actions Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Live Event Telemetry Stream */}
        <div className="lg:col-span-2">
          <LiveProctoringFeed />
        </div>

        {/* Quick Launch Control Hub */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-xl flex flex-col justify-between font-mono">
          <CardHeader className="py-3 px-4 bg-slate-950/60 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-sm font-bold tracking-wider text-slate-200">
                QUICK COMMAND HUB
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400 text-xs font-sans">
              Frequently accessed administrative tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Button
              onClick={() => navigate("/superadmin/invitations")}
              variant="outline"
              className="w-full justify-start h-11 border-slate-800 bg-slate-950/80 hover:bg-slate-900 hover:border-emerald-500/40 text-slate-200 hover:text-slate-100 font-mono text-xs gap-3 group transition-all"
            >
              <div className="w-7 h-7 rounded bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <UserPlus className="w-4 h-4" />
              </div>
              INVITE CANDIDATES
            </Button>

            <Button
              onClick={() => navigate("/superadmin/questions/add")}
              variant="outline"
              className="w-full justify-start h-11 border-slate-800 bg-slate-950/80 hover:bg-slate-900 hover:border-cyan-500/40 text-slate-200 hover:text-slate-100 font-mono text-xs gap-3 group transition-all"
            >
              <div className="w-7 h-7 rounded bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-4 h-4" />
              </div>
              ADD NEW QUESTION
            </Button>

            <Button
              onClick={() => navigate("/superadmin/students?action=bulk-upload")}
              variant="outline"
              className="w-full justify-start h-11 border-slate-800 bg-slate-950/80 hover:bg-slate-900 hover:border-amber-500/40 text-slate-200 hover:text-slate-100 font-mono text-xs gap-3 group transition-all"
            >
              <div className="w-7 h-7 rounded bg-amber-950 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-4 h-4" />
              </div>
              BULK UPLOAD CANDIDATES
            </Button>

            <Button
              onClick={() => navigate("/superadmin/dsa-playground")}
              variant="outline"
              className="w-full justify-start h-11 border-slate-800 bg-slate-950/80 hover:bg-slate-900 hover:border-indigo-500/40 text-slate-200 hover:text-slate-100 font-mono text-xs gap-3 group transition-all"
            >
              <div className="w-7 h-7 rounded bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Code2 className="w-4 h-4" />
              </div>
              DSA PLAYGROUND & IDE
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 5. Recent Tests & Active Schedules Table */}
      <div className="space-y-3 relative z-10">
        <h2 className="text-xl font-bold font-mono text-slate-100 tracking-tight flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-400" />
          ACTIVE & RECENT ASSESSMENTS
        </h2>
        <RecentTestsTable />
      </div>
    </div>
  );
}