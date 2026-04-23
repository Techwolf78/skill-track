import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, ListChecks, Trash, Code } from "lucide-react";

interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

interface TestCase {
  input: string;
  expected: string;
}

interface EditQuestionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null;
  onSaved: () => void;
}

export default function EditQuestion({ open, onOpenChange, questionId, onSaved }: EditQuestionProps) {
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("Easy");
  const [editCategory, setEditCategory] = useState("Algorithms");
  const [editFunctionName, setEditFunctionName] = useState("solve");
  const [editCodeSnippets, setEditCodeSnippets] = useState<CodeSnippet[]>([]);
  const [editTestCases, setEditTestCases] = useState<TestCase[]>([]);
  const [editHiddenTestCases, setEditHiddenTestCases] = useState<TestCase[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && questionId) {
      loadQuestion(questionId);
    } else {
      resetForm();
    }
  }, [open, questionId]);

  const resetForm = () => {
    setEditTitle("");
    setEditContent("");
    setEditDifficulty("Easy");
    setEditCategory("Algorithms");
    setEditFunctionName("solve");
    setEditCodeSnippets([]);
    setEditTestCases([]);
    setEditHiddenTestCases([]);
    setIsEditSubmitting(false);
    setIsLoading(false);
  };

  const loadQuestion = async (id: string) => {
    setIsLoading(true);
    try {
      const docRef = doc(db, "questions", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEditTitle(data.title || "");
        setEditContent(data.content || "");
        setEditDifficulty(data.difficulty || "Easy");
        setEditCategory(data.categoryTitle || "Algorithms");
        setEditFunctionName(data.functionName || "solve");
        setEditCodeSnippets(data.codeSnippets || []);
        setEditTestCases(data.sampleTestCases || []);
        setEditHiddenTestCases(data.hiddenTestCases || []);
      }
    } catch (error) {
      console.error("Error loading question for edit:", error);
      alert("Failed to load question details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCodeSnippet = () => {
    setEditCodeSnippets([...editCodeSnippets, { lang: "Python3", langSlug: "python3", code: "" }]);
  };

  const handleRemoveCodeSnippet = (index: number) => {
    setEditCodeSnippets(editCodeSnippets.filter((_, i) => i !== index));
  };

  const handleUpdateCodeSnippet = (index: number, field: keyof CodeSnippet, value: string) => {
    const updated = [...editCodeSnippets];
    updated[index] = { ...updated[index], [field]: value };
    setEditCodeSnippets(updated);
  };

  const handleAddTestCase = () => {
    setEditTestCases([...editTestCases, { input: "", expected: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    setEditTestCases(editTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, field: "input" | "expected", value: string) => {
    const updated = [...editTestCases];
    updated[index] = { ...updated[index], [field]: value };
    setEditTestCases(updated);
  };

  const handleAddHiddenTestCase = () => {
    setEditHiddenTestCases([...editHiddenTestCases, { input: "", expected: "" }]);
  };

  const handleRemoveHiddenTestCase = (index: number) => {
    setEditHiddenTestCases(editHiddenTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateHiddenTestCase = (index: number, field: "input" | "expected", value: string) => {
    const updated = [...editHiddenTestCases];
    updated[index] = { ...updated[index], [field]: value };
    setEditHiddenTestCases(updated);
  };

  const handleSaveEdit = async () => {
    if (!questionId) return;
    if (!editTitle || !editContent) {
      alert("Please fill in title and content");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const docRef = doc(db, "questions", questionId);
      await updateDoc(docRef, {
        title: editTitle,
        content: editContent,
        difficulty: editDifficulty,
        categoryTitle: editCategory,
        functionName: editFunctionName,
        codeSnippets: editCodeSnippets,
        sampleTestCases: editTestCases,
        hiddenTestCases: editHiddenTestCases,
      });

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating question:", error);
      alert("Failed to update question");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Coding Question</DialogTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => document.getElementById("edit-basic")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Basic
            </Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById("edit-statement")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Statement
            </Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById("edit-snippets")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Code Snippets
            </Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById("edit-tests")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Sample Tests
            </Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById("edit-hidden-tests")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Hidden Tests
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading question...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pr-4">
            <Card id="edit-basic">
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Update the question title, category, and difficulty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. Same Tree" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category/Topic</Label>
                    <Input id="edit-category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Algorithms" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-difficulty">Difficulty</Label>
                    <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                      <SelectTrigger id="edit-difficulty">
                        <SelectValue />
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

            <Card id="edit-statement">
              <CardHeader>
                <CardTitle className="text-lg">Problem Statement</CardTitle>
                <CardDescription>Describe the problem that needs to be solved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-function-name">Function Name</Label>
                  <Input
                    id="edit-function-name"
                    value={editFunctionName}
                    onChange={(e) => setEditFunctionName(e.target.value)}
                    placeholder="e.g. maxDepth, solve, twoSum"
                  />
                  <p className="text-xs text-muted-foreground">The name of the function that the test runner will call.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content">Description</Label>
                  <Textarea
                    id="edit-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Enter the detailed problem statement..."
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card id="edit-snippets">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Code Snippets</CardTitle>
                    <CardDescription>Boilerplate code for different programming languages</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleAddCodeSnippet} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Language
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editCodeSnippets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No code snippets yet. Click "Add Language" to get started.</p>
                  </div>
                ) : (
                  editCodeSnippets.map((snippet, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm">Language</Label>
                          <Input
                            value={snippet.lang}
                            onChange={(e) => handleUpdateCodeSnippet(idx, "lang", e.target.value)}
                            placeholder="e.g. Python3"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm">Language Slug</Label>
                          <Input
                            value={snippet.langSlug}
                            onChange={(e) => handleUpdateCodeSnippet(idx, "langSlug", e.target.value)}
                            placeholder="e.g. python3"
                          />
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveCodeSnippet(idx)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Code Template</Label>
                        <Textarea
                          value={snippet.code}
                          onChange={(e) => handleUpdateCodeSnippet(idx, "code", e.target.value)}
                          placeholder="Paste the boilerplate code..."
                          className="font-mono text-xs min-h-[100px]"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="edit-tests">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Sample Test Cases</CardTitle>
                    <CardDescription>Sample inputs and expected outputs</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleAddTestCase} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Case
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editTestCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No sample test cases yet. Click "Add Test Case" to get started.</p>
                  </div>
                ) : (
                  editTestCases.map((testCase, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-sm">Sample Test Case {idx + 1}</div>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveTestCase(idx)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Input</Label>
                          <Textarea
                            value={testCase.input}
                            onChange={(e) => handleUpdateTestCase(idx, "input", e.target.value)}
                            placeholder="[1,2,3] [1,2,3]"
                            className="font-mono text-xs min-h-[80px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Expected Output</Label>
                          <Textarea
                            value={testCase.expected}
                            onChange={(e) => handleUpdateTestCase(idx, "expected", e.target.value)}
                            placeholder="true"
                            className="font-mono text-xs min-h-[80px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="edit-hidden-tests">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Hidden Test Cases</CardTitle>
                    <CardDescription>Hidden validation cases used by the judge</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleAddHiddenTestCase} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Hidden Test
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editHiddenTestCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hidden test cases yet. Click "Add Hidden Test" to get started.</p>
                  </div>
                ) : (
                  editHiddenTestCases.map((testCase, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-sm">Hidden Test {idx + 1}</div>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveHiddenTestCase(idx)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Input</Label>
                          <Textarea
                            value={testCase.input}
                            onChange={(e) => handleUpdateHiddenTestCase(idx, "input", e.target.value)}
                            placeholder='{"nums":[2,7,11,15],"target":9}'
                            className="font-mono text-xs min-h-[80px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Expected Output</Label>
                          <Textarea
                            value={testCase.expected}
                            onChange={(e) => handleUpdateHiddenTestCase(idx, "expected", e.target.value)}
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
          </div>
        )}

        <Separator className="mt-4" />
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={isEditSubmitting}>
            {isEditSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
