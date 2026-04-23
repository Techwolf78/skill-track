import { useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Code, ListChecks, Trash } from "lucide-react";

interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

interface TestCase {
  input: string;
  expected: string;
}

interface AddQuestionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

type QuestionType = "mcq" | "coding";

const getDefaultCodeSnippets = (): CodeSnippet[] => [
  { lang: "Python3", langSlug: "python3", code: "class Solution:\n    def solve(self, input):\n        pass" },
  { lang: "Java", langSlug: "java", code: "class Solution {\n    public void solve() {\n    }\n}" },
  { lang: "C++", langSlug: "cpp", code: "class Solution {\npublic:\n    void solve() {\n    }\n};" },
];

export default function AddQuestion({ open, onOpenChange, onAdded }: AddQuestionProps) {
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [category, setCategory] = useState("Algorithms");
  const [functionName, setFunctionName] = useState("solve");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState("0");
  const [addCodeSnippets, setAddCodeSnippets] = useState<CodeSnippet[]>([]);
  const [addSampleTestCases, setAddSampleTestCases] = useState<TestCase[]>([]);
  const [addHiddenTestCases, setAddHiddenTestCases] = useState<TestCase[]>([]);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);

  useEffect(() => {
    if (questionType === "coding" && addCodeSnippets.length === 0) {
      setAddCodeSnippets(getDefaultCodeSnippets());
    }
  }, [questionType, addCodeSnippets.length]);

  const resetForm = () => {
    setQuestionType("mcq");
    setTitle("");
    setContent("");
    setDifficulty("Easy");
    setCategory("Algorithms");
    setFunctionName("solve");
    setOptions(["", "", "", ""]);
    setCorrectOption("0");
    setAddCodeSnippets([]);
    setAddSampleTestCases([]);
    setAddHiddenTestCases([]);
  };

  const handleAddNewCodeSnippet = () => {
    setAddCodeSnippets([...addCodeSnippets, { lang: "Python3", langSlug: "python3", code: "" }]);
  };

  const handleRemoveNewCodeSnippet = (index: number) => {
    setAddCodeSnippets(addCodeSnippets.filter((_, i) => i !== index));
  };

  const handleUpdateNewCodeSnippet = (index: number, field: keyof CodeSnippet, value: string) => {
    const updated = [...addCodeSnippets];
    updated[index] = { ...updated[index], [field]: value };
    setAddCodeSnippets(updated);
  };

  const handleAddSampleTestCase = () => {
    setAddSampleTestCases([...addSampleTestCases, { input: "", expected: "" }]);
  };

  const handleRemoveSampleTestCase = (index: number) => {
    setAddSampleTestCases(addSampleTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateSampleTestCase = (index: number, field: "input" | "expected", value: string) => {
    const updated = [...addSampleTestCases];
    updated[index] = { ...updated[index], [field]: value };
    setAddSampleTestCases(updated);
  };

  const handleAddNewHiddenTestCase = () => {
    setAddHiddenTestCases([...addHiddenTestCases, { input: "", expected: "" }]);
  };

  const handleRemoveNewHiddenTestCase = (index: number) => {
    setAddHiddenTestCases(addHiddenTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateNewHiddenTestCase = (index: number, field: "input" | "expected", value: string) => {
    const updated = [...addHiddenTestCases];
    updated[index] = { ...updated[index], [field]: value };
    setAddHiddenTestCases(updated);
  };

  const handleAddQuestion = async () => {
    if (!title || !content) {
      alert("Please fill in title and content");
      return;
    }

    if (questionType === "coding" && addSampleTestCases.length === 0) {
      alert("Please add at least one sample test case for coding questions.");
      return;
    }

    setIsAddSubmitting(true);
    try {
      const questionData: Record<string, unknown> = {
        title,
        content,
        difficulty,
        categoryTitle: category,
        addedAt: serverTimestamp(),
        enableRunCode: true,
        judgerAvailable: true,
        isPaidOnly: false,
      };

      if (questionType === "mcq") {
        questionData.options = options;
        questionData.correctOption = parseInt(correctOption, 10);
        questionData.type = "mcq";
      } else {
        questionData.functionName = functionName;
        questionData.sampleTestCases = addSampleTestCases.length ? addSampleTestCases : [{ input: "", expected: "" }];
        questionData.hiddenTestCases = addHiddenTestCases;
        questionData.codeSnippets = addCodeSnippets.length ? addCodeSnippets : getDefaultCodeSnippets();
      }

      await addDoc(collection(db, "questions"), questionData);
      resetForm();
      onAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding question:", error);
      alert("Failed to add question");
    } finally {
      setIsAddSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Question</DialogTitle>
          {questionType === "coding" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => document.getElementById("add-basic")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                Basic
              </Button>
              <Button size="sm" variant="outline" onClick={() => document.getElementById("add-statement")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                Statement
              </Button>
              <Button size="sm" variant="outline" onClick={() => document.getElementById("add-snippets")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                Code Snippets
              </Button>
              <Button size="sm" variant="outline" onClick={() => document.getElementById("add-sample-tests")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                Sample Tests
              </Button>
              <Button size="sm" variant="outline" onClick={() => document.getElementById("add-hidden-tests")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                Hidden Tests
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 pr-4">
          <Card id="add-basic">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Set title, category and difficulty</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <RadioGroup
                  value={questionType}
                  onValueChange={(val: QuestionType) => setQuestionType(val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mcq" id="mcq" />
                    <Label htmlFor="mcq">MCQ</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="coding" id="coding" />
                    <Label htmlFor="coding">Coding</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Two Sum" />
                </div>
                <div className="space-y-2">
                  <Label>Category/Topic</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Algorithms" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="add-statement">
            <CardHeader>
              <CardTitle className="text-lg">{questionType === "mcq" ? "Question Text" : "Problem Statement"}</CardTitle>
              <CardDescription>{questionType === "mcq" ? "Write the question prompt." : "Describe the problem that needs to be solved."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionType === "coding" && (
                <div className="space-y-2">
                  <Label>Function Name</Label>
                  <Input
                    value={functionName}
                    onChange={(e) => setFunctionName(e.target.value)}
                    placeholder="e.g. maxDepth, solve, twoSum"
                  />
                  <p className="text-xs text-muted-foreground">The name of the function that the test runner will call.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>{questionType === "mcq" ? "Question Details" : "Description"}</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={questionType === "mcq" ? "Enter the question" : "Enter the detailed problem statement"}
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {questionType === "mcq" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Options</CardTitle>
                <CardDescription>Provide the answers and select the correct one.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <RadioGroup value={correctOption} onValueChange={setCorrectOption}>
                      <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} />
                    </RadioGroup>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${idx + 1}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground italic">Select the circular button next to the correct answer.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card id="add-snippets">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Code Snippets</CardTitle>
                      <CardDescription>Boilerplate code for different programming languages</CardDescription>
                    </div>
                    <Button size="sm" onClick={handleAddNewCodeSnippet} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Language
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addCodeSnippets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No code snippets yet. Click "Add Language" to get started.</p>
                    </div>
                  ) : (
                    addCodeSnippets.map((snippet, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-2">
                            <Label className="text-sm">Language</Label>
                            <Input
                              value={snippet.lang}
                              onChange={(e) => handleUpdateNewCodeSnippet(idx, "lang", e.target.value)}
                              placeholder="e.g. Python3"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label className="text-sm">Language Slug</Label>
                            <Input
                              value={snippet.langSlug}
                              onChange={(e) => handleUpdateNewCodeSnippet(idx, "langSlug", e.target.value)}
                              placeholder="e.g. python3"
                            />
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveNewCodeSnippet(idx)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Code Template</Label>
                          <Textarea
                            value={snippet.code}
                            onChange={(e) => handleUpdateNewCodeSnippet(idx, "code", e.target.value)}
                            placeholder="Paste the boilerplate code..."
                            className="font-mono text-xs min-h-[100px]"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="add-sample-tests">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Sample Test Cases</CardTitle>
                      <CardDescription>Sample inputs and expected outputs</CardDescription>
                    </div>
                    <Button size="sm" onClick={handleAddSampleTestCase} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Test Case
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addSampleTestCases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No sample test cases yet. Click "Add Test Case" to get started.</p>
                    </div>
                  ) : (
                    addSampleTestCases.map((testCase, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-sm">Sample Test Case {idx + 1}</div>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveSampleTestCase(idx)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) => handleUpdateSampleTestCase(idx, "input", e.target.value)}
                              placeholder="[1,2,3] 6"
                              className="font-mono text-xs min-h-[80px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Expected Output</Label>
                            <Textarea
                              value={testCase.expected}
                              onChange={(e) => handleUpdateSampleTestCase(idx, "expected", e.target.value)}
                              placeholder="[0,1]"
                              className="font-mono text-xs min-h-[80px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card id="add-hidden-tests">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Hidden Test Cases</CardTitle>
                      <CardDescription>Hidden validation cases used by the judge</CardDescription>
                    </div>
                    <Button size="sm" onClick={handleAddNewHiddenTestCase} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Hidden Test
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addHiddenTestCases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No hidden test cases yet. Click "Add Hidden Test" to get started.</p>
                    </div>
                  ) : (
                    addHiddenTestCases.map((testCase, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-sm">Hidden Test {idx + 1}</div>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveNewHiddenTestCase(idx)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) => handleUpdateNewHiddenTestCase(idx, "input", e.target.value)}
                              placeholder='{"nums":[2,7,11,15],"target":9}'
                              className="font-mono text-xs min-h-[80px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Expected Output</Label>
                            <Textarea
                              value={testCase.expected}
                              onChange={(e) => handleUpdateNewHiddenTestCase(idx, "expected", e.target.value)}
                              placeholder="[0,1]"
                              className="font-mono text-xs min-h-[80px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddQuestion} disabled={isAddSubmitting}>
            {isAddSubmitting ? "Adding..." : "Add to Question Bank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
