import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ShieldAlert, BarChart3, Target } from "lucide-react";

// Mock continuous telemetry data
const velocityData = [
  { time: "00:00", starts: 45, completions: 38 },
  { time: "04:00", starts: 18, completions: 15 },
  { time: "08:00", starts: 95, completions: 82 },
  { time: "12:00", starts: 240, completions: 210 },
  { time: "16:00", starts: 310, completions: 290 },
  { time: "20:00", starts: 180, completions: 165 },
  { time: "23:59", starts: 85, completions: 75 },
];

const proctoringData = [
  { name: "Clean Verified", value: 842, color: "#10b981" },
  { name: "Tab Switch Warning", value: 68, color: "#f59e0b" },
  { name: "Multi-Face Detected", value: 24, color: "#ef4444" },
  { name: "Audio Spike Anomaly", value: 38, color: "#06b6d4" },
];

const scoreHistogram = [
  { range: "0-20%", count: 12 },
  { range: "21-40%", count: 48 },
  { range: "41-60%", count: 185 },
  { range: "61-80%", count: 420 },
  { range: "81-100%", count: 310 },
];

const skillRadar = [
  { subject: "Data Structures", score: 85 },
  { subject: "Algorithms", score: 72 },
  { subject: "SQL & DB", score: 91 },
  { subject: "System Design", score: 68 },
  { subject: "Frontend JS/TS", score: 88 },
  { subject: "Python Core", score: 79 },
];

export function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Assessment Velocity Stream */}
      <Card className="lg:col-span-2 border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg font-mono font-bold text-slate-100">
                ASSESSMENT VELOCITY STREAM
              </CardTitle>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
              REALTIME CANDIDATE TRAFFIC
            </span>
          </div>
          <CardDescription className="text-slate-400 text-xs font-sans">
            Comparison between active test starts and successful session completions.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="startsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#f8fafc",
                }}
              />
              <Area
                type="monotone"
                dataKey="starts"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#startsGrad)"
                name="Test Starts"
              />
              <Area
                type="monotone"
                dataKey="completions"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#compGrad)"
                name="Completions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. Proctoring Security Breakdown */}
      <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-lg font-mono font-bold text-slate-100">
              PROCTORING INTEGRITY
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400 text-xs font-sans">
            AI face mesh, tab switch & audio anomaly status.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex flex-col justify-between">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proctoringData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {proctoringData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#f8fafc",
                  }}
                  itemStyle={{
                    color: "#f8fafc",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
            {proctoringData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 truncate">{item.name}:</span>
                <span className="text-slate-100 font-bold ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Score Distribution Histogram */}
      <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-lg font-mono font-bold text-slate-100">
              SCORE DISTRIBUTION
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400 text-xs font-sans">
            Candidate score spread across all active assessments.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Candidates" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. Subject Performance Radar */}
      <Card className="lg:col-span-2 border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <CardTitle className="text-lg font-mono font-bold text-slate-100">
              SUBJECT MASTERY MATRIX
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400 text-xs font-sans">
            Average candidate proficiency rating broken down by technical domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={skillRadar}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} fontFamily="monospace" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
              <Radar name="Avg Score %" dataKey="score" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#090d16",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
