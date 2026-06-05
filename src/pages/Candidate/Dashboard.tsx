import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Percent, 
  BookOpen, 
  ArrowRight, 
  Calendar,
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function CandidateDashboard() {
  const navigate = useNavigate();

  const kpis = [
    { title: "Total Assessments", value: "12", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Pending Assessments", value: "2", icon: Clock, color: "text-amber-500", bg: "bg-amber-50", highlight: true },
    { title: "Completed Assessments", value: "8", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Average Score", value: "84.5%", icon: Percent, color: "text-indigo-500", bg: "bg-indigo-50" },
    { title: "Certificates Earned", value: "5", icon: Trophy, color: "text-rose-500", bg: "bg-rose-50" },
  ];

  const pendingAssessments = [
    {
      id: "test-001",
      title: "Full-Stack Web Development Assessment",
      duration: "90 Mins",
      questions: 45,
      deadline: "June 12, 2026",
      type: "MCQ + Coding",
      difficulty: "Intermediate"
    },
    {
      id: "test-002",
      title: "Data Structures & Algorithms - Level 2",
      duration: "120 Mins",
      questions: 3,
      deadline: "June 15, 2026",
      type: "Coding Challenge",
      difficulty: "Advanced"
    }
  ];

  const recentResults = [
    { title: "React & State Management", score: 92, date: "June 03, 2026", status: "Passed" },
    { title: "Database Systems & SQL Basics", score: 85, date: "May 28, 2026", status: "Passed" },
    { title: "System Design Patterns", score: 76, date: "May 20, 2026", status: "Passed" }
  ];

  const notifications = [
    { text: "Your invitation to 'Full-Stack Web Development Assessment' is active.", time: "2 hours ago", type: "invitation" },
    { text: "Certificate issued for 'React & State Management'.", time: "1 day ago", type: "success" },
    { text: "Your support ticket #1024 has been resolved.", time: "3 days ago", type: "info" }
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-5 left-1/3 w-64 h-64 bg-accent rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <span className="bg-primary/20 text-primary-foreground border border-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Student Workspace
            </span>
            <h2 className="text-3xl font-bold font-heading">Welcome back, Alex Rivera!</h2>
            <p className="text-white/80 max-w-xl text-sm leading-relaxed">
              Your overall training profile is looking strong. You have completed 8 assessments and earned 5 verified skills certificates. Keep up the great work!
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 backdrop-blur-md px-6 py-4 rounded-xl text-center flex-shrink-0 min-w-[160px]">
            <span className="text-xs text-white/60 block font-medium uppercase tracking-wide">Course Progress</span>
            <span className="text-3xl font-extrabold block text-gradient-primary my-1">82%</span>
            <Progress value={82} className="h-1.5 bg-white/20 [&>div]:bg-gradient-primary mt-2" />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className={`border border-border/60 card-hover relative overflow-hidden ${kpi.highlight ? 'ring-2 ring-primary/50' : ''}`}>
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{kpi.title}</span>
                  <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">{kpi.value}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pending Assessments (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Upcoming & Pending Assessments</h3>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary-hover gap-1">
              <Link to="/candidate/assessments">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            {pendingAssessments.map((test) => (
              <Card key={test.id} className="border border-border/60 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {test.type}
                      </span>
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {test.difficulty}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground leading-snug">{test.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.duration}</span>
                      <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> {test.questions} Questions</span>
                      <span className="flex items-center gap-1 text-rose-500 font-medium"><AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Deadline: {test.deadline}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full md:w-auto bg-gradient-primary text-white hover:opacity-95 shadow-primary"
                    onClick={() => navigate(`/candidate/flow?testId=${test.id}`)}
                  >
                    Start Assessment
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Flow Promotion */}
          <div className="bg-gradient-accent/15 border border-accent/20 rounded-2xl p-6 flex items-center gap-6">
            <div className="p-4 bg-white rounded-xl shadow-sm hidden md:block">
              <Trophy className="w-10 h-10 text-accent" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-foreground">Interactive Demo Mode Active</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Experience the step-by-step Candidate Assessment Flow: from instruction readings, a simulated coding playground with live timers, to immediate result scoring.
              </p>
              <div className="pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => navigate("/candidate/flow?testId=demo-test")}
                  className="border-accent text-accent hover:bg-accent/10"
                >
                  Start Demo Flow
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Recent Results & Notifications */}
        <div className="space-y-6">
          {/* Recent Results */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Recent Results</h3>
            <Card className="border border-border/60">
              <CardContent className="p-0 divide-y divide-border">
                {recentResults.map((result, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1 pr-3">
                      <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {result.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600 block">{result.score}%</span>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{result.status}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Notifications Panel */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground">Recent Activities</h3>
            <Card className="border border-border/60">
              <CardContent className="p-0 divide-y divide-border">
                {notifications.map((notif, idx) => (
                  <div key={idx} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground leading-normal">{notif.text}</p>
                      <p className="text-[10px] text-muted-foreground">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
