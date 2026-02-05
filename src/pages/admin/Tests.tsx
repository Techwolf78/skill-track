 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card";
 import {
   Plus,
   Search,
   Calendar,
   Users,
   Clock,
   MoreVertical,
   Play,
   Eye,
   Copy,
   Trash2,
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 
 const tests = [
   {
     id: "1",
     name: "Python Fundamentals",
     type: "Mixed",
     duration: 60,
     questions: 25,
     totalMarks: 100,
     batch: "CSE 2024",
     college: "ABC Engineering",
     scheduledFor: "2024-01-20 10:00 AM",
     status: "scheduled",
     participants: 45,
   },
   {
     id: "2",
     name: "Data Structures MCQ",
     type: "MCQ",
     duration: 45,
     questions: 30,
     totalMarks: 60,
     batch: "IT 2024",
     college: "XYZ Institute",
     scheduledFor: "2024-01-15 02:00 PM",
     status: "active",
     participants: 32,
   },
   {
     id: "3",
     name: "Java Coding Challenge",
     type: "Coding",
     duration: 90,
     questions: 5,
     totalMarks: 100,
     batch: "CSE 2025",
     college: "Tech College",
     scheduledFor: "2024-01-10 09:00 AM",
     status: "completed",
     participants: 60,
   },
   {
     id: "4",
     name: "SQL Proficiency Test",
     type: "Mixed",
     duration: 60,
     questions: 20,
     totalMarks: 80,
     batch: "MCA 2024",
     college: "ABC Engineering",
     scheduledFor: "2024-01-05 11:00 AM",
     status: "completed",
     participants: 28,
   },
 ];
 
 const statusStyles = {
   scheduled: "bg-warning/10 text-warning border-warning/20",
   active: "bg-accent/10 text-accent border-accent/20",
   completed: "bg-success/10 text-success border-success/20",
   draft: "bg-muted text-muted-foreground",
 };
 
 const typeStyles = {
   MCQ: "bg-primary/10 text-primary",
   Coding: "bg-accent/10 text-accent",
   Mixed: "bg-secondary text-secondary-foreground",
 };
 
 export default function Tests() {
   const [searchTerm, setSearchTerm] = useState("");
 
   return (
     <div className="p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-heading font-bold">Tests</h1>
           <p className="text-muted-foreground mt-1">
             Create, manage, and track assessments
           </p>
         </div>
         <Link to="/admin/tests/create">
           <Button variant="hero">
             <Plus className="w-4 h-4 mr-2" />
             Create Test
           </Button>
         </Link>
       </div>
 
       {/* Search */}
       <div className="relative max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="Search tests..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-10"
         />
       </div>
 
       {/* Tabs */}
       <Tabs defaultValue="all" className="w-full">
         <TabsList>
           <TabsTrigger value="all">All Tests</TabsTrigger>
           <TabsTrigger value="active">Active</TabsTrigger>
           <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
           <TabsTrigger value="completed">Completed</TabsTrigger>
           <TabsTrigger value="draft">Drafts</TabsTrigger>
         </TabsList>
 
         <TabsContent value="all" className="mt-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {tests.map((test) => (
               <Card key={test.id} className="card-hover">
                 <CardHeader className="pb-3">
                   <div className="flex items-start justify-between">
                     <div className="space-y-1">
                       <CardTitle className="text-lg">{test.name}</CardTitle>
                       <CardDescription>{test.college} • {test.batch}</CardDescription>
                     </div>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon">
                           <MoreVertical className="w-4 h-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem>
                           <Eye className="w-4 h-4 mr-2" />
                           View Details
                         </DropdownMenuItem>
                         <DropdownMenuItem>
                           <Play className="w-4 h-4 mr-2" />
                           Start Now
                         </DropdownMenuItem>
                         <DropdownMenuItem>
                           <Copy className="w-4 h-4 mr-2" />
                           Duplicate
                         </DropdownMenuItem>
                         <DropdownMenuItem className="text-destructive">
                           <Trash2 className="w-4 h-4 mr-2" />
                           Delete
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="flex items-center gap-2">
                     <Badge className={typeStyles[test.type as keyof typeof typeStyles]}>
                       {test.type}
                     </Badge>
                     <Badge variant="outline" className={statusStyles[test.status as keyof typeof statusStyles]}>
                       {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                     </Badge>
                   </div>
 
                   <div className="grid grid-cols-3 gap-4 py-3 border-y">
                     <div className="text-center">
                       <p className="text-2xl font-bold">{test.questions}</p>
                       <p className="text-xs text-muted-foreground">Questions</p>
                     </div>
                     <div className="text-center border-x">
                       <p className="text-2xl font-bold">{test.duration}</p>
                       <p className="text-xs text-muted-foreground">Minutes</p>
                     </div>
                     <div className="text-center">
                       <p className="text-2xl font-bold">{test.totalMarks}</p>
                       <p className="text-xs text-muted-foreground">Marks</p>
                     </div>
                   </div>
 
                   <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2 text-muted-foreground">
                       <Calendar className="w-4 h-4" />
                       {test.scheduledFor}
                     </span>
                     <span className="flex items-center gap-2 text-muted-foreground">
                       <Users className="w-4 h-4" />
                       {test.participants} participants
                     </span>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </TabsContent>
 
         {/* Other tabs show filtered content - simplified for now */}
         <TabsContent value="active" className="mt-6">
           <div className="text-center py-12 text-muted-foreground">
             Showing active tests...
           </div>
         </TabsContent>
         <TabsContent value="scheduled" className="mt-6">
           <div className="text-center py-12 text-muted-foreground">
             Showing scheduled tests...
           </div>
         </TabsContent>
         <TabsContent value="completed" className="mt-6">
           <div className="text-center py-12 text-muted-foreground">
             Showing completed tests...
           </div>
         </TabsContent>
         <TabsContent value="draft" className="mt-6">
           <div className="text-center py-12 text-muted-foreground">
             Showing draft tests...
           </div>
         </TabsContent>
       </Tabs>
     </div>
   );
 }