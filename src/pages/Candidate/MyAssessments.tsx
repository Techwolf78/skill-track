import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Clock, 
  BookOpen, 
  Calendar, 
  Lock, 
  PlayCircle,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MyAssessments() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const assessmentsData = {
    available: [
      {
        id: "test-001",
        title: "Full-Stack Web Development Assessment",
        description: "Evaluate your skills in modern frontend (React) and backend (Node.js/Express) frameworks, databases, and general architecture.",
        duration: "90 Mins",
        questions: 45,
        deadline: "June 12, 2026",
        type: "MCQ + Coding",
        difficulty: "Intermediate",
        skills: ["React", "Node.js", "MongoDB", "REST APIs"]
      },
      {
        id: "test-002",
        title: "Data Structures & Algorithms - Level 2",
        description: "A comprehensive coding challenge with three advanced problems on Trees, Dynamic Programming, and Graph traversal.",
        duration: "120 Mins",
        questions: 3,
        deadline: "June 15, 2026",
        type: "Coding Challenge",
        difficulty: "Advanced",
        skills: ["Algorithms", "Data Structures", "Big O"]
      }
    ],
    scheduled: [
      {
        id: "test-sched-1",
        title: "System Design & Scalability Mock",
        description: "Assess capabilities in designing horizontally scalable architectures, load balancers, database caching, and sharding.",
        startsAt: "June 18, 2026 at 10:00 AM",
        duration: "60 Mins",
        questions: 20,
        type: "MCQ + Case Study",
        difficulty: "Advanced",
        skills: ["System Design", "Scalability", "System Architecture"]
      },
      {
        id: "test-sched-2",
        title: "Python Data Science Foundations",
        description: "Evaluates pandas, numpy, data cleaning pipelines, and basic machine learning model evaluations using scikit-learn.",
        startsAt: "June 20, 2026 at 2:00 PM",
        duration: "75 Mins",
        questions: 30,
        type: "Coding + MCQ",
        difficulty: "Intermediate",
        skills: ["Python", "Pandas", "Numpy", "Machine Learning"]
      }
    ],
    practice: [
      {
        id: "test-pract-1",
        title: "JavaScript Basics Playground",
        description: "Practice your JS closures, promises, prototypes, and asynchronous behavior with infinite attempts and detailed answers.",
        duration: "30 Mins",
        questions: 15,
        attemptsLeft: "Infinite",
        type: "Practice Test",
        difficulty: "Beginner",
        skills: ["JavaScript", "Async JS", "ES6+"]
      },
      {
        id: "test-pract-2",
        title: "SQL Queries Practice Arena",
        description: "Solve multiple query problems involving complex joins, groupings, aggregation functions, and subqueries.",
        duration: "45 Mins",
        questions: 10,
        attemptsLeft: "Infinite",
        type: "Practice Test",
        difficulty: "Intermediate",
        skills: ["SQL", "PostgreSQL", "Database Queries"]
      }
    ],
    expired: [
      {
        id: "test-exp-1",
        title: "Front-End Integration Test (CSS/HTML)",
        description: "Was scheduled for late May. Tests CSS grid layouts, flexbox, semantic tags, and basic responsive layouts.",
        expiredAt: "May 25, 2026",
        type: "MCQ",
        difficulty: "Beginner",
        skills: ["CSS", "HTML5", "Responsive Web Design"]
      }
    ]
  };

  const handleStart = (id: string) => {
    navigate(`/candidate/flow?testId=${id}`);
  };

  const filterAssessments = (list: any[]) => {
    return list.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.skills.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">My Assessments</h2>
          <p className="text-sm text-muted-foreground">Manage and take your active assessments, schedule reminders, or practice coding problems.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search assessments or skills..." 
            className="pl-10 h-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 mb-6">
          <TabsTrigger value="available" className="text-sm font-semibold">
            Available ({filterAssessments(assessmentsData.available).length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-sm font-semibold">
            Scheduled ({filterAssessments(assessmentsData.scheduled).length})
          </TabsTrigger>
          <TabsTrigger value="practice" className="text-sm font-semibold">
            Practice ({filterAssessments(assessmentsData.practice).length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="text-sm font-semibold">
            Expired ({filterAssessments(assessmentsData.expired).length})
          </TabsTrigger>
        </TabsList>

        {/* AVAILABLE */}
        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filterAssessments(assessmentsData.available).map((test) => (
              <Card key={test.id} className="border border-border/60 flex flex-col justify-between hover:shadow-lg card-hover">
                <CardHeader className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {test.type}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {test.difficulty}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold font-heading line-clamp-1">{test.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.duration}</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> {test.questions} Questions</span>
                    <span className="flex items-center gap-1 text-rose-500 font-medium"><AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Deadline: {test.deadline}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {test.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-border/40 p-6 flex gap-3">
                  <Button 
                    className="flex-1 bg-gradient-primary text-white hover:opacity-95 shadow-primary"
                    onClick={() => handleStart(test.id)}
                  >
                    Start Assessment
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {filterAssessments(assessmentsData.available).length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">No available assessments matching search.</div>
            )}
          </div>
        </TabsContent>

        {/* SCHEDULED */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filterAssessments(assessmentsData.scheduled).map((test) => (
              <Card key={test.id} className="border border-border/60 flex flex-col justify-between opacity-85">
                <CardHeader className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {test.type}
                    </span>
                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {test.difficulty}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold font-heading line-clamp-1">{test.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center gap-3 text-xs text-blue-800">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-blue-500" />
                    <span><strong>Scheduled:</strong> {test.startsAt}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.duration}</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> {test.questions} Questions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {test.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-border/40 p-6">
                  <Button disabled variant="outline" className="w-full gap-2 border-border text-muted-foreground">
                    <Lock className="w-4 h-4" /> Locked Until Scheduled Time
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {filterAssessments(assessmentsData.scheduled).length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">No scheduled assessments matching search.</div>
            )}
          </div>
        </TabsContent>

        {/* PRACTICE */}
        <TabsContent value="practice" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filterAssessments(assessmentsData.practice).map((test) => (
              <Card key={test.id} className="border border-border/60 flex flex-col justify-between hover:shadow-lg card-hover">
                <CardHeader className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {test.type}
                    </span>
                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {test.difficulty}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold font-heading line-clamp-1">{test.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {test.duration}</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> {test.questions} Questions</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium"><PlayCircle className="w-3.5 h-3.5 text-emerald-500" /> Attempts: {test.attemptsLeft}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {test.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-border/40 p-6">
                  <Button 
                    variant="outline" 
                    className="w-full border-primary text-primary hover:bg-primary/5 shadow-sm"
                    onClick={() => handleStart(test.id)}
                  >
                    Start Practice Test
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {filterAssessments(assessmentsData.practice).length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">No practice tests matching search.</div>
            )}
          </div>
        </TabsContent>

        {/* EXPIRED */}
        <TabsContent value="expired" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filterAssessments(assessmentsData.expired).map((test) => (
              <Card key={test.id} className="border border-border/60 flex flex-col justify-between opacity-60 bg-muted/20">
                <CardHeader className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {test.type}
                    </span>
                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {test.difficulty}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold font-heading line-clamp-1">{test.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Expired on: {test.expiredAt}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {test.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-border/40 p-6">
                  <Button disabled variant="secondary" className="w-full text-muted-foreground">
                    Closed / Expired
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {filterAssessments(assessmentsData.expired).length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">No expired assessments matching search.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
