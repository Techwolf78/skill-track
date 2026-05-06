import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  FolderTree,
  BookOpen,
  Hash,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  FileJson,
} from "lucide-react";
import { testService, Subject, Topic, Subtopic } from "@/lib/test-service";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ManageSubjects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Dialog states
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [subtopicDialogOpen, setSubtopicDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [bulkJsonData, setBulkJsonData] = useState("");
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | "warning" | null;
    message: string;
    details?: string[];
  }>({ type: null, message: "" });
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    type: "subject" | "topic" | "subtopic";
    id: string;
    name: string;
    subjectId?: string;
    topicId?: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  // Form states
  const [subjectName, setSubjectName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [selectedSubjectForTopic, setSelectedSubjectForTopic] = useState("");
  const [subtopicName, setSubtopicName] = useState("");
  const [selectedSubjectForSubtopic, setSelectedSubjectForSubtopic] =
    useState("");
  const [selectedTopicForSubtopic, setSelectedTopicForSubtopic] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allSubjects, allTopics, allSubtopics] = await Promise.all([
        testService.getAllSubjects(),
        testService.getAllTopics(),
        testService.getAllSubtopics(),
      ]);
      setSubjects(allSubjects);
      setTopics(allTopics);
      setSubtopics(allSubtopics);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load data";
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const getTopicsForSubject = (subjectId: string) => {
    return topics.filter(
      (topic) =>
        topic.subjectId === subjectId || topic.subject?.id === subjectId,
    );
  };

  const getSubtopicsForTopic = (topicId: string) => {
    return subtopics.filter(
      (subtopic) =>
        subtopic.topicId === topicId || subtopic.topic?.id === topicId,
    );
  };

  // Subject CRUD
  const handleAddSubject = async () => {
    if (!subjectName.trim()) {
      toast({
        title: "Error",
        description: "Subject name is required",
        variant: "destructive",
      });
      return;
    }
    try {
      await testService.createSubject(subjectName);
      toast({ title: "Success", description: "Subject added successfully" });
      setSubjectDialogOpen(false);
      setSubjectName("");
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add subject";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditSubject = async () => {
    if (!subjectName.trim() || !editingItem || editingItem.type !== "subject")
      return;
    try {
      await testService.updateSubject(editingItem.id, subjectName);
      toast({ title: "Success", description: "Subject updated successfully" });
      setSubjectDialogOpen(false);
      setSubjectName("");
      setEditingItem(null);
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update subject";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Topic CRUD
  const handleAddTopic = async () => {
    if (!topicName.trim()) {
      toast({
        title: "Error",
        description: "Topic name is required",
        variant: "destructive",
      });
      return;
    }
    if (!selectedSubjectForTopic) {
      toast({
        title: "Error",
        description: "Please select a subject",
        variant: "destructive",
      });
      return;
    }
    try {
      await testService.createTopic(topicName, selectedSubjectForTopic);
      toast({ title: "Success", description: "Topic added successfully" });
      setTopicDialogOpen(false);
      setTopicName("");
      setSelectedSubjectForTopic("");
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add topic";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditTopic = async () => {
    if (!topicName.trim() || !editingItem || editingItem.type !== "topic")
      return;
    if (!editingItem.subjectId) {
      toast({
        title: "Error",
        description: "Subject ID is required",
        variant: "destructive",
      });
      return;
    }
    try {
      await testService.updateTopic(
        editingItem.id,
        topicName,
        editingItem.subjectId,
      );
      toast({ title: "Success", description: "Topic updated successfully" });
      setTopicDialogOpen(false);
      setTopicName("");
      setSelectedSubjectForTopic("");
      setEditingItem(null);
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update topic";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Subtopic CRUD
  const handleAddSubtopic = async () => {
    if (!subtopicName.trim()) {
      toast({
        title: "Error",
        description: "Subtopic name is required",
        variant: "destructive",
      });
      return;
    }
    if (!selectedTopicForSubtopic) {
      toast({
        title: "Error",
        description: "Please select a topic",
        variant: "destructive",
      });
      return;
    }
    try {
      await testService.createSubtopic(subtopicName, selectedTopicForSubtopic);
      toast({ title: "Success", description: "Subtopic added successfully" });
      setSubtopicDialogOpen(false);
      setSubtopicName("");
      setSelectedSubjectForSubtopic("");
      setSelectedTopicForSubtopic("");
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add subtopic";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditSubtopic = async () => {
    if (!subtopicName.trim() || !editingItem || editingItem.type !== "subtopic")
      return;
    if (!editingItem.topicId) {
      toast({
        title: "Error",
        description: "Topic ID is required",
        variant: "destructive",
      });
      return;
    }
    try {
      await testService.updateSubtopic(
        editingItem.id,
        subtopicName,
        editingItem.topicId,
      );
      toast({ title: "Success", description: "Subtopic updated successfully" });
      setSubtopicDialogOpen(false);
      setSubtopicName("");
      setSelectedSubjectForSubtopic("");
      setSelectedTopicForSubtopic("");
      setEditingItem(null);
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update subtopic";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      switch (itemToDelete.type) {
        case "subject":
          await testService.deleteSubject(itemToDelete.id);
          break;
        case "topic":
          await testService.deleteTopic(itemToDelete.id);
          break;
        case "subtopic":
          await testService.deleteSubtopic(itemToDelete.id);
          break;
      }
      toast({
        title: "Success",
        description: `${itemToDelete.type} deleted successfully`,
      });
      fetchData();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to delete ${itemToDelete.type}`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openDeleteDialog = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const openEditSubject = (subject: Subject) => {
    setEditingItem({ type: "subject", id: subject.id, name: subject.name });
    setSubjectName(subject.name);
    setSubjectDialogOpen(true);
  };

  const openEditTopic = (topic: Topic) => {
    setEditingItem({
      type: "topic",
      id: topic.id,
      name: topic.name,
      subjectId: topic.subjectId || topic.subject?.id,
    });
    setTopicName(topic.name);
    setSelectedSubjectForTopic(topic.subjectId || topic.subject?.id || "");
    setTopicDialogOpen(true);
  };

  const openEditSubtopic = (subtopic: Subtopic) => {
    setEditingItem({
      type: "subtopic",
      id: subtopic.id,
      name: subtopic.name,
      topicId: subtopic.topicId || subtopic.topic?.id,
    });
    setSubtopicName(subtopic.name);
    // Find the topic and subject for display
    const topic = topics.find(
      (t) => t.id === (subtopic.topicId || subtopic.topic?.id),
    );
    if (topic) {
      setSelectedTopicForSubtopic(topic.id);
      const subject = subjects.find(
        (s) => s.id === (topic.subjectId || topic.subject?.id),
      );
      if (subject) {
        setSelectedSubjectForSubtopic(subject.name);
      }
    }
    setSubtopicDialogOpen(true);
  };

  // Bulk Upload Handlers
  const handleBulkUpload = async () => {
    if (!bulkJsonData.trim()) {
      setUploadStatus({
        type: "error",
        message: "Please enter JSON data",
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const data = JSON.parse(bulkJsonData);

      // Validate structure
      if (!data.subjects || !Array.isArray(data.subjects)) {
        throw new Error("Invalid format: Expected { subjects: [] }");
      }

      const errors: string[] = [];
      let subjectsCreated = 0;
      let topicsCreated = 0;
      let subtopicsCreated = 0;

      for (const subjectData of data.subjects) {
        if (!subjectData.name) {
          errors.push(`Subject missing name: ${JSON.stringify(subjectData)}`);
          continue;
        }

        try {
          // Create subject
          const subject = await testService.createSubject(subjectData.name);
          subjectsCreated++;

          // Create topics under this subject
          if (subjectData.topics && Array.isArray(subjectData.topics)) {
            for (const topicData of subjectData.topics) {
              if (!topicData.name) {
                errors.push(
                  `Topic missing name under subject ${subjectData.name}`,
                );
                continue;
              }

              try {
                const topic = await testService.createTopic(
                  topicData.name,
                  subject.id,
                );
                topicsCreated++;

                // Create subtopics under this topic
                if (topicData.subtopics && Array.isArray(topicData.subtopics)) {
                  for (const subtopicName of topicData.subtopics) {
                    if (!subtopicName) continue;

                    await testService.createSubtopic(subtopicName, topic.id);
                    subtopicsCreated++;
                  }
                }
              } catch (error) {
                errors.push(
                  `Failed to create topic "${topicData.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
                );
              }
            }
          }
        } catch (error) {
          errors.push(
            `Failed to create subject "${subjectData.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      if (errors.length > 0) {
        setUploadStatus({
          type: "warning",
          message: `Partial success: ${subjectsCreated} subjects, ${topicsCreated} topics, ${subtopicsCreated} subtopics created`,
          details: errors.slice(0, 5), // Show first 5 errors
        });
      } else {
        setUploadStatus({
          type: "success",
          message: `Successfully created ${subjectsCreated} subjects, ${topicsCreated} topics, and ${subtopicsCreated} subtopics!`,
        });
        setBulkJsonData("");
        fetchData(); // Refresh the tree view

        // Auto close after 2 seconds on success
        setTimeout(() => {
          setBulkUploadDialogOpen(false);
          setUploadStatus({ type: null, message: "" });
        }, 2000);
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Invalid JSON format",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = {
      subjects: [
        {
          name: "Mathematics",
          topics: [
            {
              name: "Algebra",
              subtopics: [
                "Linear Equations",
                "Quadratic Equations",
                "Polynomials",
              ],
            },
            {
              name: "Calculus",
              subtopics: ["Differentiation", "Integration", "Limits"],
            },
          ],
        },
        {
          name: "Computer Science",
          topics: [
            {
              name: "Data Structures",
              subtopics: ["Arrays", "Linked Lists", "Trees", "Graphs"],
            },
            {
              name: "Algorithms",
              subtopics: ["Sorting", "Searching", "Dynamic Programming"],
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subjects_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exampleJson = `{
  "subjects": [
    {
      "name": "Mathematics",
      "topics": [
        {
          "name": "Algebra",
          "subtopics": ["Linear Equations", "Quadratic Equations"]
        },
        {
          "name": "Geometry",
          "subtopics": ["Triangles", "Circles", "Coordinate Geometry"]
        }
      ]
    },
    {
      "name": "Physics",
      "topics": [
        {
          "name": "Mechanics",
          "subtopics": ["Kinematics", "Dynamics", "Laws of Motion"]
        },
        {
          "name": "Thermodynamics",
          "subtopics": ["Heat Transfer", "Laws of Thermodynamics"]
        }
      ]
    }
  ]
}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/superadmin/questions")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">Manage Subjects</h1>
            <p className="text-muted-foreground mt-1">
              Organize your question bank with subjects, topics, and subtopics
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Bulk Upload Button - Separate from Dialogs */}
          <Button
            variant="outline"
            onClick={() => setBulkUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>

          {/* Add Subject Dialog */}
          <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setSubjectName("");
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem?.type === "subject"
                    ? "Edit Subject"
                    : "Add New Subject"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem?.type === "subject"
                    ? "Update the subject name"
                    : "Enter a name for the new subject"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g., Mathematics, Physics, Computer Science"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubjectDialogOpen(false);
                    setSubjectName("");
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    editingItem?.type === "subject"
                      ? handleEditSubject
                      : handleAddSubject
                  }
                >
                  {editingItem?.type === "subject" ? "Update" : "Add"} Subject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Topic Dialog */}
          <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Topic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem?.type === "topic"
                    ? "Edit Topic"
                    : "Add New Topic"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem?.type === "topic"
                    ? "Update the topic name"
                    : "Create a topic under a subject"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedSubjectForTopic}
                    onChange={(e) => setSelectedSubjectForTopic(e.target.value)}
                    disabled={editingItem?.type === "topic"}
                  >
                    <option value="">Choose a subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Topic Name</Label>
                  <Input
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g., Algebra, Calculus, Data Structures"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTopicDialogOpen(false);
                    setTopicName("");
                    setSelectedSubjectForTopic("");
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    editingItem?.type === "topic"
                      ? handleEditTopic
                      : handleAddTopic
                  }
                >
                  {editingItem?.type === "topic" ? "Update" : "Add"} Topic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Subtopic Dialog */}
          <Dialog
            open={subtopicDialogOpen}
            onOpenChange={setSubtopicDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Subtopic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem?.type === "subtopic"
                    ? "Edit Subtopic"
                    : "Add New Subtopic"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem?.type === "subtopic"
                    ? "Update the subtopic name"
                    : "Create a subtopic under a topic"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Topic</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedTopicForSubtopic}
                    onChange={(e) => {
                      const topicId = e.target.value;
                      setSelectedTopicForSubtopic(topicId);
                      const selectedTopic = topics.find(
                        (t) => t.id === topicId,
                      );
                      if (selectedTopic) {
                        const subject = subjects.find(
                          (s) =>
                            s.id ===
                            (selectedTopic.subjectId ||
                              selectedTopic.subject?.id),
                        );
                        setSelectedSubjectForSubtopic(subject?.name || "");
                      }
                    }}
                    disabled={editingItem?.type === "subtopic"}
                  >
                    <option value="">Choose a topic</option>
                    {topics.map((t) => {
                      const subject = subjects.find(
                        (s) => s.id === (t.subjectId || t.subject?.id),
                      );
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} {subject ? `(${subject.name})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Subtopic Name</Label>
                  <Input
                    value={subtopicName}
                    onChange={(e) => setSubtopicName(e.target.value)}
                    placeholder="e.g., Linear Equations, Quadratic Equations"
                  />
                </div>
                {selectedSubjectForSubtopic && (
                  <p className="text-xs text-muted-foreground">
                    Adding to subject: {selectedSubjectForSubtopic}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubtopicDialogOpen(false);
                    setSubtopicName("");
                    setSelectedTopicForSubtopic("");
                    setSelectedSubjectForSubtopic("");
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    editingItem?.type === "subtopic"
                      ? handleEditSubtopic
                      : handleAddSubtopic
                  }
                >
                  {editingItem?.type === "subtopic" ? "Update" : "Add"} Subtopic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Upload Dialog */}
      <Dialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Bulk Upload Subjects/Topics/Subtopics
            </DialogTitle>
            <DialogDescription>
              Upload a JSON file or paste JSON data to create multiple subjects,
              topics, and subtopics at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* JSON Input */}
            <div className="space-y-2">
              <Label>JSON Data</Label>
              <Textarea
                value={bulkJsonData}
                onChange={(e) => setBulkJsonData(e.target.value)}
                placeholder="Paste your JSON here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {/* Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Example Format:</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkJsonData(exampleJson)}
                  className="h-6 text-xs"
                >
                  Use Example
                </Button>
              </div>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                <code>{exampleJson}</code>
              </pre>
            </div>

            {/* Status Messages */}
            {uploadStatus.type && (
              <Alert
                variant={
                  uploadStatus.type === "error" ? "destructive" : "default"
                }
              >
                {uploadStatus.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <p className="font-medium">{uploadStatus.message}</p>
                  {uploadStatus.details && uploadStatus.details.length > 0 && (
                    <ul className="mt-2 text-sm list-disc pl-4">
                      {uploadStatus.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkUploadDialogOpen(false);
                setBulkJsonData("");
                setUploadStatus({ type: null, message: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkUpload} disabled={uploading}>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? "Uploading..." : "Upload & Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subjects Tree View */}
      <div className="space-y-4">
        {subjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FolderTree className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No subjects created yet</p>
              <Button
                className="mt-4"
                onClick={() => setSubjectDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Subject
              </Button>
            </CardContent>
          </Card>
        ) : (
          subjects.map((subject) => (
            <Card key={subject.id} className="overflow-hidden">
              <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSubject(subject.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {expandedSubjects.has(subject.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">{subject.name}</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditSubject(subject)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      openDeleteDialog("subject", subject.id, subject.name)
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {expandedSubjects.has(subject.id) && (
                <div className="p-4 space-y-4">
                  {getTopicsForSubject(subject.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No topics yet. Click "Add Topic" to create one.
                    </p>
                  ) : (
                    getTopicsForSubject(subject.id).map((topic) => (
                      <div
                        key={topic.id}
                        className="border-l-2 border-primary/20 pl-4 ml-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleTopic(topic.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {expandedTopics.has(topic.id) ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>
                            <Hash className="w-4 h-4 text-primary/60" />
                            <span className="font-medium">{topic.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => openEditTopic(topic)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive"
                              onClick={() =>
                                openDeleteDialog("topic", topic.id, topic.name)
                              }
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {expandedTopics.has(topic.id) && (
                          <div className="pl-6 space-y-2 mt-2">
                            {getSubtopicsForTopic(topic.id).length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No subtopics yet
                              </p>
                            ) : (
                              getSubtopicsForTopic(topic.id).map((subtopic) => (
                                <div
                                  key={subtopic.id}
                                  className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded"
                                >
                                  <span className="text-sm">
                                    {subtopic.name}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={() => openEditSubtopic(subtopic)}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-destructive"
                                      onClick={() =>
                                        openDeleteDialog(
                                          "subtopic",
                                          subtopic.id,
                                          subtopic.name,
                                        )
                                      }
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.name}". This action
              cannot be undone.
              {itemToDelete?.type === "subject" &&
                " All topics and subtopics under this subject will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
