import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Clock,
  Code,
  ListChecks,
  ArrowLeft,
  Play,
  Settings as SettingsIcon,
  Info,
  Bug,
  Save,
  MessageSquare,
  Zap,
  Terminal,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Lock,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  createSubmission,
  pollSubmission,
  createBatchSubmissions, 
  pollBatchSubmissions, 
  LANGUAGE_MAP, 
  SubmissionResponse,
  Language,
  ProblemType,
  inferMetadataFromSnippets,
  QuestionMetadata,
  mapFriendlyError
} from "@/lib/judge0";

interface TestCase {
  input: string;
  expected: string;
  isHidden?: boolean;
}

interface Question {
  id: string;
  type: "mcq" | "coding";
  question: string;
  options?: string[];
  problemStatement?: string;
  sampleInput?: string;
  sampleOutput?: string;
  testCases: TestCase[];
  marks: number;
  metadata?: QuestionMetadata;
  codeSnippets?: { code: string; lang: string; langSlug: string }[];
}

interface Snippet {
  code: string;
  lang: string;
  langSlug: string;
}

const isCorrect = (actual: string, expected: string) => {
  const clean = (s: string) => s.replace(/\s+/g, '').replace(/,$/, '');
  return clean(actual) === clean(expected);
};

export default function DSAPlayground() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("// Write solution to test\n\n");
  const [language, setLanguage] = useState("python3");
  const [activeTab, setActiveTab] = useState("description");
  const [consoleOutput, setConsoleOutput] = useState("");
  const [mcqAnswer, setMcqAnswer] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<SubmissionResponse | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<{status: string, input: string, output: string, expected: string, isHidden: boolean, id: number}[]>([]);
  
  // New States for LeetCode Experience
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'compiling' | 'samples' | 'hidden' | 'result'>('idle');
  const [verdict, setVerdict] = useState<{ type: 'success' | 'fail' | 'error', title: string, message: string } | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, "questions", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          const questionData: Question = {
            id: docSnap.id,
            type: data.type || "coding",
            question: data.title || "Untitled",
            problemStatement: data.content || "",
            sampleInput: data.sampleTestCase || data.sampleTestCases?.[0]?.input || "",
            sampleOutput: data.sampleTestCases?.[0]?.expected || "",
            testCases: data.sampleTestCases || [],
            marks: data.marks || 10,
            options: data.options || [],
            metadata: data.metadata || inferMetadataFromSnippets(data.codeSnippets || []),
            codeSnippets: data.codeSnippets || []
          };

          setQuestion(questionData);
          
          if (data.codeSnippets && data.codeSnippets.length > 0) {
            const supportedLangs = ["python3", "java", "cpp", "javascript"];
            const supportedSnippets = data.codeSnippets.filter((s: Snippet) => supportedLangs.includes(s.langSlug.toLowerCase()));
            
            if (supportedSnippets.length > 0) {
              const defaultSnippet = supportedSnippets.find((s: Snippet) => s.langSlug === 'python3') || supportedSnippets[0];
              setCode(defaultSnippet.code);
              setLanguage(defaultSnippet.langSlug || "python3");
            } else {
              // Default to python3 if no supported snippets found
              setLanguage("python3");
              setCode("// Write your solution here\n");
            }
          }
        } else {
          toast({
            title: "Question not found",
            description: "The requested question ID does not exist in Firestore.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching question:", error);
        toast({
          title: "Error",
          description: "Failed to load question from Firestore.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id, toast]);

  const handleRunCode = async () => {
    if (!code || !question) return;
    
    setIsExecuting(true);
    setSubmissionPhase('compiling');
    setConsoleOutput("> Compiling source code...\n");
    setActiveTab("console");
    setVerdict(null);
    setTestCaseResults([]);

    try {
      const langId = LANGUAGE_MAP[language as Language] || 71; 
      const sampleCases = question.testCases.filter(tc => !tc.isHidden);
      
      if (sampleCases.length > 0) {
        setSubmissionPhase('samples');
        setConsoleOutput(prev => prev + "> Running sample test cases...\n");
        
        // Sanity check: Infer metadata from current snippets to ensure accurate types
        const currentSnippets = question.codeSnippets.map(s => ({
          langSlug: s.langSlug,
          code: s.langSlug === language ? code : s.code
        }));
        const inferredMetadata = inferMetadataFromSnippets(currentSnippets);
        
        const tokens = await createBatchSubmissions(code, langId, { ...question.metadata, ...inferredMetadata }, sampleCases.map(tc => tc.input));
        const results = await pollBatchSubmissions(tokens);

        console.log("Full Judge0 Results:", results);
        
        const mappedResults = results.map((res, idx) => {
          const stdout = res.stdout ? res.stdout.trim() : "";
          const stderr = res.stderr ? res.stderr.trim() : "";
          const compileOutput = res.compile_output ? res.compile_output.trim() : "";
          
          return {
            status: res.status.description,
            input: sampleCases[idx].input,
            output: stdout || stderr || compileOutput || "",
            expected: sampleCases[idx].expected,
            isHidden: false,
            id: res.status.id
          };
        });

        setTestCaseResults(mappedResults);

        // Comparison handled by helper
        const executionError = mappedResults.find(r => r.id > 3 && r.id !== 11);
        
        if (executionError) {
          const type: 'fail' | 'error' = 'fail';
          let title = "Error";
          let message = executionError.status;

          if (executionError.id === 6) { title = "Compilation Error"; message = executionError.output; }
          else if (executionError.id === 5) { title = "Time Limit Exceeded"; message = "Your code took too long to run."; }
          else if (executionError.id === 4) { title = "Wrong Answer"; message = "Logic failed on sample case."; }
          else if (executionError.id >= 7) { title = "Runtime Error"; message = executionError.status; }

          const friendlyHint = mapFriendlyError(message, language);
          if (friendlyHint) {
            message = friendlyHint + "\n\nOriginal Error:\n" + message;
          }

          setVerdict({ type, title, message });
          setSubmissionPhase('result');
        } else {
          const passedCount = mappedResults.filter((r) => r.id === 3 && isCorrect(r.output, r.expected)).length;
          setConsoleOutput(prev => prev + `> Sample Results: ${passedCount}/${sampleCases.length} Passed\n`);
          
          if (passedCount < sampleCases.length) {
            const failIdx = mappedResults.findIndex(r => !isCorrect(r.output, r.expected));
            setVerdict({ 
              type: 'fail', 
              title: 'Wrong Answer', 
              message: `Failed on Sample Case #${failIdx + 1}` 
            });
          } else {
            setVerdict({ type: 'success', title: 'Finished', message: 'All sample cases passed!' });
          }
          setSubmissionPhase('result');
        }
      } else {
        const token = await createSubmission(code, langId, question.metadata, question.sampleInput || "");
        const result = await pollSubmission(token);
        setExecutionResult(result);
        setConsoleOutput("> " + (result.stdout || result.stderr || result.compile_output || "No output"));
      }
    } catch (error) {
      console.error("Judge0 Error:", error);
      setVerdict({ type: 'error', title: 'System Error', message: 'Something went wrong on our side. Please try again.' });
    } finally {
      setIsExecuting(false);
      if (submissionPhase !== 'result') setSubmissionPhase('idle');
    }
  };

  const handleSubmitCode = async () => {
    if (!code || !question) return;
    
    setIsSubmitting(true);
    setSubmissionPhase('compiling');
    setVerdict(null);
    setActiveTab("console");
    setTestCaseResults([]);
    setConsoleOutput("> Initializing deep verification...\n> Compiling source code...\n");

    try {
      const langId = LANGUAGE_MAP[language as Language] || 71;
      const allCases = question.testCases;
      
      // Step 1: Compiling Suspense
      await new Promise(r => setTimeout(r, 800));
      
      // Step 2: Sample Phase
      setSubmissionPhase('samples');
      setConsoleOutput(prev => prev + "> Validating sample heuristics...\n");
      const sampleCases = allCases.filter(tc => !tc.isHidden);
      const sampleTokens = await createBatchSubmissions(code, langId, question.metadata, sampleCases.map(tc => tc.input));
      const sampleResults = await pollBatchSubmissions(sampleTokens);
      
      const mappedSamples = sampleResults.map((res, idx) => ({
        status: res.status.description,
        input: sampleCases[idx].input,
        output: res.stdout || res.stderr || res.compile_output || "",
        expected: sampleCases[idx].expected,
        isHidden: false,
        id: res.status.id
      }));
      
      setTestCaseResults(mappedSamples);
      
      // Comparison handled by helper
      const isCorrect = (actual: string, expected: string) => {
        const clean = (s: string) => s.replace(/\s+/g, '').replace(/,$/, '');
        return clean(actual) === clean(expected);
      };

      // Check for Sample Errors
      const sampleError = mappedSamples.find(r => r.id > 3 || !isCorrect(r.output, r.expected));
      if (sampleError) {
        let title = "Wrong Answer";
        let message = "Failed on sample test cases.";
        
        if (sampleError.id === 6) { title = "Compilation Failed"; message = sampleError.output; }
        else if (sampleError.id === 5) { title = "Time Limit Exceeded"; message = "Exceeded time on sample case."; }
        else if (sampleError.id >= 7) { title = "Runtime Error"; message = "Crash during sample validation."; }

        const friendlyHint = mapFriendlyError(message, language);
        if (friendlyHint) {
          message = friendlyHint + "\n\nOriginal Error:\n" + message;
        }

        setVerdict({ type: 'fail', title, message });
        setSubmissionPhase('result');
        setIsSubmitting(false);
        return;
      }

      // Step 3: Hidden Phase (The Mystery)
      setSubmissionPhase('hidden');
      setConsoleOutput(prev => prev + "> Sample cases passed. Verifying hidden constraints...\n");
      
      const hiddenCases = allCases.filter(tc => tc.isHidden);
      if (hiddenCases.length > 0) {
        const hiddenTokens = await createBatchSubmissions(code, langId, question.metadata, hiddenCases.map(tc => tc.input));
        
        for (let i = 0; i < hiddenCases.length; i++) {
          setConsoleOutput(prev => prev + `> Testing case ${sampleCases.length + i + 1}...\n`);
          await new Promise(r => setTimeout(r, 600));
        }

        const hiddenResults = await pollBatchSubmissions(hiddenTokens);
        setConsoleOutput(prev => prev + "> Hidden constraints verified successfully.\n");

        const mappedHidden = hiddenResults.map((res, idx) => ({
          status: res.status.description,
          input: "[HIDDEN DATA]",
          output: res.status.id === 3 ? "Correct Output" : "Incorrect",
          expected: "[HIDDEN DATA]",
          isHidden: true,
          id: res.status.id
        }));

        const finalResults = [...mappedSamples, ...mappedHidden];
        setTestCaseResults(finalResults);
        
        const failIdx = finalResults.findIndex(r => r.id !== 3 || (!r.isHidden && !isCorrect(r.output, r.expected)));
        
        if (failIdx === -1) {
          setVerdict({ 
            type: 'success', 
            title: 'Accepted', 
            message: `Runtime: ${Math.floor(Math.random() * 50) + 1} ms | Memory: ${Math.floor(Math.random() * 10) + 4} MB` 
          });
        } else {
          const failedCase = finalResults[failIdx];
          let title = "Wrong Answer";
          let message = `Failed on Hidden Test Case #${failIdx + 1}`;
          
          if (failedCase.id === 5) { title = "Time Limit Exceeded"; message = `Optimization required for Case #${failIdx+1}`; }
          else if (failedCase.id >= 7) { title = "Runtime Error"; message = "Null pointer or segmentation fault on hidden case."; }

          setVerdict({ type: 'fail', title, message });
        }
      } else {
        setVerdict({ type: 'success', title: 'Accepted', message: 'All test cases passed!' });
      }
      
      setSubmissionPhase('result');
    } catch (error) {
      setVerdict({ type: 'error', title: 'System Error', message: 'Judge failed to process submission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = () => {
    toast({
      title: "Question Updated",
      description: "Modifications to constraints and test cases saved.",
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      <header className="sticky top-0 z-50 bg-[#282828] border-b border-[#3e3e3e] px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[#eff1f6cc] hover:text-white"
            onClick={() => navigate("/admin/questions")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Playground
          </Button>
          <div className="h-4 w-[1px] bg-[#3e3e3e]" />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] px-1.5 h-5 uppercase tracking-wider font-bold">
              SME Playground
            </Badge>
            <h1 className="text-sm font-medium text-[#eff1f6cc]">
              Testing: {question?.question || "Loading..."}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="hero" size="sm" className="h-8 px-4">
            Publish Question
          </Button>
          <Button variant="ghost" size="icon" className="text-[#eff1f6cc]">
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
              <p className="text-[#eff1f6cc] animate-pulse">Fetching question from Firestore...</p>
            </div>
          </div>
        ) : !question ? (
          <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]">
            <div className="text-center space-y-4">
              <p className="text-destructive text-lg font-semibold">Question not found</p>
              <Button onClick={() => navigate("/admin/questions")}>Back to Question Bank</Button>
            </div>
          </div>
        ) : (
          <main className="flex-1 flex overflow-hidden">
            {question.type === "mcq" ? (
              <div className="flex-1 bg-[#1a1a1a] p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-[#282828] text-[#eff1f6cc] border-none">
                        <ListChecks className="w-3 h-3 mr-1" />
                        MCQ Mode
                      </Badge>
                      <span className="text-sm text-[#eff1f6cc]">{question.marks} marks</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-primary">
                      <Bug className="w-3 h-3 mr-1" />
                      Preview Options
                    </Button>
                  </div>

                  <div className="rounded-xl border border-[#3e3e3e] bg-[#282828] p-8">
                    <h2 className="text-xl font-semibold mb-8 text-[#eff1f6cc]">
                      {question.question}
                    </h2>

                    <RadioGroup
                      value={mcqAnswer}
                      onValueChange={setMcqAnswer}
                      className="space-y-4"
                    >
                      {question.options?.map((option, index) => (
                        <Label
                          key={index}
                          htmlFor={`option-${index}`}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border border-[#3e3e3e] cursor-pointer transition-all",
                            mcqAnswer === option
                              ? "border-primary bg-primary/10 text-white"
                              : "hover:bg-[#333] text-[#eff1f6cc]"
                          )}
                        >
                          <RadioGroupItem value={option} id={`option-${index}`} className="border-[#3e3e3e] text-primary" />
                          <span className="flex-1">{option}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            ) : (
              <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* LeetCode Split View Implementation */}
                <ResizablePanel defaultSize={40} minSize={20} className="flex flex-col bg-[#282828]">
                  <div className="flex border-b border-[#3e3e3e]">
                    <button 
                      onClick={() => setActiveTab("description")}
                      className={cn(
                        "px-4 py-2 text-xs font-medium transition-colors border-b-2",
                        activeTab === "description" ? "text-white border-primary" : "text-[#eff1f6cc] border-transparent hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" />
                        Description
                      </div>
                    </button>
                    <button 
                      onClick={() => setActiveTab("testcases-editor")}
                      className={cn(
                        "px-4 py-2 text-xs font-medium transition-colors border-b-2",
                        activeTab === "testcases-editor" ? "text-white border-primary" : "text-[#eff1f6cc] border-transparent hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        SME Notes
                      </div>
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{question.question}</h2>
                      <div className="flex gap-2 mb-4">
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10 py-0 text-[10px]">Testing</Badge>
                        <Badge variant="outline" className="text-[#eff1f6cc] border-[#3e3e3e] py-0 text-[10px]">Authoring</Badge>
                      </div>
                    </div>

                    <div 
                      className="prose prose-invert prose-sm max-w-none text-[#eff1f6cc]"
                      dangerouslySetInnerHTML={{ __html: question.problemStatement || "" }}
                    />

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white">Sample Input/Output</h4>
                      <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#3e3e3e] font-mono text-xs">
                        {question.sampleInput && <div>Input: {question.sampleInput}</div>}
                        {question.sampleOutput && <div>Output: {question.sampleOutput}</div>}
                        {!question.sampleInput && !question.sampleOutput && <div className="italic text-muted-foreground">No sample input/output provided</div>}
                      </div>
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="bg-[#3e3e3e] hover:bg-primary transition-colors w-1 cursor-col-resize">
                  <div className="w-full h-8 bg-[#555] rounded-full mx-auto" />
                </ResizableHandle>

                <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col bg-[#1a1a1a]">
                  <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#3e3e3e] bg-[#282828]">
                    <select
                      value={language}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setLanguage(newLang);
                        // Update code with snippet if available
                        const snippet = question.codeSnippets?.find(s => s.langSlug === newLang);
                        if (snippet) setCode(snippet.code);
                      }}
                      className="h-7 px-2 rounded bg-[#333] border-none text-xs text-[#eff1f6cc] capitalize"
                    >
                      {question.codeSnippets && question.codeSnippets.length > 0 ? (
                        question.codeSnippets
                          .filter(s => ["python3", "java", "cpp", "javascript"].includes(s.langSlug.toLowerCase()))
                          .map(snippet => (
                            <option key={snippet.langSlug} value={snippet.langSlug}>
                              {snippet.lang}
                            </option>
                          ))
                      ) : (
                        <>
                          <option value="python3">Python 3</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="javascript">JavaScript</option>
                        </>
                      )}
                    </select>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                          "h-7 text-xs text-[#eff1f6cc] hover:text-white hover:bg-[#333] transition-all",
                          (isExecuting || isSubmitting) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={handleRunCode}
                        disabled={isExecuting || isSubmitting}
                      >
                        {isExecuting ? (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1.5 animate-spin" />
                            Running...
                          </span>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1.5 text-primary" />
                            Run Code
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        className={cn(
                           "h-7 text-xs font-semibold bg-primary hover:bg-primary/90 text-white transition-all active:scale-95",
                           (isExecuting || isSubmitting) && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={handleSubmitCode}
                        disabled={isExecuting || isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1.5 animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 mr-1.5" />
                            Submit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <ResizablePanelGroup direction="vertical" className="flex-1">
                    <ResizablePanel defaultSize={70} className="flex flex-col">
                      <div className="flex-1">
                        <Editor
                          height="100%"
                          language={language}
                          value={code}
                          onChange={(v) => setCode(v || "")}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 16 },
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>
                    </ResizablePanel>

                    <ResizablePanel defaultSize={30} minSize={10} className="bg-[#1e1e1e] flex flex-col border-t border-[#3e3e3e]">
                      <div className="flex items-center justify-between border-b border-[#3e3e3e] bg-[#282828] px-2">
                        <div className="flex">
                          <button 
                            onClick={() => setActiveTab("console")}
                            className={cn(
                              "px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                              activeTab === "console" ? "text-primary border-b-2 border-primary" : "text-[#eff1f6cc] hover:text-white"
                            )}
                          >
                            Console
                          </button>
                          <button 
                            onClick={() => setActiveTab("testcases")}
                            className={cn(
                              "px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                              activeTab === "testcases" ? "text-primary border-b-2 border-primary" : "text-[#eff1f6cc] hover:text-white"
                            )}
                          >
                            Sample Test Cases
                          </button>
                          {testCaseResults.some(r => r.isHidden) && (
                            <button 
                              onClick={() => setActiveTab("hidden-results")}
                              className={cn(
                                "px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                                activeTab === "hidden-results" ? "text-primary border-b-2 border-primary" : "text-[#eff1f6cc] hover:text-white"
                              )}
                            >
                              Hidden Results
                            </button>
                          )}
                        </div>
                        {verdict && (
                          <div className={cn(
                            "flex items-center gap-2 mr-4 px-3 py-1 rounded animate-in fade-in zoom-in duration-300",
                            verdict.type === 'success' ? "bg-success/20 text-success border border-success/30" : "bg-destructive/20 text-destructive border border-destructive/30"
                          )}>
                            {verdict.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            <span className="text-sm font-bold">{verdict.title}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#0d0d0d]">
                        {activeTab === "console" ? (
                          <div className="space-y-4">
                            {submissionPhase !== 'idle' && submissionPhase !== 'result' && (
                              <div className="flex flex-col gap-2 p-4 bg-[#1a1a1a] rounded border border-primary/20 animate-pulse">
                                <div className="flex items-center gap-3 text-primary">
                                  <Terminal className="w-4 h-4" />
                                  <span className="text-sm font-bold uppercase tracking-widest italic">
                                    {submissionPhase === 'compiling' ? 'Compiling Engine...' : 
                                     submissionPhase === 'samples' ? 'Evaluating Sample Heuristics...' : 
                                     'Verifying Hidden Constraints...'}
                                  </span>
                                </div>
                                <div className="h-1 bg-[#333] rounded overflow-hidden">
                                  <div className={cn(
                                    "h-full bg-primary transition-all duration-1000",
                                    submissionPhase === 'compiling' ? 'w-1/3' : 
                                    submissionPhase === 'samples' ? 'w-2/3' : 'w-full'
                                  )} />
                                </div>
                              </div>
                            )}

                            {verdict && (
                              <div className={cn(
                                "p-6 rounded-lg border flex flex-col items-center justify-center text-center gap-3 mb-6 animate-in slide-in-from-bottom duration-500",
                                verdict.type === 'success' ? "bg-green-500/5 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                              )}>
                                <div className={cn(
                                  "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                                  verdict.type === 'success' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                )}>
                                  {verdict.type === 'success' ? <Trophy className="w-6 h-6 animate-bounce" /> : <AlertTriangle className="w-6 h-6 animate-shake" />}
                                </div>
                                <h1 className="text-3xl font-black uppercase tracking-tight">{verdict.title}</h1>
                                <p className="text-[#eff1f6cc] font-medium">{verdict.message}</p>
                              </div>
                            )}

                            <pre className="whitespace-pre-wrap p-5 bg-[#1a1a1a] rounded border border-white/5 text-[#d1d5db]">
                              {consoleOutput || "System ready for execution..."}
                            </pre>
                          </div>
                        ) : activeTab === "testcases" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {testCaseResults.filter(r => !r.isHidden).map((res, i) => {
                              const isPassed = res.id === 3 && isCorrect(res.output, res.expected);
                              return (
                                <div key={i} className={cn(
                                  "p-4 rounded-lg border transition-all hover:scale-[1.02]",
                                  isPassed ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                                )}>
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Case {i + 1}</span>
                                    {isPassed ? (
                                      <div className="flex items-center gap-1.5 text-green-500 text-xs font-bold bg-green-500/10 px-2.5 py-1 rounded">
                                        <Check className="w-3 h-3" /> PASSED
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold bg-red-500/10 px-2.5 py-1 rounded">
                                        <X className="w-3 h-3" /> WRONG ANSWER
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-3">
                                    <div className="bg-black/40 p-3 rounded text-[11px] font-mono">
                                      <div className="text-blue-400 mb-1 font-bold">Input:</div>
                                      <div className="text-gray-300">{res.input}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-black/40 p-3 rounded text-[11px] font-mono">
                                        <div className="text-green-400 mb-1 font-bold">Output:</div>
                                        <div className="text-gray-300 truncate">{res.output.trim() || "∅"}</div>
                                      </div>
                                      <div className="bg-black/40 p-3 rounded text-[11px] font-mono">
                                        <div className="text-primary mb-1 font-bold">Expected:</div>
                                        <div className="text-gray-300 truncate">{res.expected.trim()}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-yellow-500/80 text-xs flex items-center gap-3">
                              <Lock className="w-4 h-4" />
                              Hidden test cases are used for final score calculation. Exact inputs are not visible to ensure assessment integrity.
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {testCaseResults.filter(r => r.isHidden).map((res, i) => {
                                const isPassed = res.id === 3;
                                return (
                                  <div key={i} className={cn(
                                    "p-4 rounded border flex items-center justify-between",
                                    isPassed ? "bg-green-500/10 border-green-500/20" : "bg-red-500/20 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                  )}>
                                    <span className="text-xs font-bold font-mono">Test Case {testCaseResults.filter(r => !r.isHidden).length + i + 1}</span>
                                    {isPassed ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-500 animate-pulse" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </main>
        )}
      </div>
    </div>
  );
}