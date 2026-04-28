// src/pages/SuperAdmin/AddQuestion.tsx
import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Code,
  ListChecks,
} from "lucide-react";
import { testService, Subject, Topic, Subtopic } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";

interface McqOption {
  text: string;
  isCorrect: boolean;
}

export default function AddQuestion() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
  const [mcqOptions, setMcqOptions] = useState<McqOption[]>([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  // Fetch subjects and all topics/subtopics on load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [allSubjects, allTopicsData] = await Promise.all([
        testService.getAllSubjects(),
        testService.getAllTopics(),
      ]);

      setSubjects(allSubjects);
      setAllTopics(allTopicsData);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load data";
      console.error("Failed to fetch initial data:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedTopic("");
    setSelectedSubtopic("");

    // Filter topics based on selected subject
    const filteredTopics = allTopics.filter((topic) => {
      return topic.subjectId === subjectId || topic.subject?.id === subjectId;
    });

    setTopics(filteredTopics);
    setSubtopics([]);
  };

  const handleTopicChange = (topicId: string) => {
    setSelectedTopic(topicId);
    setSelectedSubtopic("");

    // Fetch subtopics for this topic
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
    } catch (error: unknown) {
      console.error("Failed to fetch subtopics:", error);
    }
  };

  const handleMcqOptionChange = (index: number, text: string) => {
    const updated = [...mcqOptions];
    updated[index].text = text;
    setMcqOptions(updated);
  };

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

  const handleSubmit = async () => {
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

    setLoading(true);
    try {
      const questionData = {
        type: questionType,
        prompt: prompt,
        subjectId: selectedSubject,
        topicId: selectedTopic || undefined,
        subtopicId: selectedSubtopic || undefined,
        marks: marks,
        ...(questionType === "MCQ" && {
          mcqOptions: mcqOptions.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        }),
      };

      console.log("Submitting question:", questionData);
      const response = await testService.createQuestion(questionData);
      console.log("Question created:", response);

      toast({
        title: "Success",
        description: "Question added successfully",
      });
      navigate("/admin/questions");
    } catch (error: unknown) {
      console.error("Failed to create question:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add question";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/questions")}
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
                  <Label htmlFor="mcq" className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Multiple Choice (MCQ)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CODING" id="coding" />
                  <Label htmlFor="coding" className="flex items-center gap-2">
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
                <Label>Question Prompt *</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your question here..."
                  rows={5}
                  className="resize-none"
                />
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

          {/* Coding Question Placeholder */}
          {questionType === "CODING" && (
            <Card>
              <CardHeader>
                <CardTitle>Coding Question Setup</CardTitle>
                <CardDescription>
                  Coding questions require additional configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-6 text-center">
                  <Code className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Coding question support coming soon!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll be able to add test cases, code snippets, and more.
                  </p>
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
                onClick={() => navigate("/admin/questions")}
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
