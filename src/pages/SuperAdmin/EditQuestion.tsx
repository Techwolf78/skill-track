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
} from "lucide-react";
import {
  testService,
  Subject,
  Topic,
  Subtopic,
  Question,
  TestCase,
} from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

interface McqOption {
  text: string;
  isCorrect: boolean;
}

interface TestCaseForm {
  id?: string;
  input: string;
  expectedOutput: string;
  sample: boolean;
  weight: number;
}

export default function EditQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);

  // Form state
  const [questionType, setQuestionType] = useState<"MCQ" | "CODING">("MCQ");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [constraints, setConstraints] = useState("");
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [timeLimitSecs, setTimeLimitSecs] = useState<number>(1);
  const [sampleExplanation, setSampleExplanation] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const [mcqOptions, setMcqOptions] = useState<McqOption[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  // Test cases state for coding questions
  const [testCases, setTestCases] = useState<TestCaseForm[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [questionData, allSubjects, allTopicsData, allTestCases] =
        await Promise.all([
          testService.getQuestionById(id!),
          testService.getAllSubjects(),
          testService.getAllTopics(),
          testService.getAllTestCases(),
        ]);

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
      setSampleExplanation(questionData.sampleExplanation || "");
      setHints(questionData.hints || []);
      setTags(questionData.tags || []);

      // Handle question type
      const qType = questionData.questionType || questionData.type;
      const questionTypeValue = qType === "CODING" ? "CODING" : "MCQ";
      setQuestionType(questionTypeValue);

      // Extract IDs - handle both object and direct ID
      const subjectId = questionData.subject?.id || questionData.subjectId;
      const topicId = questionData.topic?.id || questionData.topicId;
      const subtopicId = questionData.subtopic?.id || questionData.subtopicId;

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
          (opt: { text: string; isCorrect: boolean }) => ({
            text: opt.text || "",
            isCorrect: opt.isCorrect || false,
          }),
        );
        setMcqOptions(parsedOptions);
      }

      // Handle test cases for coding questions
      if (questionTypeValue === "CODING") {
        const questionTestCases = allTestCases.filter(
          (tc) => tc.questionId === id,
        );

        if (questionTestCases.length > 0) {
          setTestCases(
            questionTestCases.map((tc) => ({
              id: tc.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              sample: tc.sample,
              weight: tc.weight,
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
      navigate("/superadmin/questions");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubjectChange = async (subjectId: string) => {
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

  const handleMcqOptionChange = (index: number, text: string) => {
    const updated = [...mcqOptions];
    updated[index].text = text;
    setMcqOptions(updated);
  };

  const handleHintChange = (index: number, value: string) => {
    const newHints = [...hints];
    newHints[index] = value;
    setHints(newHints);
  };

  const addHint = () => setHints([...hints, ""]);
  const removeHint = (index: number) => setHints(hints.filter((_, i) => i !== index));

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const addTag = () => setTags([...tags, ""]);
  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));

  const handleCorrectOptionChange = (index: number) => {
    const updated = mcqOptions.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setMcqOptions(updated);
  };

  const addMcqOption = () => {
    if (mcqOptions.length >= 6) {
      toast({
        title: "Warning",
        description: "Maximum 6 options allowed",
        variant: "destructive",
      });
      return;
    }
    setMcqOptions([...mcqOptions, { text: "", isCorrect: false }]);
  };

  const removeMcqOption = (index: number) => {
    if (mcqOptions.length <= 2) {
      toast({
        title: "Error",
        description: "At least 2 options are required",
        variant: "destructive",
      });
      return;
    }
    const updated = mcqOptions.filter((_, i) => i !== index);
    setMcqOptions(updated);
  };

  // Test case handlers
  const addTestCase = () => {
    setTestCases([
      ...testCases,
      { input: "", expectedOutput: "", sample: false, weight: 0 },
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
    value: any,
  ) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const getTotalWeight = () => {
    return testCases.reduce((sum, tc) => sum + tc.weight, 0);
  };

  const handleUpdate = async () => {
    // Validation
    if (!prompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Question prompt is required",
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
      const hasEmptyOption = mcqOptions.some((opt) => !opt.text.trim());
      if (hasEmptyOption) {
        toast({
          title: "Validation Error",
          description: "All options must have text",
          variant: "destructive",
        });
        return;
      }

      const hasCorrectOption = mcqOptions.some((opt) => opt.isCorrect);
      if (!hasCorrectOption) {
        toast({
          title: "Validation Error",
          description: "Please select a correct answer",
          variant: "destructive",
        });
        return;
      }
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
      // Update question
      const questionData = {
        questionType: questionType,
        prompt: prompt,
        subjectId: selectedSubject,
        topicId: selectedTopic || undefined,
        subtopicId: selectedSubtopic || undefined,
        marks: marks,
        title: title || undefined,
        difficulty: difficulty,
        constraints: constraints || undefined,
        memoryLimitMb: memoryLimitMb,
        timeLimitSecs: timeLimitSecs,
        sampleExplanation: sampleExplanation || undefined,
        hints: hints.filter(h => h.trim() !== ""),
        tags: tags.filter(t => t.trim() !== ""),
        examples: testCases.filter(tc => tc.sample).map(tc => ({
          input: tc.input,
          output: tc.expectedOutput,
          explanation: ""
        })),
        ...(questionType === "MCQ" && {
          mcqOptions: mcqOptions.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        }),
      };

      console.log("Updating question with data:", questionData);
      await testService.updateQuestion(id!, questionData);

      // If coding question, update test cases
      if (questionType === "CODING") {
        // Get existing test cases
        const existingTestCases = await testService.getTestCasesByQuestion(id!);

        // Delete test cases that were removed
        const existingIds = new Set(existingTestCases.map((tc) => tc.id));
        const currentIds = new Set(
          testCases.filter((tc) => tc.id).map((tc) => tc.id),
        );
        const idsToDelete = [...existingIds].filter(
          (testId) => !currentIds.has(testId),
        );

        for (const testCaseId of idsToDelete) {
          await testService.deleteTestCase(testCaseId);
        }

        // Create or update test cases
        for (const testCase of testCases) {
          if (testCase.id) {
            // Update existing
            await testService.updateTestCase(testCase.id, {
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              sample: testCase.sample,
              weight: testCase.weight,
              questionId: id,
            });
          } else {
            // Create new
            await testService.createTestCase({
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              sample: testCase.sample,
              weight: testCase.weight,
              questionId: id!,
            });
          }
        }
      }

      toast({
        title: "Success",
        description: "Question updated successfully",
      });
      navigate("/superadmin/questions");
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/superadmin/questions")}
        >
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
                  <Label htmlFor="mcq" className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Multiple Choice (MCQ)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CODING" id="code" />
                  <Label htmlFor="code" className="flex items-center gap-2">
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
                <Label>Subject *</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty {questionType === "CODING" && "*"}</Label>
                    <Select
                      value={difficulty}
                      onValueChange={setDifficulty}
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
                </div>

                {questionType === "CODING" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time Limit (Seconds)</Label>
                      <Input
                        type="number"
                        value={timeLimitSecs}
                        onChange={(e) => setTimeLimitSecs(parseFloat(e.target.value) || 0)}
                        min={0.1}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Memory Limit (MB)</Label>
                      <Input
                        type="number"
                        value={memoryLimitMb}
                        onChange={(e) => setMemoryLimitMb(parseInt(e.target.value) || 0)}
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </div>

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
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Hints</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addHint}>
                        <Plus className="w-3 h-3 mr-1" /> Add Hint
                      </Button>
                    </div>
                    {hints.map((hint, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={hint}
                          onChange={(e) => handleHintChange(idx, e.target.value)}
                          placeholder={`Hint ${idx + 1}`}
                        />
                        {hints.length > 0 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeHint(idx)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tags</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addTag}>
                        <Plus className="w-3 h-3 mr-1" /> Add Tag
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, idx) => (
                        <div key={idx} className="flex gap-1 items-center bg-muted p-1 rounded">
                          <Input
                            value={tag}
                            onChange={(e) => handleTagChange(idx, e.target.value)}
                            className="h-7 w-24 text-xs"
                            placeholder="Tag"
                          />
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeTag(idx)}>
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

          {/* MCQ Options */}
          {questionType === "MCQ" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Answer Options</CardTitle>
                    <CardDescription>
                      Add options and select the correct answer
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMcqOption}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mcqOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
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
                    <Input
                      value={option.text}
                      onChange={(e) =>
                        handleMcqOptionChange(index, e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {mcqOptions.length > 2 && (
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
                <p className="text-xs text-muted-foreground mt-2">
                  Click the radio button to mark the correct answer
                </p>
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
                        {totalWeight !== 100 && "(must be 100%)"}
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
                              updateTestCase(index, "sample", checked)
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
                    </div>
                  </div>
                ))}

                {testCases.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                    <p>No test cases added</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTestCase}
                      className="mt-4"
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
              {questionType === "MCQ" && mcqOptions.some((opt) => opt.text) && (
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
                onClick={() => navigate("/superadmin/questions")}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
