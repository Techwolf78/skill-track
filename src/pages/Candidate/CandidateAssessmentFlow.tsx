import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Clock, 
  HelpCircle, 
  Play, 
  FileText, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Code2, 
  Terminal, 
  Trophy, 
  Award, 
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Sample questions data
const mockQuestions = [
  {
    id: 1,
    type: "mcq",
    section: "Core Concepts",
    text: "Which of the following is correct regarding the state changes of a component in React?",
    options: [
      "State can be mutated directly without setState/updater functions.",
      "setState call is synchronous and updates state immediately in the next line.",
      "React batches multiple state updates together for performance optimization.",
      "State is shared globally between unrelated components by default."
    ],
    correctAnswer: 2
  },
  {
    id: 2,
    type: "mcq",
    section: "Core Concepts",
    text: "What is the purpose of the dependency array in useEffect hook in React?",
    options: [
      "It makes the effect run asynchronously.",
      "It determines when the effect should re-run based on changing variables.",
      "It binds the component state to local storage data.",
      "It is used to declare children components that rely on the effect."
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    type: "coding",
    section: "Coding Arena",
    title: "Array Sum & Target Match",
    description: "Write a function sumTarget(arr, target) that returns true if any two distinct integers in the array sum up to the target value, else returns false.",
    inputFormat: "An array of integers and a single target integer.",
    outputFormat: "Boolean true or false.",
    sampleInput: "[1, 4, 8, 12], Target = 13",
    sampleOutput: "true (Since 1 + 12 = 13)",
    defaultCode: `// Complete the function below\nfunction sumTarget(arr, target) {\n  // Write your code here\n  \n  return false;\n}`
  }
];

export default function CandidateAssessmentFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "instructions" | "test" | "result">("details");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  // Test taking state
  const [selectedMcqAnswers, setSelectedMcqAnswers] = useState<Record<number, number>>({});
  const [codeValue, setCodeValue] = useState(mockQuestions[2].defaultCode);
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  
  // Timer state: 90 mins (5400 seconds)
  const [timeLeft, setTimeLeft] = useState(5400);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilerOutput, setCompilerOutput] = useState("");

  // Countdown timer effect
  useEffect(() => {
    if (step !== "test") return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit
          setStep("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStartTest = () => {
    setStep("test");
    toast.success("Assessment started! Secure browser monitoring active.");
  };

  const handleNext = () => {
    if (currentQIndex < mockQuestions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const handleMarkReview = () => {
    setMarkedForReview({
      ...markedForReview,
      [currentQIndex]: !markedForReview[currentQIndex]
    });
    toast.info(markedForReview[currentQIndex] ? "Removed review flag" : "Question marked for review.");
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setCompilerOutput("Compiling solutions...\n");
    setTimeout(() => {
      setCompilerOutput("Compiling solutions...\nExecuting Sample Test Cases...\n\nTest Case 1: PASS\nTest Case 2: PASS\n\nAll basic tests compiled successfully. (0.04s)");
      setIsCompiling(false);
      toast.success("Compilation Successful!");
    }, 1500);
  };

  const handleSubmitTest = () => {
    setIsSubmitDialogOpen(false);
    setStep("result");
    toast.success("Assessment Submitted Successfully!");
  };

  // Determine question state styles in grid
  const getQuestionState = (index: number) => {
    if (markedForReview[index]) return "bg-amber-500 border-amber-600 text-white";
    
    const q = mockQuestions[index];
    if (q.type === "mcq") {
      if (selectedMcqAnswers[q.id] !== undefined) return "bg-emerald-500 border-emerald-600 text-white";
    } else {
      if (codeValue !== q.defaultCode) return "bg-emerald-500 border-emerald-600 text-white";
    }
    return "bg-background text-foreground border-border";
  };

  return (
    <div className="w-full space-y-6">
      
      {/* STEP 1: ASSESSMENT DETAILS */}
      {step === "details" && (
        <div className="w-full space-y-6 animate-slide-up">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/candidate")} 
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>

          <Card className="border border-border/60">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  Test Invitation
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 90 Minutes Duration
                </span>
              </div>
              <CardTitle className="text-2xl font-bold font-heading">Full-Stack Web Development Assessment</CardTitle>
              <CardDescription>Evaluation scheduled for the Junior Software Developer placement pool.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-4 rounded-xl">
                <div>
                  <span className="text-muted-foreground block">Questions Count</span>
                  <span className="text-sm font-bold text-foreground">45 Questions (44 MCQs, 1 Coding)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Sections</span>
                  <span className="text-sm font-bold text-foreground">Core Concepts, System Design, Coding</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground">Syllabus Covered:</h4>
                <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Modern Web Frameworks & component state management</li>
                  <li>Asynchronous workflows, routing, and fetch paradigms</li>
                  <li>Database modeling, SQL querying logic, and index keys</li>
                  <li>Data Structures (Arrays, Objects) & Algorithms</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 p-6 flex justify-end">
              <Button 
                className="w-full md:w-auto bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1.5"
                onClick={() => setStep("instructions")}
              >
                Proceed to Instructions <ChevronRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 2: INSTRUCTIONS PAGE */}
      {step === "instructions" && (
        <div className="w-full space-y-6 animate-slide-up">
          <Button 
            variant="ghost" 
            onClick={() => setStep("details")} 
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Back Details
          </Button>

          <Card className="border border-border/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-bold font-heading flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> Exam Rules & Instructions
              </CardTitle>
              <CardDescription>Please read carefully before launching the secure test module.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warnings Box */}
              <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Proctoring Rules Active</span>
                </div>
                <p className="text-xs text-amber-800/80 leading-relaxed">
                  RxOne proctors tab navigation logs, copy-paste block registers, and fullscreen logs. Navigating away from this window more than <strong>3 times</strong> will auto-submit the exam.
                </p>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p><strong>1. Active Timer:</strong> Once started, the timer runs continuously. Closing the browser does NOT pause the exam.</p>
                <p><strong>2. Compilation:</strong> Coding problems must compile without syntax errors. Run test cases via "Compile & Run" before submitting.</p>
                <p><strong>3. Auto-save:</strong> All MCQ options chosen and code lines entered are periodically saved automatically.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/40 p-6 flex justify-end">
              <Button 
                className="w-full md:w-auto bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1.5"
                onClick={handleStartTest}
              >
                <Play className="w-4 h-4 fill-current" /> Start Assessment Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 3: EXAM SCREEN */}
      {step === "test" && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Proctoring Header */}
          <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl px-6 py-4 shadow-lg border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white">R</div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Assessment Taking</span>
                <span className="text-sm font-bold text-white block">Full-Stack Web Development</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">TIMER COUNTDOWN</span>
                <span className="text-lg font-mono font-bold text-rose-500 tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  {formatTime(timeLeft)}
                </span>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsSubmitDialogOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 font-bold"
              >
                Finish & Submit
              </Button>
            </div>
          </div>

          {/* Exam Grid Container */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Question Workspace (Left 3 columns) */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Question card */}
              <Card className="border border-border/60 min-h-[400px] flex flex-col justify-between">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex justify-between items-center flex-wrap gap-2 text-xs">
                    <span className="bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Section: {mockQuestions[currentQIndex].section}
                    </span>
                    <span className="text-muted-foreground font-semibold">
                      Question {currentQIndex + 1} of {mockQuestions.length}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="py-6 flex-1">
                  
                  {/* MCQ Question */}
                  {mockQuestions[currentQIndex].type === "mcq" && (
                    <div className="space-y-6">
                      <p className="text-sm font-bold text-foreground leading-relaxed">
                        {mockQuestions[currentQIndex].text}
                      </p>
                      
                      <RadioGroup 
                        value={selectedMcqAnswers[mockQuestions[currentQIndex].id]?.toString() || ""}
                        onValueChange={(val) => {
                          setSelectedMcqAnswers({
                            ...selectedMcqAnswers,
                            [mockQuestions[currentQIndex].id]: parseInt(val)
                          });
                        }}
                        className="space-y-3"
                      >
                        {mockQuestions[currentQIndex].options?.map((opt, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all hover:bg-muted/30 ${selectedMcqAnswers[mockQuestions[currentQIndex].id] === idx ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="text-primary border-primary" />
                            <Label htmlFor={`opt-${idx}`} className="text-xs font-semibold text-foreground cursor-pointer flex-1 leading-normal">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Coding Question */}
                  {mockQuestions[currentQIndex].type === "coding" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[350px]">
                      
                      {/* Left: Problem desc */}
                      <div className="space-y-4 pr-0 md:pr-4 md:border-r border-border/40">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-primary" />
                          <h4 className="font-bold text-foreground">{mockQuestions[currentQIndex].title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {mockQuestions[currentQIndex].description}
                        </p>
                        
                        <div className="space-y-2 text-[10px] bg-muted/40 p-3 rounded-lg">
                          <p><strong>Input Format:</strong> {mockQuestions[currentQIndex].inputFormat}</p>
                          <p><strong>Output Format:</strong> {mockQuestions[currentQIndex].outputFormat}</p>
                          <p className="font-mono text-primary bg-white/70 px-2 py-1.5 rounded mt-1 border border-border">
                            Sample Input: {mockQuestions[currentQIndex].sampleInput}<br/>
                            Sample Output: {mockQuestions[currentQIndex].sampleOutput}
                          </p>
                        </div>
                      </div>

                      {/* Right: Code Editor Simulation */}
                      <div className="flex flex-col justify-between h-full space-y-4">
                        <div className="space-y-1.5 flex-1">
                          <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Javascript Editor</span>
                            <span className="text-[10px] text-muted-foreground uppercase">ES6 Sandbox</span>
                          </Label>
                          <textarea 
                            value={codeValue}
                            onChange={(e) => setCodeValue(e.target.value)}
                            className="w-full h-60 font-mono text-xs bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                          />
                        </div>
                        
                        {/* Compiler Console output */}
                        {compilerOutput && (
                          <div className="bg-slate-900 text-slate-300 font-mono text-[9px] p-3 rounded-lg border border-slate-800 leading-normal whitespace-pre-line">
                            {compilerOutput}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 border-border gap-1.5"
                            onClick={handleCompile}
                            disabled={isCompiling}
                          >
                            <Terminal className="w-4 h-4 text-muted-foreground" /> 
                            {isCompiling ? "Compiling..." : "Compile & Run"}
                          </Button>
                        </div>
                      </div>

                    </div>
                  )}

                </CardContent>
                
                {/* Navigation actions */}
                <CardFooter className="border-t border-border/40 p-4 bg-muted/10 flex justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrev} 
                      disabled={currentQIndex === 0}
                      className="border-border"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNext} 
                      disabled={currentQIndex === mockQuestions.length - 1}
                      className="border-border"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleMarkReview}
                    className={`text-xs gap-1 ${markedForReview[currentQIndex] ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Flag Review
                  </Button>
                </CardFooter>
              </Card>

            </div>

            {/* Questions Tracker Sidebar (Right column) */}
            <div className="space-y-6">
              
              {/* Question Navigation Map */}
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Question Palette</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {mockQuestions.map((q, idx) => (
                      <button 
                        key={q.id}
                        className={`w-10 h-10 rounded-lg border font-bold text-xs flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${getQuestionState(idx)} ${currentQIndex === idx ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setCurrentQIndex(idx)}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Legend keys */}
                  <div className="border-t border-border/50 pt-3 space-y-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 block" />
                      <span>Answered</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500 border border-amber-600 block" />
                      <span>Marked for Review</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-background border border-border block animate-pulse" />
                      <span>Unanswered</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secure warnings logs */}
              <Card className="border border-border/60 bg-rose-50/10">
                <CardContent className="p-4 space-y-2 text-[10px] text-muted-foreground leading-normal">
                  <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Proctor Alert Logs:
                  </span>
                  <p>• Camera stream active & verified</p>
                  <p>• Fullscreen locked. Do not press Esc.</p>
                </CardContent>
              </Card>

            </div>

          </div>

          {/* Submit Confirm Dialog */}
          <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading">Confirm Test Submission</DialogTitle>
                <DialogDescription>Are you sure you want to finish the exam? You will not be able to change your answers.</DialogDescription>
              </DialogHeader>
              
              {/* Submission status breakdown */}
              <div className="py-4 space-y-3 text-xs">
                <p><strong>Assessment:</strong> Full-Stack Web Development</p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>MCQs Completed: {Object.keys(selectedMcqAnswers).length} / 2</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Coding Solution Entered: {codeValue !== mockQuestions[2].defaultCode ? "Yes" : "No"}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 border-border"
                  onClick={() => setIsSubmitDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-gradient-primary text-white hover:opacity-95 shadow-primary"
                  onClick={handleSubmitTest}
                >
                  Confirm Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      )}

      {/* STEP 4: RESULT SCREEN */}
      {step === "result" && (
        <div className="w-full space-y-6 animate-bounce-in text-center py-10">
          
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-primary mx-auto">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Evaluation Completed
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-foreground tracking-tight pt-1">Assessment Score Card</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your results for the 'Full-Stack Web Development Assessment' have been auto-evaluated by the compiler suite.
            </p>
          </div>

          {/* Results Summary Card */}
          <Card className="border border-border/60">
            <CardContent className="p-6 space-y-6">
              
              {/* Large Score dial */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">FINAL SCORE</span>
                <span className="text-5xl font-black text-foreground block">100%</span>
                <span className="text-xs font-semibold text-emerald-600">3 of 3 Correct</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-border/50 text-left">
                <div>
                  <span className="text-muted-foreground block">Batch Percentile</span>
                  <span className="font-bold text-foreground">98th Percentile</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Time Elapsed</span>
                  <span className="font-bold text-foreground">14 Mins 20 Secs</span>
                </div>
              </div>

            </CardContent>
            
            {/* Cert download or report action */}
            <CardFooter className="bg-muted/10 p-6 flex flex-col sm:flex-row gap-3 border-t border-border/40">
              <Button 
                variant="outline" 
                className="w-full sm:flex-1 border-border gap-1.5"
                onClick={() => toast.success("PDF Report download triggered.")}
              >
                <FileText className="w-4 h-4 text-muted-foreground" /> Download Report
              </Button>
              <Button 
                className="w-full sm:flex-1 bg-gradient-primary text-white hover:opacity-95 shadow-primary gap-1.5"
                onClick={() => navigate("/candidate/certificates")}
              >
                <Award className="w-4 h-4" /> View Certificate
              </Button>
            </CardFooter>
          </Card>

          <Button 
            variant="ghost" 
            onClick={() => navigate("/candidate")} 
            className="text-muted-foreground hover:text-foreground text-xs gap-1"
          >
            Return to Candidate Dashboard <ChevronRight className="w-3.5 h-3.5" />
          </Button>

        </div>
      )}

    </div>
  );
}
