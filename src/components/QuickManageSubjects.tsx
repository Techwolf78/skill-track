import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  BookOpen,
  FolderTree,
  Tag,
} from "lucide-react";
import {
  useSubjectsQuery,
  useTopicsQuery,
  useSubtopicsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useCreateTopicMutation,
  useUpdateTopicMutation,
  useDeleteTopicMutation,
  useCreateSubtopicMutation,
  useUpdateSubtopicMutation,
  useDeleteSubtopicMutation,
} from "@/hooks/use-query-hooks";
import { useToast } from "@/hooks/use-toast";

interface QuickManageSubjectsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export default function QuickManageSubjects({
  open,
  onOpenChange,
  onRefresh,
}: QuickManageSubjectsProps) {
  const { toast } = useToast();

  // Queries
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery();
  const { data: topics = [], isLoading: topicsLoading } = useTopicsQuery();
  const { data: subtopics = [], isLoading: subtopicsLoading } = useSubtopicsQuery();

  // Mutations
  const createSubject = useCreateSubjectMutation();
  const updateSubject = useUpdateSubjectMutation();
  const deleteSubject = useDeleteSubjectMutation();

  const createTopic = useCreateTopicMutation();
  const updateTopic = useUpdateTopicMutation();
  const deleteTopic = useDeleteTopicMutation();

  const createSubtopic = useCreateSubtopicMutation();
  const updateSubtopic = useUpdateSubtopicMutation();
  const deleteSubtopic = useDeleteSubtopicMutation();

  // Selection states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  // Input states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newSubtopicName, setNewSubtopicName] = useState("");

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Default selections when data loads
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    if (selectedSubjectId) {
      const filtered = topics.filter(
        (t) => t.subjectId === selectedSubjectId || t.subject?.id === selectedSubjectId
      );
      if (filtered.length > 0) {
        setSelectedTopicId(filtered[0].id);
      } else {
        setSelectedTopicId("");
      }
    } else {
      setSelectedTopicId("");
    }
  }, [selectedSubjectId, topics]);

  // Operations
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      await createSubject.mutateAsync(newSubjectName.trim());
      setNewSubjectName("");
      toast({ title: "Success", description: "Subject added successfully" });
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add subject",
        variant: "destructive",
      });
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedSubjectId) return;
    try {
      await createTopic.mutateAsync({
        name: newTopicName.trim(),
        subjectId: selectedSubjectId,
      });
      setNewTopicName("");
      toast({ title: "Success", description: "Topic added successfully" });
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add topic",
        variant: "destructive",
      });
    }
  };

  const handleAddSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtopicName.trim() || !selectedTopicId) return;
    try {
      await createSubtopic.mutateAsync({
        name: newSubtopicName.trim(),
        topicId: selectedTopicId,
      });
      setNewSubtopicName("");
      toast({ title: "Success", description: "Subtopic added successfully" });
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add subtopic",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async (type: "subject" | "topic" | "subtopic", id: string) => {
    if (!editingName.trim()) return;
    try {
      if (type === "subject") {
        await updateSubject.mutateAsync({ id, name: editingName.trim() });
      } else if (type === "topic") {
        await updateTopic.mutateAsync({ id, name: editingName.trim(), subjectId: selectedSubjectId });
      } else if (type === "subtopic") {
        await updateSubtopic.mutateAsync({ id, name: editingName.trim(), topicId: selectedTopicId });
      }
      setEditingId(null);
      setEditingName("");
      toast({ title: "Success", description: "Updated successfully" });
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (type: "subject" | "topic" | "subtopic", id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      if (type === "subject") {
        await deleteSubject.mutateAsync(id);
      } else if (type === "topic") {
        await deleteTopic.mutateAsync(id);
      } else if (type === "subtopic") {
        await deleteSubtopic.mutateAsync(id);
      }
      toast({ title: "Success", description: "Deleted successfully" });
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Delete failed",
        variant: "destructive",
      });
    }
  };

  // Filter topics and subtopics based on selections
  const filteredTopics = topics.filter(
    (t) => t.subjectId === selectedSubjectId || t.subject?.id === selectedSubjectId
  );

  const filteredSubtopics = subtopics.filter(
    (s) => s.topicId === selectedTopicId || s.topic?.id === selectedTopicId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Quick Manage Subjects
          </DialogTitle>
          <DialogDescription>
            Add, update, or delete subjects, topics, and subtopics. Changes take effect immediately in the dropdown lists.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="subjects" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mb-4 w-full">
            <TabsTrigger value="subjects" className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              Subjects
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center gap-1">
              <FolderTree className="w-4 h-4" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="subtopics" className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              Subtopics
            </TabsTrigger>
          </TabsList>

          {/* ================= SUBJECTS TAB ================= */}
          <TabsContent value="subjects" className="flex-1 flex flex-col overflow-hidden outline-none space-y-4">
            <form onSubmit={handleAddSubject} className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="New subject name..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  disabled={createSubject.isPending}
                />
              </div>
              <Button type="submit" disabled={createSubject.isPending || !newSubjectName.trim()}>
                {createSubject.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </form>

            <ScrollArea className="h-[350px] border rounded-md p-4 bg-muted/20">
              {subjectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No subjects found. Add one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {editingId === subject.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 py-0"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleSaveEdit("subject", subject.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{subject.name}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(subject.id);
                                setEditingName(subject.name);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete("subject", subject.id, subject.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ================= TOPICS TAB ================= */}
          <TabsContent value="topics" className="flex-1 flex flex-col overflow-hidden outline-none space-y-4">
            <div className="space-y-1">
              <Label htmlFor="topic-subject-select" className="text-xs text-muted-foreground">Select Subject</Label>
              <select
                id="topic-subject-select"
                className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="" disabled>Choose a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleAddTopic} className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="New topic name..."
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  disabled={createTopic.isPending || !selectedSubjectId}
                />
              </div>
              <Button
                type="submit"
                disabled={createTopic.isPending || !newTopicName.trim() || !selectedSubjectId}
              >
                {createTopic.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </form>

            <ScrollArea className="h-[350px] border rounded-md p-4 bg-muted/20">
              {!selectedSubjectId ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Please select a subject to view and manage topics.
                </div>
              ) : topicsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTopics.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No topics found for this subject. Add one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {editingId === topic.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 py-0"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleSaveEdit("topic", topic.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{topic.name}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(topic.id);
                                setEditingName(topic.name);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete("topic", topic.id, topic.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ================= SUBTOPICS TAB ================= */}
          <TabsContent value="subtopics" className="flex-1 flex flex-col overflow-hidden outline-none space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="subtopic-subject-select" className="text-xs text-muted-foreground">Select Subject</Label>
                <select
                  id="subtopic-subject-select"
                  className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  <option value="" disabled>Choose a subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="subtopic-topic-select" className="text-xs text-muted-foreground">Select Topic</Label>
                <select
                  id="subtopic-topic-select"
                  className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  disabled={!selectedSubjectId}
                >
                  <option value="" disabled>Choose a topic</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleAddSubtopic} className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="New subtopic name..."
                  value={newSubtopicName}
                  onChange={(e) => setNewSubtopicName(e.target.value)}
                  disabled={createSubtopic.isPending || !selectedTopicId}
                />
              </div>
              <Button
                type="submit"
                disabled={createSubtopic.isPending || !newSubtopicName.trim() || !selectedTopicId}
              >
                {createSubtopic.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </form>

            <ScrollArea className="h-[350px] border rounded-md p-4 bg-muted/20">
              {!selectedTopicId ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Please select a topic to view and manage subtopics.
                </div>
              ) : subtopicsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSubtopics.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No subtopics found for this topic. Add one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSubtopics.map((subtopic) => (
                    <div
                      key={subtopic.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {editingId === subtopic.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 py-0"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleSaveEdit("subtopic", subtopic.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{subtopic.name}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(subtopic.id);
                                setEditingName(subtopic.name);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete("subtopic", subtopic.id, subtopic.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
