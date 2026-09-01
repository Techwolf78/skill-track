// src/pages/SuperAdmin/EditQuestion.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  X,
  Image as ImageIcon,
  CheckSquare,
  Circle,
  HelpCircle,
  FileText,
  Shield,
  Terminal,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  LayoutGrid,
} from "lucide-react";
import {
  testService,
  Subject,
  Topic,
  Subtopic,
  Question,
  TestCase,
  McqType,
  McqOption,
  UpdateQuestionRequest,
  CodeTemplateEntry,
} from "@/lib/test-service";
import { useAuth } from "@/lib/auth-context";
import { authService } from "@/lib/auth-service";
import { ROLES } from "@/lib/roles";
import {
  SignatureMetadata,
  SignatureParameter,
  LanguageTemplates,
  mapFrontendToBackendLang,
  mapBackendToFrontendLang,
  QuestionBankStatus,
  ValidateDriverResponse,
} from "../../types/question";
import { PreFlightVerificationPanel } from "@/components/admin/PreFlightVerificationPanel";
import { useToast } from "@/hooks/use-toast";
import QuickManageSubjects from "@/components/QuickManageSubjects";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TestCaseForm {
  id?: string;
  input: string;
  expectedOutput: string;
  sample: boolean;
  weight: number;
  explanation?: string;
}

interface CodeTemplate {
  python3?: { code: string; lang: string; langSlug: string };
  javascript?: { code: string; lang: string; langSlug: string };
  java?: { code: string; lang: string; langSlug: string };
  cpp?: { code: string; lang: string; langSlug: string };
}

const defaultCodeTemplate: CodeTemplate = {
  python3: {
    code: `class Solution:
    def solve(self, n: int) -> int:
        # Write your logic here
        return n + 9`,
    lang: "Python 3",
    langSlug: "python3",
  },
  javascript: {
    code: `class Solution {
    solve(n) {
        // Write your logic here
        return n + 9;
    }
}`,
    lang: "JavaScript",
    langSlug: "javascript",
  },
  java: {
    code: `class Solution {
    public int solve(int n) {
        // Write your logic here
        return n + 9;
    }
}`,
    lang: "Java",
    langSlug: "java",
  },
  cpp: {
    code: `#include <iostream>
using namespace std;
class Solution {
public:
    int solve(int n) {
        // Write your logic here
        return n + 9;
    }
};`,
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

export default function EditQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN;
  const isAuthorisedForPublic = isSuperAdmin;
  const backRoute = isSuperAdmin ? "/superadmin/questions" : "/admin/questions";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [hints, setHints] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [manageSubjectsOpen, setManageSubjectsOpen] = useState(false);

  // Assertion-Reason specific
  const [assertion, setAssertion] = useState("");
  const [reason, setReason] = useState("");

  // Fill in the blank specific
  const [correctAnswer, setCorrectAnswer] = useState("");

  // Code template for coding questions
  const [codeTemplate, setCodeTemplate] =
    useState<CodeTemplate>(defaultCodeTemplate);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("python3");
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState<number>(0);
  const [testCaseViewMode, setTestCaseViewMode] = useState<"carousel" | "grid">(
    "carousel",
  );

  const [signature, setSignature] = useState<SignatureMetadata>({
    method_name: "twoSum",
    params: [
      { name: "nums", type: "list[int]" },
      { name: "target", type: "int" },
    ],
    return_type: "list[int]",
  });

  const [languageTemplates, setLanguageTemplates] = useState<LanguageTemplates>(
    {
      python3: { template: "", driver: "" },
      javascript: { template: "", driver: "" },
      java: { template: "", driver: "" },
      cpp: { template: "", driver: "" },
    },
  );

  const [isLanguageSpecific, setIsLanguageSpecific] = useState<boolean>(false);
  const [verifiedLanguages, setVerifiedLanguages] = useState<string[]>([]);
  const [pendingLanguages, setPendingLanguages] = useState<string[]>([]);

  const handleDriverChange = (langKey: string, newDriver: string) => {
    setLanguageTemplates({
      ...languageTemplates,
      [langKey]: {
        ...languageTemplates[langKey],
        driver: newDriver,
      },
    });
    const bLang = mapFrontendToBackendLang(langKey);
    setVerifiedLanguages((prev) => prev.filter((l) => l !== bLang));
    setPendingLanguages((prev) => Array.from(new Set([...prev, bLang])));
    setStatus("UNDER_REVIEW");
  };

  const handleParamChange = (
    index: number,
    field: keyof SignatureParameter,
    value: string,
  ) => {
    const paramsList = signature.params || [];
    const updatedParams = [...paramsList];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setSignature({ ...signature, params: updatedParams });
  };

  const addParameter = () => {
    const paramsList = signature.params || [];
    setSignature({
      ...signature,
      params: [
        ...paramsList,
        { name: `param${paramsList.length + 1}`, type: "int" },
      ],
    });
  };

  const removeParameter = (index: number) => {
    const paramsList = signature.params || [];
    setSignature({
      ...signature,
      params: paramsList.filter((_, i) => i !== index),
    });
  };

  const [mcqOptions, setMcqOptions] = useState<McqOption[]>([
    { text: "", isCorrect: false, displayOrder: 1 },
    { text: "", isCorrect: false, displayOrder: 2 },
  ]);

  // Test cases state for coding questions
  const [testCases, setTestCases] = useState<TestCaseForm[]>([]);

  // Extended Enterprise Metadata States
  const [domain, setDomain] = useState<
    | "ENGINEERING"
    | "BUSINESS"
    | "APTITUDE"
    | "CORPORATE"
    | "VERBAL_ABILITY"
    | ""
  >("");
  const [cognitiveLevel, setCognitiveLevel] = useState<
    "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE" | ""
  >("");
  const [status, setStatus] = useState<QuestionBankStatus>("ACTIVE");
  const [pValue, setPValue] = useState<string>("");
  const [discriminationIndex, setDiscriminationIndex] = useState<string>("");
  const [avgTimeSeconds, setAvgTimeSeconds] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [questionData, allSubjects, allTopicsData, allTestCases] =
        await Promise.all([
          testService.getQuestionById(id!),
          testService.getAllSubjects(),
          testService.getAllTopics(),
          testService.getAllTestCases(id!),
        ]);

      console.log("Fetched Question Data:", questionData);
      console.log("Fetched All Test Cases:", allTestCases);

      setSubjects(allSubjects);
      setAllTopics(allTopicsData);

      // Set form data from fetched question
      setPrompt(questionData.prompt || "");
      setMarks(questionData.marks || 5);
      setTitle(questionData.title || "");
      setDifficulty(questionData.difficulty || "MEDIUM");
      setConstraints(questionData.constraints || "");
      setMemoryLimitMb(questionData.memoryLimitMb || 256);
      setTimeLimitSecs(questionData.timeLimitSecs || 1);
      setHints(questionData.hints || []);
      setTags(questionData.tags || []);
      setShuffleOptions(
        questionData.shuffleOptions !== undefined
          ? questionData.shuffleOptions
          : true,
      );
      setSampleExplanation(questionData.sampleExplanation || "");
      if (questionData.visibility) {
        setVisibility(questionData.visibility as "PUBLIC" | "ORG_OWNED");
      }

      // Populate Enterprise Taxonomy & Calibration
      setDomain(questionData.domain || "");
      setCognitiveLevel(questionData.cognitiveLevel || "");
      setStatus(questionData.status || "ACTIVE");
      setPValue(
        questionData.p_value !== undefined && questionData.p_value !== null
          ? questionData.p_value.toString()
          : "",
      );
      setDiscriminationIndex(
        questionData.discrimination_index !== undefined &&
          questionData.discrimination_index !== null
          ? questionData.discrimination_index.toString()
          : "",
      );
      setAvgTimeSeconds(
        questionData.avg_time_seconds !== undefined &&
          questionData.avg_time_seconds !== null
          ? questionData.avg_time_seconds.toString()
          : "",
      );

      const currentUser = authService.getCurrentUser();
      const userIsSuperAdmin = currentUser?.role === "SUPERADMIN";
      if (!userIsSuperAdmin && questionData.visibility === "PUBLIC") {
        toast({
          title: "Access Denied",
          description: "Only SuperAdmins can edit public questions",
          variant: "destructive",
        });
        navigate(backRoute);
        return;
      }

      // Handle question type
      const qType = questionData.questionType;
      const questionTypeValue = qType === "CODING" ? "CODING" : "MCQ";
      setQuestionType(questionTypeValue);

      // Handle MCQ subtype
      if (questionTypeValue === "MCQ" && questionData.mcqType) {
        setMcqSubType(questionData.mcqType);
      }

      // Handle Assertion-Reason specific fields
      if (questionData.mcqType === "ASSERTION_REASON") {
        if (questionData.assertion) setAssertion(questionData.assertion);
        if (questionData.reason) setReason(questionData.reason);

        // Extract from prompt if missing
        if (!questionData.assertion || !questionData.reason) {
          const match = questionData.prompt?.match(
            /Assertion \(A\): (.*?)\.? Reason \(R\): (.*?)\.?$/,
          );
          if (match) {
            if (!questionData.assertion) setAssertion(match[1]);
            if (!questionData.reason) setReason(match[2]);
          }
        }
      }
      if (questionData.correctAnswer)
        setCorrectAnswer(questionData.correctAnswer);

      // Handle code template for coding questions
      if (questionTypeValue === "CODING") {
        if (questionData.codeTemplate) {
          const template = questionData.codeTemplate;
          setCodeTemplate({
            python3: template.python3 || defaultCodeTemplate.python3,
            javascript: template.javascript || defaultCodeTemplate.javascript,
            java: template.java || defaultCodeTemplate.java,
            cpp: template.cpp || defaultCodeTemplate.cpp,
          });
        }
        if (questionData.signatureMetadata) {
          setSignature({
            method_name: questionData.signatureMetadata.method_name || "",
            return_type: questionData.signatureMetadata.return_type || "",
            params: Array.isArray(questionData.signatureMetadata.params)
              ? questionData.signatureMetadata.params
              : [],
          });
        }
        if (questionData.languageTemplates) {
          const lTemplates: LanguageTemplates = {
            python3: { template: "", driver: "" },
            javascript: { template: "", driver: "" },
            java: { template: "", driver: "" },
            cpp: { template: "", driver: "" },
          };
          Object.entries(questionData.languageTemplates).forEach(
            ([lang, data]) => {
              const frontendLang = mapBackendToFrontendLang(lang);
              const entry = data as { template?: string; driver?: string };
              lTemplates[frontendLang] = {
                template: entry.template || "",
                driver: entry.driver || "",
              };
            },
          );
          setLanguageTemplates(lTemplates);
        }
        if (questionData.isLanguageSpecific !== undefined && questionData.isLanguageSpecific !== null) {
          setIsLanguageSpecific(questionData.isLanguageSpecific);
        }
        if (questionData.verifiedLanguages) {
          setVerifiedLanguages(questionData.verifiedLanguages);
        }
        if (questionData.pendingLanguages) {
          setPendingLanguages(questionData.pendingLanguages);
        }
      }

      // Extract IDs - use snake_case from backend with camelCase fallback
      const subjectId =
        questionData.subject_id ||
        questionData.subject?.id ||
        questionData.subjectId;
      const topicId =
        questionData.topic_id || questionData.topic?.id || questionData.topicId;
      const subtopicId =
        questionData.subtopic_id ||
        questionData.subtopic?.id ||
        questionData.subtopicId;

      setSelectedSubject(subjectId || "");

      if (subjectId) {
        // Filter topics for this subject
        const filteredTopics = allTopicsData.filter((topic) => {
          return (
            topic.subjectId === subjectId || topic.subject?.id === subjectId
          );
        });
        setTopics(filteredTopics);
        setSelectedTopic(topicId || "");
        setSelectedSubtopic(subtopicId || "");

        // Fetch subtopics if topic is selected
        if (topicId) {
          try {
            const subtopicsData =
              await testService.getSubtopicsByTopic(topicId);
            setSubtopics(subtopicsData);
          } catch (error) {
            console.error("Failed to fetch subtopics:", error);
          }
        }
      }

      // Handle MCQ options
      if (questionData.mcqOptions && questionData.mcqOptions.length > 0) {
        const parsedOptions = questionData.mcqOptions.map(
          (opt: McqOption, idx: number) => ({
            text: opt.text || "",
            imageUrl: opt.imageUrl,
            isCorrect: opt.isCorrect || false,
            displayOrder: opt.displayOrder || idx + 1,
          }),
        );
        setMcqOptions(parsedOptions);
      } else {
        // Default options based on subtype
        if (questionData.mcqType === "TRUE_FALSE") {
          setMcqOptions([
            { text: "True", isCorrect: false, displayOrder: 1 },
            { text: "False", isCorrect: false, displayOrder: 2 },
          ]);
        } else if (questionData.mcqType === "ASSERTION_REASON") {
          setMcqOptions([
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
          ]);
        } else if (questionData.mcqType === "FILL_IN_THE_BLANK") {
          setMcqOptions([{ text: "", isCorrect: false, displayOrder: 1 }]);
        } else {
          setMcqOptions([
            { text: "", isCorrect: false, displayOrder: 1 },
            { text: "", isCorrect: false, displayOrder: 2 },
          ]);
        }
      }

      // Handle test cases for coding questions - filter by codingQuestionId
      if (questionTypeValue === "CODING") {
        const questionTestCases = allTestCases.filter(
          (tc) => tc.codingQuestionId === id,
        );

        if (questionTestCases.length > 0) {
          setTestCases(
            questionTestCases.map((tc) => ({
              id: tc.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              sample: tc.sample,
              weight: tc.weight,
              explanation: tc.explanation || "",
            })),
          );
        } else {
          // Default test case if none exist
          setTestCases([
            { input: "", expectedOutput: "", sample: true, weight: 100 },
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load question",
        variant: "destructive",
      });
      navigate(backRoute);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast, backRoute]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setSubtopics([]);

    const filteredTopics = allTopics.filter((topic) => {
      return topic.subjectId === subjectId || topic.subject?.id === subjectId;
    });
    setTopics(filteredTopics);
  };

  const handleTopicChange = async (topicId: string) => {
    setSelectedTopic(topicId);
    setSelectedSubtopic("");

    if (topicId) {
      try {
        const subtopicsData = await testService.getSubtopicsByTopic(topicId);
        setSubtopics(subtopicsData);
      } catch (error) {
        console.error("Failed to fetch subtopics:", error);
        setSubtopics([]);
      }
    } else {
      setSubtopics([]);
    }
  };

  const handleDifficultyChange = (value: string) => {
    setDifficulty(value as "EASY" | "MEDIUM" | "HARD");
  };

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

  const isMultipleCorrect = () => {
    return (
      mcqSubType === "MULTIPLE_CORRECT" ||
      mcqSubType === "IMAGE_MULTIPLE_CORRECT"
    );
  };

  const isImageBased = () => {
    return (
      mcqSubType === "IMAGE_SINGLE_CORRECT" ||
      mcqSubType === "IMAGE_MULTIPLE_CORRECT"
    );
  };

  const handleCorrectOptionChange = (index: number, isChecked?: boolean) => {
    if (isMultipleCorrect()) {
      const updated = [...mcqOptions];
      updated[index].isCorrect =
        isChecked !== undefined ? isChecked : !updated[index].isCorrect;
      setMcqOptions(updated);
    } else {
      const updated = mcqOptions.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      setMcqOptions(updated);
    }
  };

  const addMcqOption = () => {
    const maxOptions = mcqSubType === "TRUE_FALSE" ? 2 : 6;
    if (mcqOptions.length >= maxOptions) {
      toast({
        title: "Warning",
        description: `Maximum ${maxOptions} options allowed`,
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
    const minOptions = mcqSubType === "FILL_IN_THE_BLANK" ? 1 : 2;
    if (mcqOptions.length <= minOptions) {
      toast({
        title: "Error",
        description: `At least ${minOptions} option${minOptions > 1 ? "s are" : " is"} required`,
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
    field: keyof TestCaseForm,
    value: string | boolean | number,
  ) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const getTotalWeight = () => {
    return testCases.reduce((sum, tc) => sum + tc.weight, 0);
  };

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

    // Regular MCQ validation
    const hasEmptyOption = mcqOptions.some((opt) => !opt.text.trim());
    if (hasEmptyOption) {
      toast({
        title: "Validation Error",
        description: "All options must have text",
        variant: "destructive",
      });
      return false;
    }

    if (isImageBased()) {
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

  // Helper to determine if options preview should be shown
  const shouldShowOptionsPreview = () => {
    if (questionType !== "MCQ") return false;
    if (!mcqOptions.some((opt) => opt.text)) return false;
    // Only show for these specific types
    return (
      mcqSubType === "SINGLE_CORRECT" ||
      mcqSubType === "MULTIPLE_CORRECT" ||
      mcqSubType === "TRUE_FALSE" ||
      mcqSubType === "IMAGE_SINGLE_CORRECT" ||
      mcqSubType === "IMAGE_MULTIPLE_CORRECT"
    );
  };

  const handleUpdate = async () => {
    // Validation
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

    setSaving(true);
    try {
      const questionData: Record<string, any> = {
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
        const langsToCheck = isLanguageSpecific
          ? [activeLanguageTab]
          : ["python3", "javascript", "java", "cpp"];

        for (const lang of langsToCheck) {
          const t = languageTemplates[lang]?.template?.trim();
          const d = languageTemplates[lang]?.driver?.trim();
          const langDisplay = lang === "python3" ? "Python 3" : lang === "javascript" ? "JavaScript" : lang === "java" ? "Java" : "C++";
          if (!t) {
            toast({
              title: "Validation Error",
              description: `Starter code template for ${langDisplay} cannot be empty.`,
              variant: "destructive",
            });
            setSaving(false);
            return;
          }
          if (!d) {
            toast({
              title: "Validation Error",
              description: `Execution driver for ${langDisplay} cannot be empty.`,
              variant: "destructive",
            });
            setSaving(false);
            return;
          }
        }

        questionData.title = title || undefined;
        questionData.constraints = constraints || undefined;
        questionData.memoryLimitMb = memoryLimitMb;
        questionData.timeLimitSecs = timeLimitSecs;
        questionData.sampleExplanation = sampleExplanation || undefined;
        questionData.hints = hints.filter((h) => h.trim() !== "");
        questionData.tags = tags.filter((t) => t.trim() !== "");

        questionData.examples = testCases
          .filter((tc) => tc.sample)
          .map((tc) => ({
            input: tc.input,
            output: tc.expectedOutput,
            explanation: tc.explanation || "",
          }));

        const backendTemplates: Record<
          string,
          { template: string; driver: string }
        > = {};
        if (isLanguageSpecific) {
          const backendLang = mapFrontendToBackendLang(activeLanguageTab);
          backendTemplates[backendLang] = {
            template: languageTemplates[activeLanguageTab]?.template || "",
            driver: languageTemplates[activeLanguageTab]?.driver || "",
          };
        } else {
          Object.entries(languageTemplates).forEach(([lang, data]) => {
            const backendLang = mapFrontendToBackendLang(lang);
            backendTemplates[backendLang] = {
              template: data.template || "",
              driver: data.driver || "",
            };
          });
        }
        questionData.isLanguageSpecific = isLanguageSpecific;
        questionData.languageTemplates = backendTemplates;

        const declaredLangs = Object.keys(backendTemplates);
        const allPassed = declaredLangs.length > 0 && declaredLangs.every((l) => verifiedLanguages.includes(l));
        questionData.status = allPassed ? "ACTIVE" : "UNDER_REVIEW";

        questionData.signatureMetadata = signature;
      }

      console.log("Updating question with data:", questionData);
      await testService.updateQuestion(id!, questionData);

      // If coding question, update test cases with codingQuestionId
      if (questionType === "CODING") {
        // Get existing test cases
        const existingTestCases = await testService.getAllTestCases(id!);
        const questionTestCases = existingTestCases.filter(
          (tc) => tc.codingQuestionId === id,
        );

        // Delete test cases that were removed
        const existingIds = new Set(questionTestCases.map((tc) => tc.id));
        const currentIds = new Set(
          testCases.filter((tc) => tc.id).map((tc) => tc.id),
        );
        const idsToDelete = [...existingIds].filter(
          (testId) => !currentIds.has(testId),
        );

        for (const testCaseId of idsToDelete) {
          await testService.deleteTestCase(testCaseId!);
        }

        // Create or update test cases
        for (const testCase of testCases) {
          if (testCase.id) {
            // Update existing
            await testService.updateTestCase(testCase.id, {
              codingQuestionId: id,
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              sample: testCase.sample,
              weight: testCase.weight,
              explanation: testCase.explanation,
            });
          } else {
            // Create new
            await testService.createTestCase({
              codingQuestionId: id!,
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              sample: testCase.sample,
              weight: testCase.weight,
              explanation: testCase.explanation,
            });
          }
        }
      }

      toast({
        title: "Success",
        description: "Question updated successfully",
      });
      navigate(backRoute);
    } catch (error) {
      console.error("Failed to update question:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = getTotalWeight();

  // Render MCQ options based on type
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

    // Regular MCQ options (with image support)
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
                  onValueChange={() => handleCorrectOptionChange(index)}
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
                  {mcqOptions.length >
                    (mcqSubType === "TRUE_FALSE" ? 2 : 2) && (
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

                {isImageBased() && (
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

        {mcqOptions.length < (mcqSubType === "TRUE_FALSE" ? 2 : 6) && (
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(backRoute)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold">Edit Question</h1>
          <p className="text-muted-foreground mt-1">
            Update question details and configuration
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Question Type */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Question Type</CardTitle>
                  <CardDescription>
                    This field is read-only in edit mode
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10">
                  {questionType === "MCQ" ? "MCQ" : "Coding"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/20 p-4 border">
                <div className="flex items-center gap-3">
                  {questionType === "MCQ" ? (
                    <ListChecks className="w-8 h-8 text-primary" />
                  ) : (
                    <Code className="w-8 h-8 text-primary" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {questionType === "MCQ"
                        ? "Multiple Choice Question"
                        : "Coding Challenge"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {questionType === "MCQ"
                        ? "Candidates select correct answer(s) from multiple options"
                        : "Candidates write code to solve a programming problem"}
                    </p>
                  </div>
                </div>
              </div>
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
                      {topics.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {selectedSubject
                            ? "No topics available"
                            : "Select a subject first"}
                        </div>
                      ) : (
                        topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))
                      )}
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
                      {subtopics.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {selectedTopic
                            ? "No subtopics available"
                            : "Select a topic first"}
                        </div>
                      ) : (
                        subtopics.map((subtopic) => (
                          <SelectItem key={subtopic.id} value={subtopic.id}>
                            {subtopic.name}
                          </SelectItem>
                        ))
                      )}
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
              {questionType === "MCQ" && mcqSubType === "ASSERTION_REASON" && (
                <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                  <div className="space-y-2">
                    <Label>Assertion (A)</Label>
                    <Textarea
                      value={assertion}
                      onChange={(e) => setAssertion(e.target.value)}
                      placeholder="Enter the assertion statement..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (R)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter the reason statement..."
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {questionType === "MCQ" && (
                <div className="space-y-2">
                  <Label>MCQ Subtype</Label>
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
                        {hints.length > 0 && (
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
                Configure enterprise domain categorization, cognitive levels,
                and psychometric metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Domain (Stream)</Label>
                  <Select
                    value={domain || "none"}
                    onValueChange={(val) =>
                      setDomain(
                        val === "none"
                          ? ""
                          : (val as
                              | "ENGINEERING"
                              | "BUSINESS"
                              | "APTITUDE"
                              | "CORPORATE"
                              | "VERBAL_ABILITY"
                              | ""),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        None / Engineering Default
                      </SelectItem>
                      <SelectItem value="ENGINEERING">
                        Engineering (CS/IT)
                      </SelectItem>
                      <SelectItem value="BUSINESS">
                        MBA / BBA (Business)
                      </SelectItem>
                      <SelectItem value="APTITUDE">Aptitude & Core</SelectItem>
                      <SelectItem value="CORPORATE">Corporate SJT</SelectItem>
                      <SelectItem value="VERBAL_ABILITY">
                        Verbal Ability & Communication
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cognitive Level (Bloom's)</Label>
                  <Select
                    value={cognitiveLevel || "none"}
                    onValueChange={(val) =>
                      setCognitiveLevel(
                        val === "none"
                          ? ""
                          : (val as
                              | "REMEMBER"
                              | "UNDERSTAND"
                              | "APPLY"
                              | "ANALYZE"
                              | "EVALUATE"
                              | "CREATE"
                              | ""),
                      )
                    }
                  >
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
                  <Select
                    value={status}
                    onValueChange={(val) =>
                      setStatus(
                        val as "ACTIVE" | "UNDER_REVIEW" | "QUARANTINED",
                      )
                    }
                  >
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
                  <p className="text-[10px] text-muted-foreground font-normal">
                    Proportion of correct solves (0.0 to 1.0)
                  </p>
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
                  <p className="text-[10px] text-muted-foreground font-normal">
                    Distinguishing power (-1.0 to 1.0)
                  </p>
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
                  <p className="text-[10px] text-muted-foreground font-normal">
                    Average execution time in seconds
                  </p>
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
                  Configure the method signature metadata to enable automatic
                  template generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Method Name</Label>
                    <Input
                      value={signature.method_name}
                      onChange={(e) =>
                        setSignature({
                          ...signature,
                          method_name: e.target.value,
                        })
                      }
                      placeholder="e.g., twoSum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Return Type</Label>
                    <Input
                      value={signature.return_type}
                      onChange={(e) =>
                        setSignature({
                          ...signature,
                          return_type: e.target.value,
                        })
                      }
                      placeholder="e.g., list[int]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Parameters</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addParameter}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Parameter
                    </Button>
                  </div>

                  {(signature?.params || []).map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={param.name}
                        onChange={(e) =>
                          handleParamChange(index, "name", e.target.value)
                        }
                        placeholder="Parameter Name (e.g. nums)"
                        className="flex-1"
                      />
                      <Input
                        value={param.type}
                        onChange={(e) =>
                          handleParamChange(index, "type", e.target.value)
                        }
                        placeholder="Parameter Type (e.g. list[int])"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParameter(index)}
                        disabled={(signature?.params || []).length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Code Template for Coding Questions */}
          {questionType === "CODING" && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Code Templates & Drivers</CardTitle>
                    <CardDescription>
                      Set starter code templates (candidate-facing) and execution drivers (hidden) per language
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border">
                    <div className="text-xs">
                      <span className="font-semibold block">Language-Specific</span>
                      <span className="text-[10px] text-muted-foreground">Restrict to 1 language</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isLanguageSpecific}
                      onChange={(e) => setIsLanguageSpecific(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={activeLanguageTab}
                  onValueChange={setActiveLanguageTab}
                >
                  <TabsList className="grid w-full grid-cols-4 bg-muted/60 p-1">
                    {[
                      { id: "python3", bLang: "python", label: "Python 3" },
                      { id: "javascript", bLang: "javascript", label: "JavaScript" },
                      { id: "java", bLang: "java", label: "Java" },
                      { id: "cpp", bLang: "cpp", label: "C++" },
                    ].map((lang) => {
                      const isVerified = verifiedLanguages.includes(lang.bLang);
                      return (
                        <TabsTrigger key={lang.id} value={lang.id} className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                          <span>{lang.label}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ({isVerified ? "Verified" : "Pending"})
                          </span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {["python3", "javascript", "java", "cpp"].map((langKey) => {
                    const langLabel =
                      langKey === "python3"
                        ? "Python 3"
                        : langKey === "javascript"
                          ? "JavaScript"
                          : langKey === "java"
                            ? "Java"
                            : "C++";
                    const langVersion =
                      langKey === "python3"
                        ? "Version: 3.9"
                        : langKey === "javascript"
                          ? "Version: Node.js 16"
                          : langKey === "java"
                            ? "Version: 17"
                            : "Version: C++17";
                    const bLang = mapFrontendToBackendLang(langKey);
                    const isVerified = verifiedLanguages.includes(bLang);

                    return (
                      <TabsContent
                        key={langKey}
                        value={langKey}
                        className="space-y-4 mt-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>{langLabel} Starter Code Template *</Label>
                              <Badge variant="outline">{langVersion}</Badge>
                            </div>
                            <Textarea
                              value={languageTemplates[langKey]?.template || ""}
                              onChange={(e) =>
                                setLanguageTemplates({
                                  ...languageTemplates,
                                  [langKey]: {
                                    ...languageTemplates[langKey],
                                    template: e.target.value,
                                  },
                                })
                              }
                              placeholder={`${langLabel} starter template code...`}
                              rows={14}
                              className="font-mono text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>{langLabel} Execution Driver *</Label>
                              <Badge variant="secondary">
                                Admin Only / Hidden
                              </Badge>
                            </div>
                            <Textarea
                              value={languageTemplates[langKey]?.driver || ""}
                              onChange={(e) => handleDriverChange(langKey, e.target.value)}
                              placeholder={`${langLabel} execution driver code...`}
                              rows={14}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>

                        {/* Interactive Pre-Flight Verification Panel */}
                        <PreFlightVerificationPanel
                          questionId={id}
                          language={langKey}
                          driverCode={languageTemplates[langKey]?.driver || ""}
                          testCases={testCases.map((tc, idx) => ({ ...tc, id: tc.id || `tc-${idx}`, codingQuestionId: id || "" }))}
                          onSaveFirstRequired={async () => {
                            if (!id) return undefined;
                            const backendTemplates = isLanguageSpecific
                              ? { [mapFrontendToBackendLang(activeLanguageTab)]: { template: languageTemplates[activeLanguageTab]?.template || "", driver: languageTemplates[activeLanguageTab]?.driver || "" } }
                              : {
                                  python: { template: languageTemplates.python3?.template || "", driver: languageTemplates.python3?.driver || "" },
                                  javascript: { template: languageTemplates.javascript?.template || "", driver: languageTemplates.javascript?.driver || "" },
                                  java: { template: languageTemplates.java?.template || "", driver: languageTemplates.java?.driver || "" },
                                  cpp: { template: languageTemplates.cpp?.template || "", driver: languageTemplates.cpp?.driver || "" },
                                };
                            const validTestCases = testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
                            await testService.updateQuestion(id, {
                              title: title.trim(),
                              prompt: prompt.trim(),
                              subject_id: selectedSubject,
                              topic_id: selectedTopic || undefined,
                              subtopic_id: selectedSubtopic || undefined,
                              difficulty,
                              marks,
                              timeLimitSecs: Number(timeLimitSecs) || 2,
                              memoryLimitMb: Number(memoryLimitMb) || 256,
                              constraints: constraints.trim() || undefined,
                              sampleExplanation: sampleExplanation.trim() || undefined,
                              isLanguageSpecific,
                              testCases: validTestCases,
                              languageTemplates: backendTemplates,
                              signatureMetadata: signature,
                            });
                            return id;
                          }}
                          onVerificationSuccess={(res) => {
                            setVerifiedLanguages((prev) => Array.from(new Set([...prev, bLang])));
                            setPendingLanguages((prev) => prev.filter((l) => l !== bLang));
                            if (res.questionStatus) {
                              setStatus(res.questionStatus);
                            }
                          }}
                        />
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
                        Candidates will only see the Starter Code Template in
                        their editor. The Execution Driver is appended by the
                        backend during test execution to run test cases against
                        the candidate's code. Both fields are required for saving.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Coding Question Test Cases */}
          {questionType === "CODING" && (
            <Card className="border border-orange-200 bg-orange-50/40 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-100/70 via-orange-50/50 to-amber-50/30 border-b border-orange-200/80 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-slate-900">
                        Test Cases ({testCases.length})
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs"
                      >
                        {testCases.filter((tc) => tc.sample).length} Sample
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-orange-100 text-orange-900 border-orange-300 font-bold text-xs"
                      >
                        {testCases.filter((tc) => !tc.sample).length} Hidden
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-600 mt-1 font-medium">
                      Define sample (visible) and hidden test cases for
                      candidate evaluation
                    </CardDescription>
                    {totalWeight !== 100 && testCases.length > 0 && (
                      <p className="text-xs font-bold mt-1 text-orange-600">
                        Total weight: {totalWeight}% (must equal 100%)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-orange-200 rounded-lg p-0.5 bg-orange-100/60">
                      <Button
                        type="button"
                        variant={
                          testCaseViewMode === "carousel" ? "default" : "ghost"
                        }
                        size="sm"
                        className={`px-2.5 py-1 h-7 text-xs flex items-center gap-1 font-semibold ${
                          testCaseViewMode === "carousel"
                            ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                            : "text-slate-700 hover:bg-orange-200/60"
                        }`}
                        onClick={() => setTestCaseViewMode("carousel")}
                      >
                        <Eye className="w-3.5 h-3.5" /> Carousel
                      </Button>
                      <Button
                        type="button"
                        variant={
                          testCaseViewMode === "grid" ? "default" : "ghost"
                        }
                        size="sm"
                        className={`px-2.5 py-1 h-7 text-xs flex items-center gap-1 font-semibold ${
                          testCaseViewMode === "grid"
                            ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                            : "text-slate-700 hover:bg-orange-200/60"
                        }`}
                        onClick={() => setTestCaseViewMode("grid")}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> Grid
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addTestCase();
                        setActiveTestCaseIndex(testCases.length);
                      }}
                      className="border-orange-500 bg-orange-500 text-white hover:bg-orange-600 font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Test Case
                    </Button>
                  </div>
                </div>

                {/* Carousel Dots Navigation Bar */}
                {testCases.length > 0 && (
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-orange-200/80">
                    {/* Dot Indicators */}
                    <div className="flex items-center gap-1.5 flex-wrap max-w-full overflow-x-auto py-1">
                      {testCases.map((tc, idx) => {
                        const isActive = activeTestCaseIndex === idx;
                        const isSample = tc.sample;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveTestCaseIndex(idx)}
                            className={`group relative flex items-center justify-center transition-all focus:outline-none ${
                              isActive
                                ? "scale-110"
                                : "opacity-80 hover:opacity-100"
                            }`}
                            title={`Test Case #${idx + 1} (${isSample ? "Sample" : "Hidden"})`}
                          >
                            <span
                              className={`h-6 min-w-[26px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${
                                isActive
                                  ? isSample
                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/50"
                                    : "bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400/50"
                                  : isSample
                                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                    : "bg-orange-100 text-orange-950 border-orange-300"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dot Legend & Arrow Steppers */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="hidden sm:flex items-center gap-3 text-slate-700 font-semibold">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          Sample
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                          Hidden
                        </span>
                      </div>

                      {testCaseViewMode === "carousel" &&
                        testCases.length > 1 && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-orange-300 bg-orange-100/80 text-slate-800 hover:bg-orange-200"
                              onClick={() =>
                                setActiveTestCaseIndex((prev) =>
                                  prev > 0 ? prev - 1 : testCases.length - 1,
                                )
                              }
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-slate-800 font-mono text-xs font-bold px-1">
                              {activeTestCaseIndex + 1}/{testCases.length}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 border-orange-300 bg-orange-100/80 text-slate-800 hover:bg-orange-200"
                              onClick={() =>
                                setActiveTestCaseIndex((prev) =>
                                  prev < testCases.length - 1 ? prev + 1 : 0,
                                )
                              }
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-5 space-y-6 bg-white">
                {testCases.length > 0 &&
                  (testCaseViewMode === "carousel" ? (
                    /* CAROUSEL SINGLE CARD VIEW */
                    (() => {
                      const idx = Math.min(
                        activeTestCaseIndex,
                        testCases.length - 1,
                      );
                      const testCase = testCases[idx] || testCases[0];
                      if (!testCase) return null;
                      return (
                        <div className="border border-orange-200 bg-orange-50/20 rounded-xl p-5 space-y-4 relative shadow-sm">
                          <div className="flex items-center justify-between border-b border-orange-200/80 pb-3">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className="font-bold text-xs px-3 py-1 bg-orange-100 text-orange-950 border-orange-300"
                              >
                                Test Case #{idx + 1}
                              </Badge>
                              {testCase.sample ? (
                                <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 font-bold text-xs">
                                  <Eye className="w-3.5 h-3.5" /> Sample Test
                                  Case (Visible to Candidate)
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-950 border border-orange-300 flex items-center gap-1 font-bold text-xs">
                                  <EyeOff className="w-3.5 h-3.5" /> Hidden Test
                                  Case (Evaluation Only)
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removeTestCase(idx);
                                if (
                                  activeTestCaseIndex >= testCases.length - 1 &&
                                  activeTestCaseIndex > 0
                                ) {
                                  setActiveTestCaseIndex(
                                    activeTestCaseIndex - 1,
                                  );
                                }
                              }}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-100/60 font-semibold"
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" /> Delete Test
                              Case
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  Input STDIN
                                </Label>
                                <Textarea
                                  value={testCase.input}
                                  onChange={(e) =>
                                    updateTestCase(idx, "input", e.target.value)
                                  }
                                  placeholder="Enter input (e.g. 10)"
                                  rows={4}
                                  className="font-mono text-sm bg-white text-slate-900 border-slate-300 focus:border-orange-500"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  Expected Output STDOUT
                                </Label>
                                <Textarea
                                  value={testCase.expectedOutput}
                                  onChange={(e) =>
                                    updateTestCase(
                                      idx,
                                      "expectedOutput",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter expected output (e.g. 19)"
                                  rows={4}
                                  className="font-mono text-sm bg-white text-slate-900 border-slate-300 focus:border-orange-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-orange-200/80">
                              <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-orange-200">
                                <Checkbox
                                  id={`sample-active-${idx}`}
                                  checked={testCase.sample}
                                  onCheckedChange={(checked) =>
                                    updateTestCase(
                                      idx,
                                      "sample",
                                      checked as boolean,
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`sample-active-${idx}`}
                                  className="cursor-pointer text-xs font-semibold text-slate-800"
                                >
                                  Mark as Sample Test Case (Visible to candidate
                                  during test)
                                </Label>
                              </div>

                              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-orange-200">
                                <Label className="whitespace-nowrap text-xs font-semibold text-slate-800">
                                  Score Weight (%)
                                </Label>
                                <Input
                                  type="number"
                                  value={testCase.weight}
                                  onChange={(e) =>
                                    updateTestCase(
                                      idx,
                                      "weight",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="bg-white border-orange-300 font-bold text-orange-600 w-24"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-800">
                                Explanation (Optional)
                              </Label>
                              <Textarea
                                value={testCase.explanation || ""}
                                onChange={(e) =>
                                  updateTestCase(
                                    idx,
                                    "explanation",
                                    e.target.value,
                                  )
                                }
                                placeholder="Explain why this output is expected..."
                                rows={2}
                                className="text-sm bg-white text-slate-900 border-slate-300 focus:border-orange-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* ALL GRID VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {testCases.map((testCase, index) => (
                        <div
                          key={index}
                          className="border border-orange-200 bg-white rounded-xl p-4 space-y-3 relative hover:border-orange-400 transition-colors shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="font-bold text-xs bg-orange-100 text-orange-950 border-orange-300"
                              >
                                #{index + 1}
                              </Badge>
                              {testCase.sample ? (
                                <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                                  Sample
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-950 border border-orange-300 text-xs font-bold">
                                  Hidden
                                </Badge>
                              )}
                              <span className="text-xs font-bold text-slate-700">
                                Weight: {testCase.weight}%
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTestCase(index)}
                              className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-100/60"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-slate-800 font-mono font-bold">
                                Input (STDIN):
                              </span>
                              <p className="font-mono bg-slate-50 text-slate-900 p-2.5 rounded border border-slate-200 truncate mt-0.5 font-medium">
                                {testCase.input || (
                                  <span className="text-slate-400 italic">
                                    &lt;empty&gt;
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-800 font-mono font-bold">
                                Output (STDOUT):
                              </span>
                              <p className="font-mono bg-slate-50 text-slate-900 p-2.5 rounded border border-slate-200 truncate mt-0.5 font-medium">
                                {testCase.expectedOutput || (
                                  <span className="text-slate-400 italic">
                                    &lt;empty&gt;
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {testCases.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-orange-300 rounded-xl bg-orange-50/30">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                    <p className="text-slate-800 font-medium">
                      No test cases added
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addTestCase();
                        setActiveTestCaseIndex(0);
                      }}
                      className="mt-4 border-orange-500 bg-orange-500 text-white hover:bg-orange-600 font-bold"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Test Case
                    </Button>
                  </div>
                )}

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Code className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">About Test Cases</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>
                          • <strong>Sample test cases</strong> are visible to
                          candidates and help them understand requirements
                        </li>
                        <li>
                          • <strong>Hidden test cases</strong> are used for
                          final evaluation
                        </li>
                        <li>
                          • <strong>Weight</strong> determines how much each
                          test case contributes to the score
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
              {shouldShowOptionsPreview() && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2">Options:</p>
                  <div className="space-y-1">
                    {mcqOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${opt.isCorrect ? "bg-green-500" : "bg-gray-300"}`}
                        />
                        <span
                          className={
                            opt.isCorrect
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }
                        >
                          {opt.text || `Option ${idx + 1}`}
                        </span>
                        {opt.isCorrect && (
                          <Badge
                            variant="outline"
                            className="text-green-600 text-xs"
                          >
                            Correct
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
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
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${totalWeight}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total weight: {totalWeight}%
                    </p>
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
                onClick={handleUpdate}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? "Updating..." : "Update Question"}
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

          <Card>
            <CardHeader>
              <CardTitle>Question Info</CardTitle>
              <CardDescription>Question metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">ID:</span>
                <code className="ml-2 text-xs">{id}</code>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline" className="ml-2">
                  {questionType}
                </Badge>
              </div>
              {questionType === "MCQ" && mcqSubType && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Subtype:</span>
                  <Badge variant="outline" className="ml-2">
                    {MCQ_TYPES.find((t) => t.value === mcqSubType)?.label ||
                      mcqSubType}
                  </Badge>
                </div>
              )}
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
