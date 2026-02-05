 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Download, TrendingUp, TrendingDown, Users, Target, Award } from "lucide-react";
 
 const topPerformers = [
   { rank: 1, name: "Sneha Gupta", college: "Tech College", batch: "CSE 2025", score: 95 },
   { rank: 2, name: "Priya Patel", college: "ABC Engineering", batch: "CSE 2024", score: 92 },
   { rank: 3, name: "Rahul Sharma", college: "ABC Engineering", batch: "CSE 2024", score: 88 },
   { rank: 4, name: "Amit Kumar", college: "XYZ Institute", batch: "IT 2024", score: 85 },
   { rank: 5, name: "Vikram Singh", college: "ABC Engineering", batch: "MCA 2024", score: 82 },
 ];
 
 const batchPerformance = [
   { batch: "CSE 2024", college: "ABC Engineering", students: 45, avgScore: 78, passRate: 89 },
   { batch: "IT 2024", college: "XYZ Institute", students: 32, avgScore: 72, passRate: 84 },
   { batch: "CSE 2025", college: "Tech College", students: 60, avgScore: 81, passRate: 92 },
   { batch: "MCA 2024", college: "ABC Engineering", students: 28, avgScore: 68, passRate: 75 },
 ];
 
 const topicWise = [
   { topic: "Data Structures", avgScore: 75, difficulty: "Medium" },
   { topic: "Algorithms", avgScore: 68, difficulty: "Hard" },
   { topic: "Python", avgScore: 82, difficulty: "Easy" },
   { topic: "Java", avgScore: 71, difficulty: "Medium" },
   { topic: "SQL", avgScore: 79, difficulty: "Medium" },
 ];
 
 export default function Reports() {
   return (
     <div className="p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-heading font-bold">Reports & Analytics</h1>
           <p className="text-muted-foreground mt-1">
             Performance insights and detailed reports
           </p>
         </div>
         <div className="flex items-center gap-3">
           <Select defaultValue="all">
             <SelectTrigger className="w-48">
               <SelectValue placeholder="Select College" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Colleges</SelectItem>
               <SelectItem value="abc">ABC Engineering</SelectItem>
               <SelectItem value="xyz">XYZ Institute</SelectItem>
               <SelectItem value="tech">Tech College</SelectItem>
             </SelectContent>
           </Select>
           <Button variant="outline">
             <Download className="w-4 h-4 mr-2" />
             Export Report
           </Button>
         </div>
       </div>
 
       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Average Score</p>
                 <p className="text-3xl font-bold mt-1">74.5%</p>
               </div>
               <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                 <Target className="w-6 h-6 text-primary" />
               </div>
             </div>
             <p className="text-sm text-success flex items-center gap-1 mt-2">
               <TrendingUp className="w-4 h-4" />
               +5.2% from last month
             </p>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Pass Rate</p>
                 <p className="text-3xl font-bold mt-1">85%</p>
               </div>
               <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                 <Award className="w-6 h-6 text-success" />
               </div>
             </div>
             <p className="text-sm text-success flex items-center gap-1 mt-2">
               <TrendingUp className="w-4 h-4" />
               +3.1% from last month
             </p>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Tests Completed</p>
                 <p className="text-3xl font-bold mt-1">156</p>
               </div>
               <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                 <Users className="w-6 h-6 text-accent" />
               </div>
             </div>
             <p className="text-sm text-muted-foreground mt-2">
               This month
             </p>
           </CardContent>
         </Card>
 
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Weak Area</p>
                 <p className="text-xl font-bold mt-1">Algorithms</p>
               </div>
               <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                 <TrendingDown className="w-6 h-6 text-warning" />
               </div>
             </div>
             <p className="text-sm text-destructive flex items-center gap-1 mt-2">
               68% avg score
             </p>
           </CardContent>
         </Card>
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Performers */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Award className="w-5 h-5 text-warning" />
               Top Performers
             </CardTitle>
             <CardDescription>Students with highest average scores</CardDescription>
           </CardHeader>
           <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-16">Rank</TableHead>
                   <TableHead>Student</TableHead>
                   <TableHead className="text-right">Score</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {topPerformers.map((student) => (
                   <TableRow key={student.rank}>
                     <TableCell>
                       <span className={`font-bold ${student.rank <= 3 ? 'text-primary' : ''}`}>
                         #{student.rank}
                       </span>
                     </TableCell>
                     <TableCell>
                       <div>
                         <p className="font-medium">{student.name}</p>
                         <p className="text-sm text-muted-foreground">
                           {student.college} • {student.batch}
                         </p>
                       </div>
                     </TableCell>
                     <TableCell className="text-right">
                       <span className="font-bold text-success">{student.score}%</span>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
 
         {/* Topic-wise Performance */}
         <Card>
           <CardHeader>
             <CardTitle>Topic-wise Performance</CardTitle>
             <CardDescription>Average scores by topic across all tests</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             {topicWise.map((topic) => (
               <div key={topic.topic} className="space-y-2">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="font-medium">{topic.topic}</span>
                     <Badge variant="outline" className="text-xs">
                       {topic.difficulty}
                     </Badge>
                   </div>
                   <span className={`font-bold ${topic.avgScore >= 75 ? 'text-success' : topic.avgScore >= 65 ? 'text-warning' : 'text-destructive'}`}>
                     {topic.avgScore}%
                   </span>
                 </div>
                 <div className="h-2 bg-muted rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full ${topic.avgScore >= 75 ? 'bg-success' : topic.avgScore >= 65 ? 'bg-warning' : 'bg-destructive'}`}
                     style={{ width: `${topic.avgScore}%` }}
                   />
                 </div>
               </div>
             ))}
           </CardContent>
         </Card>
       </div>
 
       {/* Batch Performance */}
       <Card>
         <CardHeader>
           <CardTitle>Batch-wise Performance</CardTitle>
           <CardDescription>Performance breakdown by batch</CardDescription>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow className="bg-muted/50">
                 <TableHead className="font-semibold">Batch</TableHead>
                 <TableHead className="font-semibold">College</TableHead>
                 <TableHead className="font-semibold text-center">Students</TableHead>
                 <TableHead className="font-semibold text-center">Avg Score</TableHead>
                 <TableHead className="font-semibold text-center">Pass Rate</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {batchPerformance.map((batch) => (
                 <TableRow key={batch.batch}>
                   <TableCell>
                     <Badge variant="outline">{batch.batch}</Badge>
                   </TableCell>
                   <TableCell>{batch.college}</TableCell>
                   <TableCell className="text-center">{batch.students}</TableCell>
                   <TableCell className="text-center">
                     <span className={`font-bold ${batch.avgScore >= 75 ? 'text-success' : batch.avgScore >= 65 ? 'text-warning' : 'text-destructive'}`}>
                       {batch.avgScore}%
                     </span>
                   </TableCell>
                   <TableCell className="text-center">
                     <span className={`font-bold ${batch.passRate >= 85 ? 'text-success' : batch.passRate >= 75 ? 'text-warning' : 'text-destructive'}`}>
                       {batch.passRate}%
                     </span>
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