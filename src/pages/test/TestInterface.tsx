 import { useState, useEffect } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Label } from "@/components/ui/label";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 import { cn } from "@/lib/utils";
 import {
   Clock,
   ChevronLeft,
   ChevronRight,
   Flag,
   Send,
   AlertTriangle,
   Code,
   ListChecks,
 } from "lucide-react";
 import Editor from "@monaco-editor/react";
 
 interface Question {
   id: string;
   type: "mcq" | "coding";
   question: string;
   options?: string[];
   problemStatement?: string;
   sampleInput?: string;
   sampleOutput?: string;
   marks: number;
 }
 
 const mockQuestions: Question[] = [
   {
     id: "1",
     type: "mcq",
     question: "What is the time complexity of binary search algorithm?",
     options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
     marks: 2,
   },
   {
     id: "2",
     type: "mcq",
     question: "Which data structure uses LIFO (Last In First Out) principle?",
     options: ["Queue", "Stack", "Linked List", "Tree"],
     marks: 2,
   },
   {
     id: "3",
     type: "mcq",
     question: "What does SQL stand for?",
     options: ["Structured Query Language", "Simple Query Language", "Standard Query Language", "Sequential Query Language"],
     marks: 2,
   },
   {
     id: "4",
     type: "coding",
     question: "Two Sum",
     problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
 
 You may assume that each input would have exactly one solution, and you may not use the same element twice.
 
 You can return the answer in any order.`,
     sampleInput: "nums = [2,7,11,15], target = 9",
     sampleOutput: "[0,1]",
     marks: 10,
   },
   {
     id: "5",
     type: "mcq",
     question: "Which of the following is NOT a valid Python data type?",
     options: ["List", "Dictionary", "Array", "Tuple"],
     marks: 2,
   },
 ];
 
 export default function TestInterface() {
   const [currentQuestion, setCurrentQuestion] = useState(0);
   const [answers, setAnswers] = useState<Record<string, string>>({});
   const [flagged, setFlagged] = useState<Set<string>>(new Set());
   const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
   const [showSubmitDialog, setShowSubmitDialog] = useState(false);
   const [code, setCode] = useState("// Write your code here\n\n");
   const [language, setLanguage] = useState("python");
 
   const question = mockQuestions[currentQuestion];
   const answered = Object.keys(answers).length;
   const total = mockQuestions.length;
 
   useEffect(() => {
     const timer = setInterval(() => {
       setTimeLeft((prev) => Math.max(0, prev - 1));
     }, 1000);
     return () => clearInterval(timer);
   }, []);
 
   const formatTime = (seconds: number) => {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
   };
 
   const toggleFlag = () => {
     const newFlagged = new Set(flagged);
     if (newFlagged.has(question.id)) {
       newFlagged.delete(question.id);
     } else {
       newFlagged.add(question.id);
     }
     setFlagged(newFlagged);
   };
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Header */}
       <header className="sticky top-0 z-50 bg-card border-b px-6 py-3 flex items-center justify-between">
         <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
             <span className="text-lg font-bold text-primary-foreground">A</span>
           </div>
           <div>
             <h1 className="font-heading font-semibold">Python Fundamentals Test</h1>
             <p className="text-sm text-muted-foreground">CSE 2024 - ABC Engineering</p>
           </div>
         </div>
 
         <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 text-muted-foreground">
             <span className="text-sm">Progress:</span>
             <span className="font-semibold text-foreground">{answered}/{total}</span>
           </div>
           <div className={cn(
             "flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-semibold text-lg",
             timeLeft < 300 ? "bg-destructive/10 text-destructive timer-pulse" : "bg-muted"
           )}>
             <Clock className="w-5 h-5" />
             {formatTime(timeLeft)}
           </div>
           <Button onClick={() => setShowSubmitDialog(true)} variant="hero">
             <Send className="w-4 h-4 mr-2" />
             Submit Test
           </Button>
         </div>
       </header>
 
       <div className="flex-1 flex">
         {/* Main Content */}
         <main className="flex-1 p-6">
           <AnimatePresence mode="wait">
             <motion.div
               key={question.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
               className="h-full"
             >
               {question.type === "mcq" ? (
                 /* MCQ Question */
                 <div className="max-w-3xl mx-auto space-y-6">
                   <div className="flex items-center gap-3">
                     <Badge variant="secondary" className="gap-1">
                       <ListChecks className="w-3 h-3" />
                       MCQ
                     </Badge>
                     <Badge variant="outline">{question.marks} marks</Badge>
                   </div>
 
                   <div className="rounded-xl border bg-card p-6">
                     <h2 className="text-xl font-semibold mb-6">
                       Q{currentQuestion + 1}. {question.question}
                     </h2>
 
                     <RadioGroup
                       value={answers[question.id] || ""}
                       onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                       className="space-y-3"
                     >
                       {question.options?.map((option, index) => (
                         <Label
                           key={index}
                           htmlFor={`option-${index}`}
                           className={cn(
                             "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                             answers[question.id] === option
                               ? "border-primary bg-primary/5"
                               : "hover:border-primary/50 hover:bg-muted/50"
                           )}
                         >
                           <RadioGroupItem value={option} id={`option-${index}`} />
                           <span className="flex-1">{option}</span>
                         </Label>
                       ))}
                     </RadioGroup>
                   </div>
                 </div>
               ) : (
                 /* Coding Question */
                 <div className="h-full flex gap-6">
                   {/* Problem Statement */}
                   <div className="w-1/2 space-y-4">
                     <div className="flex items-center gap-3">
                       <Badge variant="secondary" className="gap-1">
                         <Code className="w-3 h-3" />
                         Coding
                       </Badge>
                       <Badge variant="outline">{question.marks} marks</Badge>
                     </div>
 
                     <div className="rounded-xl border bg-card p-6 space-y-4">
                       <h2 className="text-xl font-semibold">
                         Q{currentQuestion + 1}. {question.question}
                       </h2>
 
                       <div className="prose prose-sm max-w-none">
                         <p className="text-muted-foreground whitespace-pre-line">
                           {question.problemStatement}
                         </p>
                       </div>
 
                       <div className="space-y-3 pt-4 border-t">
                         <div>
                           <h4 className="text-sm font-semibold mb-2">Sample Input:</h4>
                           <code className="block bg-muted p-3 rounded-lg text-sm font-mono">
                             {question.sampleInput}
                           </code>
                         </div>
                         <div>
                           <h4 className="text-sm font-semibold mb-2">Sample Output:</h4>
                           <code className="block bg-muted p-3 rounded-lg text-sm font-mono">
                             {question.sampleOutput}
                           </code>
                         </div>
                       </div>
                     </div>
                   </div>
 
                   {/* Code Editor */}
                   <div className="w-1/2 flex flex-col">
                     <div className="flex items-center justify-between mb-3">
                       <select
                         value={language}
                         onChange={(e) => setLanguage(e.target.value)}
                         className="h-9 px-3 rounded-lg border bg-card text-sm"
                       >
                         <option value="python">Python</option>
                         <option value="java">Java</option>
                         <option value="cpp">C++</option>
                         <option value="c">C</option>
                       </select>
                       <div className="flex gap-2">
                         <Button variant="outline" size="sm">
                           Run Code
                         </Button>
                         <Button variant="default" size="sm">
                           Submit
                         </Button>
                       </div>
                     </div>
                     <div className="flex-1 rounded-xl overflow-hidden border">
                       <Editor
                         height="100%"
                         language={language}
                         value={code}
                         onChange={(value) => setCode(value || "")}
                         theme="vs-dark"
                         options={{
                           minimap: { enabled: false },
                           fontSize: 14,
                           padding: { top: 16 },
                           scrollBeyondLastLine: false,
                         }}
                       />
                     </div>
                   </div>
                 </div>
               )}
             </motion.div>
           </AnimatePresence>
         </main>
 
         {/* Question Navigation Sidebar */}
         <aside className="w-72 border-l bg-card p-4 flex flex-col">
           <h3 className="font-semibold mb-4">Questions</h3>
           <div className="grid grid-cols-5 gap-2 mb-6">
             {mockQuestions.map((q, index) => (
               <button
                 key={q.id}
                 onClick={() => setCurrentQuestion(index)}
                 className={cn(
                   "question-nav-item",
                   index === currentQuestion && "current",
                   answers[q.id] ? "answered" : "unanswered",
                   flagged.has(q.id) && "ring-2 ring-warning"
                 )}
               >
                 {index + 1}
               </button>
             ))}
           </div>
 
           <div className="space-y-2 text-sm">
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded bg-success" />
               <span>Answered ({answered})</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded bg-muted" />
               <span>Not Answered ({total - answered})</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded border-2 border-warning" />
               <span>Flagged ({flagged.size})</span>
             </div>
           </div>
 
           <div className="flex-1" />
 
           {/* Navigation Buttons */}
           <div className="space-y-3 pt-4 border-t">
             <Button
               variant="outline"
               className={cn("w-full", flagged.has(question.id) && "border-warning text-warning")}
               onClick={toggleFlag}
             >
               <Flag className="w-4 h-4 mr-2" />
               {flagged.has(question.id) ? "Unflag" : "Flag for Review"}
             </Button>
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 className="flex-1"
                 disabled={currentQuestion === 0}
                 onClick={() => setCurrentQuestion(currentQuestion - 1)}
               >
                 <ChevronLeft className="w-4 h-4" />
                 Prev
               </Button>
               <Button
                 variant="outline"
                 className="flex-1"
                 disabled={currentQuestion === total - 1}
                 onClick={() => setCurrentQuestion(currentQuestion + 1)}
               >
                 Next
                 <ChevronRight className="w-4 h-4" />
               </Button>
             </div>
           </div>
         </aside>
       </div>
 
       {/* Submit Confirmation Dialog */}
       <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle className="flex items-center gap-2">
               <AlertTriangle className="w-5 h-5 text-warning" />
               Submit Test?
             </AlertDialogTitle>
             <AlertDialogDescription className="space-y-3">
               <p>Are you sure you want to submit your test? This action cannot be undone.</p>
               <div className="bg-muted rounded-lg p-4 space-y-2">
                 <p><strong>Answered:</strong> {answered} of {total} questions</p>
                 <p><strong>Flagged:</strong> {flagged.size} questions</p>
                 <p><strong>Time Remaining:</strong> {formatTime(timeLeft)}</p>
               </div>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Continue Test</AlertDialogCancel>
             <AlertDialogAction className="bg-primary hover:bg-primary-hover">
               Submit Test
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }