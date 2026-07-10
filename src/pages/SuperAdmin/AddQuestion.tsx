// src/pages/SuperAdmin/AddQuestion.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Code,
  ListChecks,
  Eye,
  AlertCircle,
  Terminal,
  X,
  Image as ImageIcon,
  CheckSquare,
  Circle,
  HelpCircle,
  FileText,
  Shield,
  FolderTree,
} from "lucide-react";
import {
  testService,
  Subject,
  Topic,
  Subtopic,
  McqType,
  McqOption,
  CreateQuestionRequest,
  CodeTemplateEntry,
} from "@/lib/test-service";
import { useAuth } from "@/lib/auth-context";
import { ROLES } from "@/lib/roles";
import { 
  SignatureMetadata, 
  SignatureParameter, 
  LanguageTemplates, 
  mapFrontendToBackendLang, 
  mapBackendToFrontendLang 
} from "../../types/question";
import { useToast } from "@/hooks/use-toast";
import QuickManageSubjects from "@/components/QuickManageSubjects";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  sample: boolean;
  weight: number;
  explanation?: string;
}

interface CodeTemplate {
  python3: {
    code: string;
    lang: string;
    langSlug: string;
  };
  javascript: {
    code: string;
    lang: string;
    langSlug: string;
  };
  java: {
    code: string;
    lang: string;
    langSlug: string;
  };
  cpp: {
    code: string;
    lang: string;
    langSlug: string;
  };
}

const defaultCodeTemplate: CodeTemplate = {
  python3: {
    code: `# Write your solution here

def solve():
    import sys
    data = sys.stdin.read()
    # Your code here
    print(data)

if __name__ == "__main__":
    solve()`,
    lang: "Python 3",
    langSlug: "python3",
  },
  javascript: {
    code: `// Write your solution here

function solve() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    let input = '';
    rl.on('line', (line) => {
        input += line + '\\n';
    });
    rl.on('close', () => {
        // Your code here
        console.log(input.trim());
    });
}

solve();`,
    lang: "JavaScript",
    langSlug: "javascript",
  },
  java: {
    code: `// Write your solution here

import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        StringBuilder input = new StringBuilder();
        while (sc.hasNextLine()) {
            input.append(sc.nextLine()).append("\\n");
        }
        // Your code here
        System.out.print(input.toString());
    }
}`,
    lang: "Java",
    langSlug: "java",
  },
  cpp: {
    code: `// Write your solution here

#include <iostream>
#include <string>
using namespace std;

int main() {
    string input, line;
    while (getline(cin, line)) {
        input += line + "\\n";
    }
    // Your code here
    cout << input;
    return 0;
}`,
    lang: "C++",
    langSlug: "cpp",
  },
};

const MCQ_TYPES: {
  value: McqType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "SINGLE_CORRECT",
    label: "Single Correct",
    description: "One correct answer out of multiple options",
    icon: <Circle className="w-4 h-4" />,
  },
  {
    value: "MULTIPLE_CORRECT",
    label: "Multiple Correct",
    description: "Multiple correct answers can be selected",
    icon: <CheckSquare className="w-4 h-4" />,
  },
  {
    value: "TRUE_FALSE",
    label: "True / False",
    description: "Simple true or false statement",
    icon: <HelpCircle className="w-4 h-4" />,
  },
  {
    value: "IMAGE_SINGLE_CORRECT",
    label: "Image Based (Single)",
    description: "Identify correct image option",
    icon: <ImageIcon className="w-4 h-4" />,
  },
  {
    value: "IMAGE_MULTIPLE_CORRECT",
    label: "Image Based (Multiple)",
    description: "Select multiple correct images",
    icon: <ImageIcon className="w-4 h-4" />,
  },
  {
    value: "ASSERTION_REASON",
    label: "Assertion & Reason",
    description: "Assertion and reasoning questions",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    value: "FILL_IN_THE_BLANK",
    label: "Fill in the Blank",
    description: "Complete the sentence with correct word",
    icon: <FileText className="w-4 h-4" />,
  },
];

export default function AddQuestion() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN;
  const isAuthorisedForPublic = isSuperAdmin;
  const backRoute = isSuperAdmin ? "/superadmin/questions" : "/admin/questions";
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);

  // Form state
  const [questionType, setQuestionType] = useState<"MCQ" | "CODING">("MCQ");
  const [mcqSubType, setMcqSubType] = useState<McqType>("SINGLE_CORRECT");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">(
    "MEDIUM",
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "ORG_OWNED">(
    "ORG_OWNED",
  );
  const [constraints, setConstraints] = useState("");
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [timeLimitSecs, setTimeLimitSecs] = useState<number>(1);
  const [sampleExplanation, setSampleExplanation] = useState("");
  const [hints, setHints] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([""]);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [manageSubjectsOpen, setManageSubjectsOpen] = useState(false);

  // Assertion-Reason specific
  const [assertion, setAssertion] = useState("");
  const [reason, setReason] = useState("");

  // Fill in the blank specific
  const [correctAnswer, setCorrectAnswer] = useState("");

  // MCQ Options (with image support)
  const [mcqOptions, setMcqOptions] = useState<McqOption[]>([
    { text: "", isCorrect: false, displayOrder: 1 },
    { text: "", isCorrect: false, displayOrder: 2 },
  ]);

  // Code template state for coding questions
  const [codeTemplate, setCodeTemplate] =
    useState<CodeTemplate>(defaultCodeTemplate);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("python3");

  const [signature, setSignature] = useState<SignatureMetadata>({
    method_name: "twoSum",
    params: [{ name: "nums", type: "list[int]" }, { name: "target", type: "int" }],
    return_type: "list[int]"
  });

  const [languageTemplates, setLanguageTemplates] = useState<LanguageTemplates>({
    python3: { template: "", driver: "" },
    javascript: { template: "", driver: "" },
    java: { template: "", driver: "" },
    cpp: { template: "", driver: "" }
  });

  const handleParamChange = (index: number, field: keyof SignatureParameter, value: string) => {
    const updatedParams = [...signature.params];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setSignature({ ...signature, params: updatedParams });
  };

  const addParameter = () => {
    setSignature({
      ...signature,
      params: [...signature.params, { name: `param${signature.params.length + 1}`, type: "int" }]
    });
  };

  const removeParameter = (index: number) => {
    setSignature({
      ...signature,
      params: signature.params.filter((_, i) => i !== index)
    });
  };

  const handleAutoGenerate = async () => {
    try {
      const generated = await testService.getAutoGeneratedTemplates(signature);
      const lTemplates: LanguageTemplates = {
        python3: { template: "", driver: "" },
        javascript: { template: "", driver: "" },
        java: { template: "", driver: "" },
        cpp: { template: "", driver: "" }
      };
      Object.entries(generated).forEach(([lang, data]) => {
        const frontendLang = mapBackendToFrontendLang(lang);
        lTemplates[frontendLang] = data as any;
      });
      setLanguageTemplates(lTemplates);
      toast({
        title: "Success",
        description: "Boilerplate templates and drivers generated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Codegen Failed",
        description: err.message || "Failed to auto-generate code templates.",
        variant: "destructive"
      });
    }
  };

  // Test cases state for coding questions
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "", sample: true, weight: 100 },
  ]);

  // Extended Enterprise Metadata States
  const [domain, setDomain] = useState<"ENGINEERING" | "BUSINESS" | "APTITUDE" | "CORPORATE" | "">("");
  const [cognitiveLevel, setCognitiveLevel] = useState<"REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE" | "">("");
  const [status, setStatus] = useState<"ACTIVE" | "UNDER_REVIEW" | "QUARANTINED">("ACTIVE");
  const [pValue, setPValue] = useState<string>("");
  const [discriminationIndex, setDiscriminationIndex] = useState<string>("");
  const [avgTimeSeconds, setAvgTimeSeconds] = useState<string>("");

  // Fetch subjects and all topics/subtopics on load
  const fetchInitialData = useCallback(async () => {
    try {
      const [allSubjects, allTopicsData] = await Promise.all([
        testService.getAllSubjects(),
        testService.getAllTopics(),
      ]);

      setSubjects(allSubjects);
      setAllTopics(allTopicsData);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (isSuperAdmin) {
      setVisibility("PUBLIC");
    } else {
      setVisibility("ORG_OWNED");
    }
  }, [isSuperAdmin]);

  const handleRefresh = async () => {
    try {
      const [allSubjects, allTopicsData] = await Promise.all([
        testService.getAllSubjects(),
        testService.getAllTopics(),
      ]);

      setSubjects(allSubjects);
      setAllTopics(allTopicsData);

      if (selectedSubject) {
        const filteredTopics = allTopicsData.filter((topic) => {
          return (
            topic.subjectId === selectedSubject ||
            topic.subject?.id === selectedSubject
          );
        });
        setTopics(filteredTopics);

        if (selectedTopic) {
          try {
            const subtopicsData =
              await testService.getSubtopicsByTopic(selectedTopic);
            setSubtopics(subtopicsData);
          } catch (error) {
            console.error("Failed to fetch subtopics:", error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to refresh subjects/topics:", error);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedTopic("");
    setSelectedSubtopic("");

    const filteredTopics = allTopics.filter((topic) => {
      return topic.subjectId === subjectId || topic.subject?.id === subjectId;
    });

    setTopics(filteredTopics);
    setSubtopics([]);
  };

  const handleTopicChange = (topicId: string) => {
    setSelectedTopic(topicId);
    setSelectedSubtopic("");

    if (topicId) {
      fetchSubtopicsForTopic(topicId);
    } else {
      setSubtopics([]);
    }
  };

  const fetchSubtopicsForTopic = async (topicId: string) => {
    try {
      const subtopicsData = await testService.getSubtopicsByTopic(topicId);
      setSubtopics(subtopicsData);
    } catch (error) {
      console.error("Failed to fetch subtopics:", error);
    }
  };

  // Helper to check if MCQ type supports images
  const isImageBasedMcq = () => {
    return (
      mcqSubType === "IMAGE_SINGLE_CORRECT" ||
      mcqSubType === "IMAGE_MULTIPLE_CORRECT"
    );
  };

  // Helper to check if multiple correct answers are allowed
  const isMultipleCorrect = () => {
    return (
      mcqSubType === "MULTIPLE_CORRECT" ||
      mcqSubType === "IMAGE_MULTIPLE_CORRECT"
    );
  };

  // Helper to get min options based on MCQ type
  const getMinOptions = () => {
    if (mcqSubType === "TRUE_FALSE") return 2;
    if (mcqSubType === "FILL_IN_THE_BLANK") return 1;
    return 2;
  };

  // Helper to get max options
  const getMaxOptions = () => {
    if (mcqSubType === "TRUE_FALSE") return 2;
    return 6;
  };

  // MCQ option handlers
  const handleMcqOptionChange = (index: number, text: string) => {
    const updated = [...mcqOptions];
    updated[index].text = text;
    setMcqOptions(updated);
  };

  const handleMcqOptionImageChange = (index: number, imageUrl: string) => {
    const updated = [...mcqOptions];
    updated[index].imageUrl = imageUrl;
    setMcqOptions(updated);
  };

  const handleHintChange = (index: number, value: string) => {
    const newHints = [...hints];
    newHints[index] = value;
    setHints(newHints);
  };

  const addHint = () => setHints([...hints, ""]);
  const removeHint = (index: number) =>
    setHints(hints.filter((_, i) => i !== index));

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const addTag = () => setTags([...tags, ""]);
  const removeTag = (index: number) =>
    setTags(tags.filter((_, i) => i !== index));

  const handleCorrectOptionChange = (index: number, isChecked: boolean) => {
    const updated = [...mcqOptions];

    if (isMultipleCorrect()) {
      updated[index].isCorrect = isChecked;
    } else {
      updated.forEach((opt, i) => {
        opt.isCorrect = i === index;
      });
    }

    setMcqOptions(updated);
  };

  const addMcqOption = () => {
    if (mcqOptions.length >= getMaxOptions()) {
      toast({
        title: "Warning",
        description: `Maximum ${getMaxOptions()} options allowed for this question type`,
        variant: "destructive",
      });
      return;
    }
    setMcqOptions([
      ...mcqOptions,
      { text: "", isCorrect: false, displayOrder: mcqOptions.length + 1 },
    ]);
  };

  const removeMcqOption = (index: number) => {
    if (mcqOptions.length <= getMinOptions()) {
      toast({
        title: "Error",
        description: `At least ${getMinOptions()} options are required for this question type`,
        variant: "destructive",
      });
      return;
    }
    const updated = mcqOptions.filter((_, i) => i !== index);
    updated.forEach((opt, idx) => {
      opt.displayOrder = idx + 1;
    });
    setMcqOptions(updated);
  };

  // Test case handlers
  const addTestCase = () => {
    setTestCases([
      ...testCases,
      {
        input: "",
        expectedOutput: "",
        sample: false,
        weight: 0,
        explanation: "",
      },
    ]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length <= 1) {
      toast({
        title: "Error",
        description: "At least one test case is required",
        variant: "destructive",
      });
      return;
    }
    const updated = testCases.filter((_, i) => i !== index);
    setTestCases(updated);
  };

  const updateTestCase = (
    index: number,
    field: keyof TestCase,
    value: string | boolean | number,
  ) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const getTotalWeight = () => {
    return testCases.reduce((sum, tc) => sum + tc.weight, 0);
  };

  // Validate MCQ options based on type
  const validateMcqOptions = () => {
    if (mcqSubType === "TRUE_FALSE") {
      const hasTrue = mcqOptions.some(
        (opt) => opt.text.toLowerCase() === "true",
      );
      const hasFalse = mcqOptions.some(
        (opt) => opt.text.toLowerCase() === "false",
      );
      if (!hasTrue || !hasFalse) {
        toast({
          title: "Validation Error",
          description:
            "True/False questions must have both 'True' and 'False' options",
          variant: "destructive",
        });
        return false;
      }
      return true;
    }

    if (mcqSubType === "FILL_IN_THE_BLANK") {
      if (!correctAnswer.trim()) {
        toast({
          title: "Validation Error",
          description:
            "Please provide the correct answer for fill in the blank",
          variant: "destructive",
        });
        return false;
      }
      return true;
    }

    if (mcqSubType === "ASSERTION_REASON") {
      if (!assertion.trim() || !reason.trim()) {
        toast({
          title: "Validation Error",
          description: "Both Assertion and Reason statements are required",
          variant: "destructive",
        });
        return false;
      }
      return true;
    }

    const hasEmptyOption = mcqOptions.some((opt) => !opt.text.trim());
    if (hasEmptyOption) {
      toast({
        title: "Validation Error",
        description: "All options must have text",
        variant: "destructive",
      });
      return false;
    }

    if (isImageBasedMcq()) {
      const hasEmptyImage = mcqOptions.some((opt) => !opt.imageUrl?.trim());
      if (hasEmptyImage) {
        toast({
          title: "Validation Error",
          description: "All image options must have an image URL",
          variant: "destructive",
        });
        return false;
      }
    }

    const hasCorrectOption = mcqOptions.some((opt) => opt.isCorrect);
    if (!hasCorrectOption) {
      toast({
        title: "Validation Error",
        description: `Please select ${isMultipleCorrect() ? "at least one" : "the"} correct answer`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    const isAssertionReason =
      questionType === "MCQ" && mcqSubType === "ASSERTION_REASON";

    if (!isAssertionReason && !prompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Question prompt is required",
        variant: "destructive",
      });
      return;
    }

    if (isAssertionReason && (!assertion.trim() || !reason.trim())) {
      toast({
        title: "Validation Error",
        description: "Both Assertion and Reason are required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSubject) {
      toast({
        title: "Validation Error",
        description: "Please select a subject",
        variant: "destructive",
      });
      return;
    }

    if (marks <= 0) {
      toast({
        title: "Validation Error",
        description: "Marks must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (questionType === "MCQ") {
      if (!validateMcqOptions()) return;
    }

    if (questionType === "CODING") {
      const hasEmptyInput = testCases.some((tc) => !tc.input.trim());
      const hasEmptyOutput = testCases.some((tc) => !tc.expectedOutput.trim());

      if (hasEmptyInput || hasEmptyOutput) {
        toast({
          title: "Validation Error",
          description: "All test cases must have input and expected output",
          variant: "destructive",
        });
        return;
      }

      const totalWeight = getTotalWeight();
      if (totalWeight !== 100) {
        toast({
          title: "Validation Error",
          description: `Total test case weight must be 100%. Current total: ${totalWeight}%`,
          variant: "destructive",
        });
        return;
      }

      const hasSample = testCases.some((tc) => tc.sample);
      if (!hasSample) {
        toast({
          title: "Validation Error",
          description: "At least one sample test case is required",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Build the request according to the new API DTO
      const questionData: any = {
        questionType: questionType,
        prompt: prompt,
        subject_id: selectedSubject,
        topic_id: selectedTopic || undefined,
        subtopic_id: selectedSubtopic || undefined,
        marks: marks,
        difficulty: difficulty,
        visibility: visibility,
        // Extended Enterprise Metadata
        domain: undefined,
        cognitiveLevel: undefined,
        status: undefined,
        p_value: undefined,
        discrimination_index: undefined,
        avg_time_seconds: undefined,
      };

      if (questionType === "MCQ") {
        questionData.mcqType = mcqSubType;
        questionData.shuffleOptions = shuffleOptions;
        questionData.multipleCorrect = isMultipleCorrect();

        if (mcqSubType === "ASSERTION_REASON") {
          // Combine assertion and reason into prompt
          questionData.prompt = `Assertion (A): ${assertion}. Reason (R): ${reason}.`;

          questionData.mcqOptions = [
            {
              text: "Both A and R are true and R is correct explanation of A",
              isCorrect: true,
              displayOrder: 1,
            },
            {
              text: "Both A and R are true but R is not correct explanation",
              isCorrect: false,
              displayOrder: 2,
            },
            {
              text: "A is true but R is false",
              isCorrect: false,
              displayOrder: 3,
            },
            {
              text: "A is false but R is true",
              isCorrect: false,
              displayOrder: 4,
            },
          ];
        } else {
          questionData.mcqOptions = mcqOptions;
        }
      }

      if (questionType === "CODING") {
        questionData.title = title || undefined;
        questionData.constraints = constraints || undefined;
        questionData.memoryLimitMb = memoryLimitMb;
        questionData.timeLimitSecs = timeLimitSecs;
        questionData.sampleExplanation = sampleExplanation || undefined;
        questionData.hints = hints.filter((h) => h.trim() !== "");
        questionData.tags = tags.filter((t) => t.trim() !== "");

        const filteredTemplate: Record<string, CodeTemplateEntry> = {};

        if (codeTemplate.python3?.code?.trim()) {
          filteredTemplate.python3 = codeTemplate.python3;
        }
        if (codeTemplate.javascript?.code?.trim()) {
          filteredTemplate.javascript = codeTemplate.javascript;
        }
        if (codeTemplate.java?.code?.trim()) {
          filteredTemplate.java = codeTemplate.java;
        }
        if (codeTemplate.cpp?.code?.trim()) {
          filteredTemplate.cpp = codeTemplate.cpp;
        }

        questionData.codeTemplate = filteredTemplate;
        questionData.examples = testCases
          .filter((tc) => tc.sample)
          .map((tc) => ({
            input: tc.input,
            output: tc.expectedOutput,
            explanation: tc.explanation || "",
          }));

        // Populate new signature & templates structures
        questionData.signatureMetadata = signature;
        
        const backendTemplates: Record<string, { template: string; driver: string }> = {};
        Object.entries(languageTemplates).forEach(([lang, data]) => {
          const backendLang = mapFrontendToBackendLang(lang);
          if (data.template?.trim() || data.driver?.trim()) {
            backendTemplates[backendLang] = {
              template: data.template || "",
              driver: data.driver || ""
            };
          }
        });
        questionData.languageTemplates = backendTemplates;
      }

      console.log(
        "Creating question with data:",
        JSON.stringify(questionData, null, 2),
      );

      const createdQuestion = await testService.createQuestion(questionData);

      // If coding question, create test cases with codingQuestionId
      if (questionType === "CODING" && createdQuestion.id) {
        for (const testCase of testCases) {
          await testService.createTestCase({
            codingQuestionId: createdQuestion.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            sample: testCase.sample,
            weight: testCase.weight,
            explanation: testCase.explanation,
          });
        }
      }

      toast({
        title: "Success",
        description: "Question added successfully",
      });
      navigate(backRoute);
    } catch (error) {
      console.error("Failed to create question:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = getTotalWeight();

  const renderMcqOptions = () => {
    if (mcqSubType === "ASSERTION_REASON") {
      return (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Standard Options:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>A) Both A and R are true and R is correct explanation of A</li>
            <li>B) Both A and R are true but R is not correct explanation</li>
            <li>C) A is true but R is false</li>
            <li>D) A is false but R is true</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            💡 These standard options are automatically used for Assertion &
            Reason questions.
          </p>
        </div>
      );
    }

    if (mcqSubType === "FILL_IN_THE_BLANK") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <Input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Enter the correct answer for the blank"
            />
            <p className="text-xs text-muted-foreground">
              This is the word or phrase that correctly fills in the blank
            </p>
          </div>
          <div className="space-y-2">
            <Label>Distractors (Optional)</Label>
            {mcqOptions.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option.text}
                  onChange={(e) => handleMcqOptionChange(index, e.target.value)}
                  placeholder={`Distractor ${index + 1}`}
                />
                {mcqOptions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMcqOption(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {mcqOptions.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMcqOption}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Distractor
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {mcqOptions.map((option, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              {isMultipleCorrect() ? (
                <div className="flex items-center h-5">
                  <Checkbox
                    id={`correct-${index}`}
                    checked={option.isCorrect}
                    onCheckedChange={(checked) =>
                      handleCorrectOptionChange(index, checked as boolean)
                    }
                  />
                </div>
              ) : (
                <RadioGroup
                  value={
                    mcqOptions.findIndex((opt) => opt.isCorrect) === index
                      ? index.toString()
                      : ""
                  }
                  onValueChange={() => handleCorrectOptionChange(index, true)}
                >
                  <RadioGroupItem
                    value={index.toString()}
                    id={`correct-${index}`}
                  />
                </RadioGroup>
              )}
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={option.text}
                    onChange={(e) =>
                      handleMcqOptionChange(index, e.target.value)
                    }
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  {mcqOptions.length > getMinOptions() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMcqOption(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {isImageBasedMcq() && (
                  <div className="space-y-2">
                    <Label className="text-xs">Option Image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={option.imageUrl || ""}
                        onChange={(e) =>
                          handleMcqOptionImageChange(index, e.target.value)
                        }
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 text-sm"
                      />
                      {option.imageUrl && (
                        <div className="w-16 h-16 border rounded overflow-hidden">
                          <img
                            src={option.imageUrl}
                            alt={`Option ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/api/placeholder/64/64";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {mcqOptions.length < getMaxOptions() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMcqOption}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Option
          </Button>
        )}

        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="shuffleOptions"
            checked={shuffleOptions}
            onCheckedChange={(checked) => setShuffleOptions(checked as boolean)}
          />
          <Label htmlFor="shuffleOptions" className="cursor-pointer">
            Shuffle options when displaying to candidates
          </Label>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {isMultipleCorrect()
            ? "Click the checkboxes to mark correct answers (multiple allowed)"
            : "Click the radio button to mark the correct answer"}
        </p>
      </div>
    );
  };

  // Handle difficulty change for Select component
  const handleDifficultyChange = (value: string) => {
    setDifficulty(value as "EASY" | "MEDIUM" | "HARD");
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(backRoute)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold">Add New Question</h1>
          <p className="text-muted-foreground mt-1">
            Create a new question for the question bank
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Type */}
          <Card>
            <CardHeader>
              <CardTitle>Question Type</CardTitle>
              <CardDescription>Select the type of question</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={questionType}
                onValueChange={(val) =>
                  setQuestionType(val as "MCQ" | "CODING")
                }
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MCQ" id="mcq" />
                  <Label
                    htmlFor="mcq"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <ListChecks className="w-4 h-4" />
                    Multiple Choice (MCQ)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CODING" id="coding" />
                  <Label
                    htmlFor="coding"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Code className="w-4 h-4" />
                    Coding Question
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Set the subject, topic, and question details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs flex items-center gap-1 text-primary hover:underline"
                        onClick={() => setManageSubjectsOpen(true)}
                      >
                        <FolderTree className="w-3.5 h-3.5" />
                        Manage Subjects
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs font-normal text-muted-foreground">
                        Add, rename, or delete subjects, topics, and subtopics
                        inline without discarding your draft question.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={selectedSubject}
                  onValueChange={handleSubjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Topic (Optional)</Label>
                  <Select
                    value={selectedTopic || "none"}
                    onValueChange={(value) =>
                      handleTopicChange(value === "none" ? "" : value)
                    }
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subtopic (Optional)</Label>
                  <Select
                    value={selectedSubtopic || "none"}
                    onValueChange={(value) =>
                      setSelectedSubtopic(value === "none" ? "" : value)
                    }
                    disabled={!selectedTopic}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subtopic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subtopics.map((subtopic) => (
                        <SelectItem key={subtopic.id} value={subtopic.id}>
                          {subtopic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                {questionType === "CODING" && (
                  <div className="space-y-2">
                    <Label>Question Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Two Sum"
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty {questionType === "CODING" && "*"}</Label>
                    <Select
                      value={difficulty}
                      onValueChange={handleDifficultyChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Marks *</Label>
                    <Input
                      type="number"
                      value={marks}
                      onChange={(e) => setMarks(parseInt(e.target.value) || 0)}
                      min={1}
                      max={100}
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select
                      value={visibility}
                      onValueChange={(val: "PUBLIC" | "ORG_OWNED") =>
                        setVisibility(val)
                      }
                      disabled={!isAuthorisedForPublic}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORG_OWNED">Org Owned</SelectItem>
                        {isAuthorisedForPublic && (
                          <SelectItem value="PUBLIC">Public</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {questionType === "CODING" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time Limit (Seconds)</Label>
                      <Input
                        type="number"
                        value={timeLimitSecs}
                        onChange={(e) =>
                          setTimeLimitSecs(parseFloat(e.target.value) || 0)
                        }
                        min={0.1}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Memory Limit (MB)</Label>
                      <Input
                        type="number"
                        value={memoryLimitMb}
                        onChange={(e) =>
                          setMemoryLimitMb(parseInt(e.target.value) || 0)
                        }
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Question Prompt - Hide for Assertion & Reason */}
              {!(
                questionType === "MCQ" && mcqSubType === "ASSERTION_REASON"
              ) && (
                <div className="space-y-2">
                  <Label>Question Prompt *</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your question here..."
                    rows={5}
                    className="resize-none"
                  />
                </div>
              )}
              {/* Assertion & Reason Inputs */}
              {/* Assertion & Reason Inputs */}
              {questionType === "MCQ" && mcqSubType === "ASSERTION_REASON" && (
                <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Assertion & Reason Statements
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      Required fields
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    The assertion and reason statements will be displayed to
                    candidates. The options (A, B, C, D) are automatically
                    generated.
                  </p>
                  <div className="space-y-2">
                    <Label>Assertion (A) *</Label>
                    <Textarea
                      value={assertion}
                      onChange={(e) => setAssertion(e.target.value)}
                      placeholder="Enter the assertion statement here... (e.g., 'Java is a platform-independent language.')"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (R) *</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter the reason statement here... (e.g., 'Java code is compiled into bytecode which runs on JVM.')"
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}
              {questionType === "MCQ" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>MCQ Subtype *</Label>
                    {mcqSubType === "ASSERTION_REASON" && (
                      <Badge variant="outline" className="text-xs">
                        Note: Assertion & Reason statements are added below
                        separately
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={mcqSubType}
                    onValueChange={(val) => {
                      setMcqSubType(val as McqType);
                      // Reset options based on type
                      if (val === "TRUE_FALSE") {
                        setMcqOptions([
                          { text: "True", isCorrect: false, displayOrder: 1 },
                          { text: "False", isCorrect: false, displayOrder: 2 },
                        ]);
                      } else if (val === "ASSERTION_REASON") {
                        setAssertion("");
                        setReason("");
                      } else if (val === "FILL_IN_THE_BLANK") {
                        setCorrectAnswer("");
                        setMcqOptions([
                          { text: "", isCorrect: false, displayOrder: 1 },
                        ]);
                      } else {
                        setMcqOptions([
                          { text: "", isCorrect: false, displayOrder: 1 },
                          { text: "", isCorrect: false, displayOrder: 2 },
                        ]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select MCQ subtype" />
                    </SelectTrigger>
                    <SelectContent>
                      {MCQ_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {MCQ_TYPES.find((t) => t.value === mcqSubType)?.description}
                  </p>
                </div>
              )}
              {questionType === "CODING" && (
                <>
                  <div className="space-y-2">
                    <Label>Constraints</Label>
                    <Textarea
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      placeholder="Enter problem constraints..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sample Explanation</Label>
                    <Textarea
                      value={sampleExplanation}
                      onChange={(e) => setSampleExplanation(e.target.value)}
                      placeholder="Explain the sample test cases..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Hints</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addHint}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Hint
                      </Button>
                    </div>
                    {hints.map((hint, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={hint}
                          onChange={(e) =>
                            handleHintChange(idx, e.target.value)
                          }
                          placeholder={`Hint ${idx + 1}`}
                        />
                        {hints.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeHint(idx)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tags</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addTag}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Tag
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="flex gap-1 items-center bg-muted p-1 rounded"
                        >
                          <Input
                            value={tag}
                            onChange={(e) =>
                              handleTagChange(idx, e.target.value)
                            }
                            className="h-7 w-24 text-xs"
                            placeholder="Tag"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeTag(idx)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Enterprise Taxonomy & Calibration */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Taxonomy & Calibration</CardTitle>
              <CardDescription>
                Configure enterprise domain categorization, cognitive levels, and psychometric metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Domain (Stream)</Label>
                  <Select value={domain || "none"} onValueChange={(val) => setDomain(val === "none" ? "" : (val as "ENGINEERING" | "BUSINESS" | "APTITUDE" | "CORPORATE" | ""))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Engineering Default</SelectItem>
                      <SelectItem value="ENGINEERING">Engineering (CS/IT)</SelectItem>
                      <SelectItem value="BUSINESS">MBA / BBA (Business)</SelectItem>
                      <SelectItem value="APTITUDE">Aptitude & Core</SelectItem>
                      <SelectItem value="CORPORATE">Corporate SJT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cognitive Level (Bloom's)</Label>
                  <Select value={cognitiveLevel || "none"} onValueChange={(val) => setCognitiveLevel(val === "none" ? "" : (val as "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE" | ""))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cognitive level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Apply Default</SelectItem>
                      <SelectItem value="REMEMBER">Remember</SelectItem>
                      <SelectItem value="UNDERSTAND">Understand</SelectItem>
                      <SelectItem value="APPLY">Apply</SelectItem>
                      <SelectItem value="ANALYZE">Analyze</SelectItem>
                      <SelectItem value="EVALUATE">Evaluate</SelectItem>
                      <SelectItem value="CREATE">Create</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as "ACTIVE" | "UNDER_REVIEW" | "QUARANTINED")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="QUARANTINED">Quarantined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty Index ($p$-value)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={pValue}
                    onChange={(e) => setPValue(e.target.value)}
                    placeholder="e.g., 0.42"
                  />
                  <p className="text-[10px] text-muted-foreground font-normal">Proportion of correct solves (0.0 to 1.0)</p>
                </div>

                <div className="space-y-2">
                  <Label>Discrimination Index ($D$)</Label>
                  <Input
                    type="number"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={discriminationIndex}
                    onChange={(e) => setDiscriminationIndex(e.target.value)}
                    placeholder="e.g., 0.37"
                  />
                  <p className="text-[10px] text-muted-foreground font-normal">Distinguishing power (-1.0 to 1.0)</p>
                </div>

                <div className="space-y-2">
                  <Label>Avg Solve Time (Seconds)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={avgTimeSeconds}
                    onChange={(e) => setAvgTimeSeconds(e.target.value)}
                    placeholder="e.g., 162"
                  />
                  <p className="text-[10px] text-muted-foreground font-normal">Average execution time in seconds</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MCQ Options */}
          {questionType === "MCQ" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Answer Options</CardTitle>
                    <CardDescription>
                      Add options and select the correct answer(s)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>{renderMcqOptions()}</CardContent>
            </Card>
          )}

          {/* Method Signature Configuration for Coding Questions */}
          {questionType === "CODING" && (
            <Card>
              <CardHeader>
                <CardTitle>Method Signature Configuration</CardTitle>
                <CardDescription>
                  Configure the method signature metadata to enable automatic template generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Method Name</Label>
                    <Input
                      value={signature.method_name}
                      onChange={(e) => setSignature({ ...signature, method_name: e.target.value })}
                      placeholder="e.g., twoSum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Return Type</Label>
                    <Input
                      value={signature.return_type}
                      onChange={(e) => setSignature({ ...signature, return_type: e.target.value })}
                      placeholder="e.g., list[int]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Parameters</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                      <Plus className="w-3 h-3 mr-1" /> Add Parameter
                    </Button>
                  </div>
                  
                  {signature.params.map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={param.name}
                        onChange={(e) => handleParamChange(index, "name", e.target.value)}
                        placeholder="Parameter Name (e.g. nums)"
                        className="flex-1"
                      />
                      <Input
                        value={param.type}
                        onChange={(e) => handleParamChange(index, "type", e.target.value)}
                        placeholder="Parameter Type (e.g. list[int])"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParameter(index)}
                        disabled={signature.params.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleAutoGenerate}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Code className="w-4 h-4" />
                    Auto-Generate Templates & Drivers
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Code Template for Coding Questions */}
          {questionType === "CODING" && (
            <Card>
              <CardHeader>
                <CardTitle>Code Templates & Drivers</CardTitle>
                <CardDescription>
                  Set starter code templates (candidate-facing) and execution drivers (hidden) for different programming languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={activeLanguageTab}
                  onValueChange={setActiveLanguageTab}
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="python3">Python 3</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="java">Java</TabsTrigger>
                    <TabsTrigger value="cpp">C++</TabsTrigger>
                  </TabsList>

                  {["python3", "javascript", "java", "cpp"].map((langKey) => {
                    const langLabel = langKey === "python3" ? "Python 3" : langKey === "javascript" ? "JavaScript" : langKey === "java" ? "Java" : "C++";
                    const langVersion = langKey === "python3" ? "Version: 3.9" : langKey === "javascript" ? "Version: Node.js 16" : langKey === "java" ? "Version: 17" : "Version: C++17";
                    return (
                      <TabsContent key={langKey} value={langKey} className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>{langLabel} Starter Code Template</Label>
                              <Badge variant="outline">{langVersion}</Badge>
                            </div>
                            <Textarea
                              value={languageTemplates[langKey]?.template || ""}
                              onChange={(e) =>
                                setLanguageTemplates({
                                  ...languageTemplates,
                                  [langKey]: {
                                    ...languageTemplates[langKey],
                                    template: e.target.value
                                  }
                                })
                              }
                              placeholder={`${langLabel} starter template code...`}
                              rows={15}
                              className="font-mono text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>{langLabel} Execution Driver</Label>
                              <Badge variant="secondary">Admin Only / Hidden</Badge>
                            </div>
                            <Textarea
                              value={languageTemplates[langKey]?.driver || ""}
                              onChange={(e) =>
                                setLanguageTemplates({
                                  ...languageTemplates,
                                  [langKey]: {
                                    ...languageTemplates[langKey],
                                    driver: e.target.value
                                  }
                                })
                              }
                              placeholder={`${langLabel} execution driver code...`}
                              rows={15}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Terminal className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">
                        About Code Templates & Drivers
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Candidates will only see the Starter Code Template in their editor. The Execution Driver is appended by the backend during test execution to run test cases against the candidate's code.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coding Question Test Cases */}
          {questionType === "CODING" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Test Cases</CardTitle>
                    <CardDescription>
                      Define test cases to validate candidate solutions
                    </CardDescription>
                    {totalWeight !== 100 && testCases.length > 0 && (
                      <p
                        className={`text-sm mt-2 ${totalWeight !== 100 ? "text-yellow-600" : "text-green-600"}`}
                      >
                        Total weight: {totalWeight}%{" "}
                        {totalWeight !== 100 ? "(must be 100%)" : ""}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestCase}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Test Case
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {testCases.map((testCase, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Test Case #{index + 1}</Badge>
                        {testCase.sample && (
                          <Badge
                            variant="secondary"
                            className="bg-green-500/10 text-green-500"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Sample
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTestCase(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Input</Label>
                        <Textarea
                          value={testCase.input}
                          onChange={(e) =>
                            updateTestCase(index, "input", e.target.value)
                          }
                          placeholder="Enter test input (e.g., 2 3)"
                          rows={2}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expected Output</Label>
                        <Textarea
                          value={testCase.expectedOutput}
                          onChange={(e) =>
                            updateTestCase(
                              index,
                              "expectedOutput",
                              e.target.value,
                            )
                          }
                          placeholder="Enter expected output (e.g., 5)"
                          rows={2}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`sample-${index}`}
                            checked={testCase.sample}
                            onCheckedChange={(checked) =>
                              updateTestCase(
                                index,
                                "sample",
                                checked as boolean,
                              )
                            }
                          />
                          <Label
                            htmlFor={`sample-${index}`}
                            className="cursor-pointer"
                          >
                            Sample Test Case (visible to candidates)
                          </Label>
                        </div>

                        <div className="space-y-1">
                          <Label>Weight (%)</Label>
                          <Input
                            type="number"
                            value={testCase.weight}
                            onChange={(e) =>
                              updateTestCase(
                                index,
                                "weight",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            min={0}
                            max={100}
                            step={5}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Explanation (optional)</Label>
                        <Textarea
                          value={testCase.explanation || ""}
                          onChange={(e) =>
                            updateTestCase(index, "explanation", e.target.value)
                          }
                          placeholder="Explain why this output is expected for the given input"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Code className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">About Test Cases</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>
                          • <strong>Sample test cases</strong> are visible to
                          students
                        </li>
                        <li>
                          • <strong>Hidden test cases</strong> are used for
                          final evaluation
                        </li>
                        <li>
                          • <strong>Weight</strong> determines score
                          contribution
                        </li>
                        <li>
                          • Total weight of all test cases must equal{" "}
                          <strong>100%</strong>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your question will appear</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">Question:</p>
                <p className="text-sm text-muted-foreground">
                  {prompt || "Your question will appear here"}
                </p>
              </div>
              {marks > 0 && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2">Marks:</p>
                  <Badge variant="outline">{marks} marks</Badge>
                </div>
              )}
              {questionType === "MCQ" && mcqSubType && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2">Type:</p>
                  <Badge variant="outline">
                    {MCQ_TYPES.find((t) => t.value === mcqSubType)?.label ||
                      mcqSubType}
                  </Badge>
                </div>
              )}
              {questionType === "CODING" && testCases.length > 0 && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2">Test Cases:</p>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {testCases.filter((tc) => tc.sample).length} Sample,{" "}
                      {testCases.filter((tc) => !tc.sample).length} Hidden
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${totalWeight}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total weight: {totalWeight}%
                    </p>
                  </div>
                </div>
              )}
              {questionType === "CODING" && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2">Languages:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(codeTemplate).map(
                      ([lang, template]) =>
                        template.code?.trim() && (
                          <Badge
                            key={lang}
                            variant="outline"
                            className="capitalize"
                          >
                            {lang === "python3" ? "Python" : lang}
                          </Badge>
                        ),
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Question
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(backRoute)}
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Quick Manage Subjects Dialog */}
      <QuickManageSubjects
        open={manageSubjectsOpen}
        onOpenChange={setManageSubjectsOpen}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
