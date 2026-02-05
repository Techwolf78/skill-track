 import { useState } from "react";
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
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Plus,
   Search,
   Upload,
   Download,
   MoreVertical,
   Mail,
   Phone,
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 
 const students = [
   {
     id: "1",
     name: "Rahul Sharma",
     email: "rahul.sharma@email.com",
     phone: "+91 98765 43210",
     college: "ABC Engineering",
     batch: "CSE 2024",
     testsCompleted: 12,
     avgScore: 78,
   },
   {
     id: "2",
     name: "Priya Patel",
     email: "priya.patel@email.com",
     phone: "+91 98765 43211",
     college: "ABC Engineering",
     batch: "CSE 2024",
     testsCompleted: 10,
     avgScore: 85,
   },
   {
     id: "3",
     name: "Amit Kumar",
     email: "amit.kumar@email.com",
     phone: "+91 98765 43212",
     college: "XYZ Institute",
     batch: "IT 2024",
     testsCompleted: 8,
     avgScore: 72,
   },
   {
     id: "4",
     name: "Sneha Gupta",
     email: "sneha.gupta@email.com",
     phone: "+91 98765 43213",
     college: "Tech College",
     batch: "CSE 2025",
     testsCompleted: 15,
     avgScore: 91,
   },
   {
     id: "5",
     name: "Vikram Singh",
     email: "vikram.singh@email.com",
     phone: "+91 98765 43214",
     college: "ABC Engineering",
     batch: "MCA 2024",
     testsCompleted: 6,
     avgScore: 68,
   },
 ];
 
 export default function Students() {
   const [searchTerm, setSearchTerm] = useState("");
 
   const getScoreColor = (score: number) => {
     if (score >= 80) return "text-success";
     if (score >= 60) return "text-warning";
     return "text-destructive";
   };
 
   return (
     <div className="p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-heading font-bold">Students</h1>
           <p className="text-muted-foreground mt-1">
             Manage students across all colleges and batches
           </p>
         </div>
         <div className="flex items-center gap-3">
           <Button variant="outline">
             <Download className="w-4 h-4 mr-2" />
             Export
           </Button>
           <Button variant="outline">
             <Upload className="w-4 h-4 mr-2" />
             Bulk Upload
           </Button>
           <Button variant="hero">
             <Plus className="w-4 h-4 mr-2" />
             Add Student
           </Button>
         </div>
       </div>
 
       {/* Filters */}
       <div className="flex items-center gap-4">
         <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input
             placeholder="Search students..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-10"
           />
         </div>
         <Select>
           <SelectTrigger className="w-48">
             <SelectValue placeholder="All Colleges" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Colleges</SelectItem>
             <SelectItem value="abc">ABC Engineering</SelectItem>
             <SelectItem value="xyz">XYZ Institute</SelectItem>
             <SelectItem value="tech">Tech College</SelectItem>
           </SelectContent>
         </Select>
         <Select>
           <SelectTrigger className="w-40">
             <SelectValue placeholder="All Batches" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Batches</SelectItem>
             <SelectItem value="cse2024">CSE 2024</SelectItem>
             <SelectItem value="it2024">IT 2024</SelectItem>
             <SelectItem value="cse2025">CSE 2025</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       {/* Students Table */}
       <div className="rounded-xl border bg-card overflow-hidden">
         <Table>
           <TableHeader>
             <TableRow className="bg-muted/50">
               <TableHead className="font-semibold">Student</TableHead>
               <TableHead className="font-semibold">Contact</TableHead>
               <TableHead className="font-semibold">College</TableHead>
               <TableHead className="font-semibold">Batch</TableHead>
               <TableHead className="font-semibold text-center">Tests</TableHead>
               <TableHead className="font-semibold text-center">Avg Score</TableHead>
               <TableHead className="font-semibold text-right">Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {students.map((student) => (
               <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                 <TableCell>
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                       <span className="text-sm font-semibold text-primary-foreground">
                         {student.name.split(" ").map(n => n[0]).join("")}
                       </span>
                     </div>
                     <div>
                       <p className="font-medium">{student.name}</p>
                       <p className="text-sm text-muted-foreground">{student.email}</p>
                     </div>
                   </div>
                 </TableCell>
                 <TableCell>
                   <div className="flex items-center gap-4">
                     <span className="flex items-center gap-1 text-sm text-muted-foreground">
                       <Mail className="w-3 h-3" />
                       Email
                     </span>
                     <span className="flex items-center gap-1 text-sm text-muted-foreground">
                       <Phone className="w-3 h-3" />
                       {student.phone}
                     </span>
                   </div>
                 </TableCell>
                 <TableCell>{student.college}</TableCell>
                 <TableCell>
                   <Badge variant="outline">{student.batch}</Badge>
                 </TableCell>
                 <TableCell className="text-center font-medium">
                   {student.testsCompleted}
                 </TableCell>
                 <TableCell className="text-center">
                   <span className={`font-bold ${getScoreColor(student.avgScore)}`}>
                     {student.avgScore}%
                   </span>
                 </TableCell>
                 <TableCell className="text-right">
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon">
                         <MoreVertical className="w-4 h-4" />
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem>View Profile</DropdownMenuItem>
                       <DropdownMenuItem>View Results</DropdownMenuItem>
                       <DropdownMenuItem>Edit</DropdownMenuItem>
                       <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }