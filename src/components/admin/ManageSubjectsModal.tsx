import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Search,
  ChevronRight,
  Sparkles,
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ManageSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

type TabType = "SUBJECTS" | "TOPICS" | "SUBTOPICS";

export function ManageSubjectsModal({
  isOpen,
  onClose,
  onRefresh,
}: ManageSubjectsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("SUBJECTS");

  // Queries
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjectsQuery();
  const { data: topics = [], isLoading: topicsLoading } = useTopicsQuery();
  const { data: subtopics = [], isLoading: subtopicsLoading } = useSubtopicsQuery();

  // Mutations
  const createSubjectMutation = useCreateSubjectMutation();
  const updateSubjectMutation = useUpdateSubjectMutation();
  const deleteSubjectMutation = useDeleteSubjectMutation();

  const createTopicMutation = useCreateTopicMutation();
  const updateTopicMutation = useUpdateTopicMutation();
  const deleteTopicMutation = useDeleteTopicMutation();

  const createSubtopicMutation = useCreateSubtopicMutation();
  const updateSubtopicMutation = useUpdateSubtopicMutation();
  const deleteSubtopicMutation = useDeleteSubtopicMutation();

  // Selection states for Topics and Subtopics
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  // Input states
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newSubtopicName, setNewSubtopicName] = useState("");

  // Search filter inside active tab
  const [searchFilter, setSearchFilter] = useState("");

  // Inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Auto-select first subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Auto-select first topic when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      const filtered = topics.filter(
        (t) => t.subjectId === selectedSubjectId || t.subject?.id === selectedSubjectId
      );
      if (filtered.length > 0) {
        if (!filtered.some((t) => t.id === selectedTopicId)) {
          setSelectedTopicId(filtered[0].id);
        }
      } else {
        setSelectedTopicId("");
      }
    } else {
      setSelectedTopicId("");
    }
  }, [selectedSubjectId, topics, selectedTopicId]);

  // Reset editing & search when switching tabs
  useEffect(() => {
    setEditingId(null);
    setEditingName("");
    setSearchFilter("");
  }, [activeTab]);

  // Filtered lists based on selections and search
  const availableTopicsForSubject = useMemo(() => {
    if (!selectedSubjectId) return [];
    return topics.filter(
      (t) => t.subjectId === selectedSubjectId || t.subject?.id === selectedSubjectId
    );
  }, [topics, selectedSubjectId]);

  const availableSubtopicsForTopic = useMemo(() => {
    if (!selectedTopicId) return [];
    return subtopics.filter(
      (st) => st.topicId === selectedTopicId || st.topic?.id === selectedTopicId
    );
  }, [subtopics, selectedTopicId]);

  const displayedSubjects = useMemo(() => {
    if (!searchFilter.trim()) return subjects;
    const q = searchFilter.toLowerCase();
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, searchFilter]);

  const displayedTopics = useMemo(() => {
    if (!searchFilter.trim()) return availableTopicsForSubject;
    const q = searchFilter.toLowerCase();
    return availableTopicsForSubject.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTopicsForSubject, searchFilter]);

  const displayedSubtopics = useMemo(() => {
    if (!searchFilter.trim()) return availableSubtopicsForTopic;
    const q = searchFilter.toLowerCase();
    return availableSubtopicsForTopic.filter((st) => st.name.toLowerCase().includes(q));
  }, [availableSubtopicsForTopic, searchFilter]);

  // Extract error message helper
  const getErrorMessage = (err: unknown, fallback: string) => {
    const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
    return apiErr.response?.data?.message || apiErr.message || fallback;
  };

  // Handlers
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name) {
      toast.error("Subject name is required");
      return;
    }
    try {
      const created = await createSubjectMutation.mutateAsync(name);
      setNewSubjectName("");
      toast.success(`Subject "${name}" created successfully`);
      if (created?.id) setSelectedSubjectId(created.id);
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create subject"));
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTopicName.trim();
    if (!selectedSubjectId) {
      toast.error("Please select a subject first");
      return;
    }
    if (!name) {
      toast.error("Topic name is required");
      return;
    }
    try {
      const created = await createTopicMutation.mutateAsync({
        name,
        subjectId: selectedSubjectId,
      });
      setNewTopicName("");
      toast.success(`Topic "${name}" created successfully`);
      if (created?.id) setSelectedTopicId(created.id);
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create topic"));
    }
  };

  const handleAddSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubtopicName.trim();
    if (!selectedTopicId) {
      toast.error("Please select a topic first");
      return;
    }
    if (!name) {
      toast.error("Subtopic name is required");
      return;
    }
    try {
      await createSubtopicMutation.mutateAsync({
        name,
        topicId: selectedTopicId,
      });
      setNewSubtopicName("");
      toast.success(`Subtopic "${name}" created successfully`);
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create subtopic"));
    }
  };

  const handleSaveEdit = async (type: "subject" | "topic" | "subtopic", id: string) => {
    const name = editingName.trim();
    if (!name) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      if (type === "subject") {
        await updateSubjectMutation.mutateAsync({ id, name });
      } else if (type === "topic") {
        await updateTopicMutation.mutateAsync({ id, name, subjectId: selectedSubjectId });
      } else if (type === "subtopic") {
        await updateSubtopicMutation.mutateAsync({ id, name, topicId: selectedTopicId });
      }
      setEditingId(null);
      setEditingName("");
      toast.success("Updated successfully");
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Update failed"));
    }
  };

  const handleDelete = async (type: "subject" | "topic" | "subtopic", id: string, name: string) => {
    try {
      if (type === "subject") {
        await deleteSubjectMutation.mutateAsync(id);
        if (selectedSubjectId === id) setSelectedSubjectId("");
      } else if (type === "topic") {
        await deleteTopicMutation.mutateAsync(id);
        if (selectedTopicId === id) setSelectedTopicId("");
      } else if (type === "subtopic") {
        await deleteSubtopicMutation.mutateAsync(id);
      }
      toast.success(`Deleted "${name}" successfully`);
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Delete failed"));
    }
  };

  const isCreating =
    createSubjectMutation.isPending ||
    createTopicMutation.isPending ||
    createSubtopicMutation.isPending;

  const isUpdating =
    updateSubjectMutation.isPending ||
    updateTopicMutation.isPending ||
    updateSubtopicMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl h-[85vh] max-h-[720px] min-h-[560px] bg-white border border-slate-200/90 p-0 flex flex-col shadow-2xl overflow-hidden">
        {/* Header (Pinned) */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1 pr-6">
            <DialogTitle className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-indigo-600" />
              Manage Subjects & Taxonomy
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0 pr-8">
            <Badge variant="outline" className="text-xs font-normal text-slate-600 border-slate-200 bg-slate-50">
              {subjects.length} Subjects
            </Badge>
            <Badge variant="outline" className="text-xs font-normal text-slate-600 border-slate-200 bg-slate-50">
              {topics.length} Topics
            </Badge>
            <Badge variant="outline" className="text-xs font-normal text-slate-600 border-slate-200 bg-slate-50">
              {subtopics.length} Subtopics
            </Badge>
          </div>
        </DialogHeader>

        {/* Tab Navigation (Pinned) */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 shrink-0">
          {[
            { key: "SUBJECTS", label: "1. Subjects", icon: BookOpen, count: subjects.length },
            { key: "TOPICS", label: "2. Topics", icon: FolderTree, count: availableTopicsForSubject.length },
            { key: "SUBTOPICS", label: "3. Subtopics", icon: Tag, count: availableSubtopicsForTopic.length },
          ].map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  active
                    ? "border-indigo-600 text-indigo-700 bg-white shadow-xs rounded-t"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    active ? "bg-indigo-100 text-indigo-700" : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Body (Flex column, no outer overflow jump) */}
        <div className="flex-1 flex flex-col px-6 py-4 space-y-3 min-h-0 overflow-hidden">
          {/* ===================== TAB 1: SUBJECTS ===================== */}
          {activeTab === "SUBJECTS" && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              {/* Standardized Add Subject Card */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded shrink-0">
                <form onSubmit={handleAddSubject} className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <span>New Subject Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter subject name (e.g. Computer Science, Quantitative Aptitude)..."
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      disabled={isCreating}
                      className="flex-1 bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
                    />
                    <button
                      type="submit"
                      disabled={isCreating || !newSubjectName.trim()}
                      className="shrink-0 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer rounded h-9 shadow-xs"
                    >
                      {createSubjectMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Add Subject</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Subjects List & Search (Pinned Header + Scrollable Area) */}
              <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Subjects List ({displayedSubjects.length})
                    </span>
                  </div>
                  {/* Search Bar */}
                  <div className="w-64 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search subjects..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* List Container - fills 100% of remaining space with smooth scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100 bg-white">
                  {subjectsLoading ? (
                    <div className="py-12 flex justify-center items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      Loading subjects...
                    </div>
                  ) : displayedSubjects.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      {searchFilter ? "No subjects match your search." : "No subjects found. Create one above."}
                    </div>
                  ) : (
                    displayedSubjects.map((subject) => {
                      const topicCount = topics.filter(
                        (t) => t.subjectId === subject.id || t.subject?.id === subject.id
                      ).length;
                      const isEditing = editingId === subject.id;

                      return (
                        <div
                          key={subject.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 bg-white border border-indigo-400 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none ring-1 ring-indigo-400"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit("subject", subject.id)}
                                disabled={isUpdating}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {subject.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-normal"
                                >
                                  {topicCount} topic{topicCount === 1 ? "" : "s"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setSelectedSubjectId(subject.id);
                                    setActiveTab("TOPICS");
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View Topics under this Subject"
                                >
                                  <span>Manage Topics</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(subject.id);
                                    setEditingName(subject.name);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Edit Subject"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete("subject", subject.id, subject.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Subject"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: TOPICS ===================== */}
          {activeTab === "TOPICS" && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              {/* Standardized Parent Subject + Add Topic Card */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <span>Select Parent Subject</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-9 leading-tight font-medium"
                    >
                      <option value="" disabled>-- Choose a Subject --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={handleAddTopic} className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <span>New Topic Name</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter topic name..."
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        disabled={isCreating || !selectedSubjectId}
                        className="flex-1 bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
                      />
                      <button
                        type="submit"
                        disabled={isCreating || !newTopicName.trim() || !selectedSubjectId}
                        className="shrink-0 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer rounded h-9 shadow-xs"
                      >
                        {createTopicMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Add Topic</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Topics List & Search (Pinned Header + Scrollable Area) */}
              <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Topics in Selected Subject ({displayedTopics.length})
                    </span>
                  </div>
                  {/* Search Bar */}
                  <div className="w-64 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search topics..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* List Container - fills 100% of remaining space with smooth scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100 bg-white">
                  {!selectedSubjectId ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      Please select a subject above to manage its topics.
                    </div>
                  ) : topicsLoading ? (
                    <div className="py-12 flex justify-center items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      Loading topics...
                    </div>
                  ) : displayedTopics.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      {searchFilter ? "No topics match your search." : "No topics found under this subject. Add one above."}
                    </div>
                  ) : (
                    displayedTopics.map((topic) => {
                      const subtopicCount = subtopics.filter(
                        (st) => st.topicId === topic.id || st.topic?.id === topic.id
                      ).length;
                      const isEditing = editingId === topic.id;

                      return (
                        <div
                          key={topic.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 bg-white border border-indigo-400 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none ring-1 ring-indigo-400"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit("topic", topic.id)}
                                disabled={isUpdating}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <FolderTree className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {topic.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-normal"
                                >
                                  {subtopicCount} subtopic{subtopicCount === 1 ? "" : "s"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setSelectedTopicId(topic.id);
                                    setActiveTab("SUBTOPICS");
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View Subtopics under this Topic"
                                >
                                  <span>Manage Subtopics</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(topic.id);
                                    setEditingName(topic.name);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Edit Topic"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete("topic", topic.id, topic.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Topic"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: SUBTOPICS ===================== */}
          {activeTab === "SUBTOPICS" && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              {/* Standardized Cascading Subject + Topic + Add Subtopic Card */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  {/* Select Subject */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <span>Subject</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-9 leading-tight font-medium"
                    >
                      <option value="" disabled>-- Select Subject --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Topic */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <span>Topic</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      disabled={!selectedSubjectId || availableTopicsForSubject.length === 0}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed h-9 leading-tight font-medium"
                    >
                      <option value="" disabled>
                        {availableTopicsForSubject.length === 0 ? "-- No Topics --" : "-- Select Topic --"}
                      </option>
                      {availableTopicsForSubject.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Add Subtopic Form */}
                  <form onSubmit={handleAddSubtopic} className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <span>New Subtopic Name</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter subtopic..."
                        value={newSubtopicName}
                        onChange={(e) => setNewSubtopicName(e.target.value)}
                        disabled={isCreating || !selectedTopicId}
                        className="flex-1 bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
                      />
                      <button
                        type="submit"
                        disabled={isCreating || !newSubtopicName.trim() || !selectedTopicId}
                        className="shrink-0 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer rounded h-9 shadow-xs"
                      >
                        {createSubtopicMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Add Subtopic</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Subtopics List & Search (Pinned Header + Scrollable Area) */}
              <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Subtopics in Selected Topic ({displayedSubtopics.length})
                    </span>
                  </div>
                  {/* Search Bar */}
                  <div className="w-64 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search subtopics..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* List Container - fills 100% of remaining space with smooth scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100 bg-white">
                  {!selectedTopicId ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      Please select a subject and topic above to manage subtopics.
                    </div>
                  ) : subtopicsLoading ? (
                    <div className="py-12 flex justify-center items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      Loading subtopics...
                    </div>
                  ) : displayedSubtopics.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      {searchFilter ? "No subtopics match your search." : "No subtopics found under this topic. Add one above."}
                    </div>
                  ) : (
                    displayedSubtopics.map((subtopic) => {
                      const isEditing = editingId === subtopic.id;

                      return (
                        <div
                          key={subtopic.id}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 bg-white border border-indigo-400 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none ring-1 ring-indigo-400"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit("subtopic", subtopic.id)}
                                disabled={isUpdating}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingName("");
                                }}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {subtopic.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingId(subtopic.id);
                                    setEditingName(subtopic.name);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Edit Subtopic"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete("subtopic", subtopic.id, subtopic.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Subtopic"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Pinned) */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer rounded shadow-xs"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
