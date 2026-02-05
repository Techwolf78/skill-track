 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Plus,
   Search,
   Filter,
   Code,
   ListChecks,
   MoreVertical,
   Edit,
   Trash2,
   Eye,
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 
 const mcqQuestions = [
   {
     id: "1",
     question: "What is the time complexity of binary search?",
     topic: "Algorithms",
     difficulty: "Easy",
     createdAt: "2024-01-10",
   },
   {
     id: "2",
     question: "Which of the following is not a valid Python data type?",
     topic: "Python",
     difficulty: "Easy",
     createdAt: "2024-01-09",
   },
   {
     id: "3",
     question: "What is the purpose of the 'final' keyword in Java?",
     topic: "Java",
     difficulty: "Medium",
     createdAt: "2024-01-08",
   },
   {
     id: "4",
     question: "Which data structure uses LIFO principle?",
     topic: "Data Structures",
     difficulty: "Easy",
     createdAt: "2024-01-07",
   },
   {
     id: "5",
     question: "What is the difference between == and === in JavaScript?",
     topic: "JavaScript",
     difficulty: "Medium",
     createdAt: "2024-01-06",
   },
 ];
 
 const codingQuestions = [
   {
     id: "1",
     title: "Two Sum",
     topic: "Arrays",
     difficulty: "Easy",
     languages: ["Python", "Java", "C++"],
     testCases: 5,
   },
   {
     id: "2",
     title: "Reverse Linked List",
     topic: "Linked Lists",
     difficulty: "Medium",
     languages: ["Python", "Java", "C++", "C"],
     testCases: 8,
   },
   {
     id: "3",
     title: "Binary Tree Level Order",
     topic: "Trees",
     difficulty: "Medium",
     languages: ["Python", "Java"],
     testCases: 6,
   },
   {
     id: "4",
     title: "Merge Sort Implementation",
     topic: "Sorting",
     difficulty: "Hard",
     languages: ["Python", "Java", "C++", "C"],
     testCases: 10,
   },
 ];
 
 const difficultyColors = {
   Easy: "bg-success/10 text-success border-success/20",
   Medium: "bg-warning/10 text-warning border-warning/20",
   Hard: "bg-destructive/10 text-destructive border-destructive/20",
 };
 
 export default function QuestionBank() {
   const [searchTerm, setSearchTerm] = useState("");
 
   return (
     <div className="p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-heading font-bold">Question Bank</h1>
           <p className="text-muted-foreground mt-1">
             Manage your MCQ and coding questions
           </p>
         </div>
         <div className="flex items-center gap-3">
           <Button variant="outline">
             <Filter className="w-4 h-4 mr-2" />
             Filter
           </Button>
           <Button variant="hero">
             <Plus className="w-4 h-4 mr-2" />
             Add Question
           </Button>
         </div>
       </div>
 
       {/* Search */}
       <div className="relative max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="Search questions..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-10"
         />
       </div>
 
       {/* Tabs */}
       <Tabs defaultValue="mcq" className="w-full">
         <TabsList className="h-12">
           <TabsTrigger value="mcq" className="gap-2 px-6">
             <ListChecks className="w-4 h-4" />
             MCQ Questions
             <Badge variant="secondary" className="ml-1">890</Badge>
           </TabsTrigger>
           <TabsTrigger value="coding" className="gap-2 px-6">
             <Code className="w-4 h-4" />
             Coding Questions
             <Badge variant="secondary" className="ml-1">366</Badge>
           </TabsTrigger>
         </TabsList>
 
         <TabsContent value="mcq" className="mt-6">
           <div className="rounded-xl border bg-card overflow-hidden">
             <Table>
               <TableHeader>
                 <TableRow className="bg-muted/50">
                   <TableHead className="font-semibold w-[50%]">Question</TableHead>
                   <TableHead className="font-semibold">Topic</TableHead>
                   <TableHead className="font-semibold">Difficulty</TableHead>
                   <TableHead className="font-semibold">Created</TableHead>
                   <TableHead className="font-semibold text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {mcqQuestions.map((q) => (
                   <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                     <TableCell className="font-medium">{q.question}</TableCell>
                     <TableCell>
                       <Badge variant="outline">{q.topic}</Badge>
                     </TableCell>
                     <TableCell>
                       <Badge 
                         variant="outline"
                         className={difficultyColors[q.difficulty as keyof typeof difficultyColors]}
                       >
                         {q.difficulty}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-muted-foreground">{q.createdAt}</TableCell>
                     <TableCell className="text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon">
                             <MoreVertical className="w-4 h-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem>
                             <Eye className="w-4 h-4 mr-2" />
                             Preview
                           </DropdownMenuItem>
                           <DropdownMenuItem>
                             <Edit className="w-4 h-4 mr-2" />
                             Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem className="text-destructive">
                             <Trash2 className="w-4 h-4 mr-2" />
                             Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         </TabsContent>
 
         <TabsContent value="coding" className="mt-6">
           <div className="rounded-xl border bg-card overflow-hidden">
             <Table>
               <TableHeader>
                 <TableRow className="bg-muted/50">
                   <TableHead className="font-semibold">Title</TableHead>
                   <TableHead className="font-semibold">Topic</TableHead>
                   <TableHead className="font-semibold">Difficulty</TableHead>
                   <TableHead className="font-semibold">Languages</TableHead>
                   <TableHead className="font-semibold text-center">Test Cases</TableHead>
                   <TableHead className="font-semibold text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {codingQuestions.map((q) => (
                   <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                     <TableCell className="font-medium">{q.title}</TableCell>
                     <TableCell>
                       <Badge variant="outline">{q.topic}</Badge>
                     </TableCell>
                     <TableCell>
                       <Badge 
                         variant="outline"
                         className={difficultyColors[q.difficulty as keyof typeof difficultyColors]}
                       >
                         {q.difficulty}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <div className="flex gap-1 flex-wrap">
                         {q.languages.slice(0, 3).map((lang) => (
                           <Badge key={lang} variant="secondary" className="text-xs">
                             {lang}
                           </Badge>
                         ))}
                         {q.languages.length > 3 && (
                           <Badge variant="secondary" className="text-xs">
                             +{q.languages.length - 3}
                           </Badge>
                         )}
                       </div>
                     </TableCell>
                     <TableCell className="text-center font-medium">{q.testCases}</TableCell>
                     <TableCell className="text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon">
                             <MoreVertical className="w-4 h-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem>
                             <Eye className="w-4 h-4 mr-2" />
                             Preview
                           </DropdownMenuItem>
                           <DropdownMenuItem>
                             <Edit className="w-4 h-4 mr-2" />
                             Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem className="text-destructive">
                             <Trash2 className="w-4 h-4 mr-2" />
                             Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         </TabsContent>
       </Tabs>
     </div>
   );
 }