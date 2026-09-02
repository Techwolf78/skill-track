import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { candidateService, Candidate, SpringPage } from "@/lib/candidate-service";
import { cn } from "@/lib/utils";
import {
  Search,
  Loader2,
  Send,
  UserPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface AddCandidatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  alreadyInvitedIds: Set<string>;
  onSuccess: () => void;
}

export function AddCandidatesModal({
  open,
  onOpenChange,
  scheduleId,
  alreadyInvitedIds,
  onSuccess,
}: AddCandidatesModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pick" | "create">("pick");

  // Tab 1: Pick Existing Candidates state (Server-Side Pagination & Search)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [pageData, setPageData] = useState<SpringPage<Candidate>>({
    content: [],
    totalElements: 0,
    totalPages: 1,
    size: 15,
    number: 0,
    first: true,
    last: true,
    empty: true,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [lastFailedCount, setLastFailedCount] = useState(0);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset errors and selections when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLastFailedCount(0);
      setSelectedIds([]);
      setSearchTerm("");
      setDebouncedSearch("");
      setPage(0);
      setActiveTab("pick");
    }
  }, [open]);

  // Tab 2: Create Candidate Form state
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [creating, setCreating] = useState(false);

  // Server-side paginated fetch with backend search
  const fetchPage = useCallback(async () => {
    if (!open) return;
    try {
      setLoadingCandidates(true);
      const res = await candidateService.getCandidatesPage(page, pageSize, debouncedSearch);
      setPageData(res);
    } catch (error) {
      console.error("Failed to fetch candidates page:", error);
      toast({
        title: "Error",
        description: "Failed to load candidate list.",
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  }, [open, page, pageSize, debouncedSearch, toast]);

  useEffect(() => {
    if (open) {
      fetchPage();
    }
  }, [open, fetchPage]);

  // Sort candidate list on the active page: non-invited first, already-invited at bottom
  const sortedContent = useMemo(() => {
    const list = pageData.content ?? [];
    const uninvited = list.filter((c) => !alreadyInvitedIds.has(c.id));
    const invited = list.filter((c) => alreadyInvitedIds.has(c.id));
    return [...uninvited, ...invited];
  }, [pageData.content, alreadyInvitedIds]);

  // Select all selectable on current page
  const selectableOnPage = useMemo(() => {
    return sortedContent.filter((c) => !alreadyInvitedIds.has(c.id)).map((c) => c.id);
  }, [sortedContent, alreadyInvitedIds]);

  const isAllSelectableChecked =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((id) => selectedIds.includes(id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...selectableOnPage])));
    } else {
      const pageSet = new Set(selectableOnPage);
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
    }
  };

  const toggleCandidate = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Bulk invite selected with partial-failure handling
  const handleInviteSelected = async () => {
    if (selectedIds.length === 0 || !scheduleId) return;
    try {
      setInviting(true);
      let successCount = 0;
      const failedIds: string[] = [];

      for (const candidateId of selectedIds) {
        try {
          await candidateService.createInvitation({
            scheduleId,
            candidateId,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to invite candidate ${candidateId}:`, err);
          failedIds.push(candidateId);
        }
      }

      setLastFailedCount(failedIds.length);

      if (failedIds.length === 0) {
        // Complete success
        toast({
          title: "Invitations Sent",
          description: `Successfully invited all ${successCount} candidate${successCount === 1 ? "" : "s"}.`,
        });
        setSelectedIds([]);
        setLastFailedCount(0);
        onSuccess();
        onOpenChange(false);
      } else {
        // Partial failure: Keep modal open and retain only failed IDs for retry
        if (successCount > 0) {
          onSuccess();
          fetchPage();
        }
        setSelectedIds(failedIds);

        toast({
          title: successCount > 0 ? "Partial Invitations Sent" : "Invitations Failed",
          description: successCount > 0
            ? `${successCount} candidate${successCount === 1 ? "" : "s"} invited successfully, but ${failedIds.length} failed. The failed candidates remain selected below so you can retry.`
            : `Failed to invite ${failedIds.length} candidate${failedIds.length === 1 ? "" : "s"}. The selections have been retained for you to retry.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Bulk invite error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending invitations.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  // Generate random strong password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, password: pwd }));
  };

  // Add custom extra field
  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateCustomField = (index: number, field: "key" | "value", val: string) => {
    setCustomFields((prev) => {
      const copy = [...prev];
      copy[index][field] = val;
      return copy;
    });
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Create Candidate + Invite
  const handleCreateAndInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in Name, Email, and Password.",
        variant: "destructive",
      });
      return;
    }

    const orgId = user?.organisationData?.id;
    if (!orgId) {
      toast({
        title: "Organisation Error",
        description: "No organisation ID found for current user.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);

      const extraFieldsMap: Record<string, unknown> = {};
      customFields.forEach(({ key, value }) => {
        if (key.trim()) {
          extraFieldsMap[key.trim()] = value.trim();
        }
      });

      // 1. Create candidate
      const candidateId = await candidateService.createCandidate({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phoneNumber: createForm.phoneNumber.trim() || undefined,
        organisationId: orgId,
        extraFields: Object.keys(extraFieldsMap).length > 0 ? extraFieldsMap : undefined,
      });

      // 2. Send invitation
      await candidateService.createInvitation({
        scheduleId,
        candidateId,
      });

      toast({
        title: "Candidate Created & Invited",
        description: `Successfully added ${createForm.name} and issued test invitation.`,
      });

      setCreateForm({ name: "", email: "", password: "", phoneNumber: "" });
      setCustomFields([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Create and invite error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "Failed to Add Candidate",
        description: err.response?.data?.message || err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-xl text-slate-900 font-sans">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-slate-900">
              Add Candidates to Assessment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Select from existing candidates in your organisation or create a new candidate.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("pick")}
              className={cn(
                "py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer",
                activeTab === "pick"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Select Existing Candidates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={cn(
                "py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all cursor-pointer",
                activeTab === "create"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              Create New Candidate
            </button>
          </div>
        </div>

        {/* TAB 1: Pick Existing */}
        {activeTab === "pick" && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 pt-3 space-y-3">
            {/* Failure Alert Banner */}
            {lastFailedCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>
                    <strong>{lastFailedCount} invitation{lastFailedCount === 1 ? "" : "s"} failed.</strong> The failed candidates remain selected below for you to retry.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastFailedCount(0)}
                  className="h-6 px-2 text-[11px] text-red-700 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Search Input with Server Debounce */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search candidates by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Candidates Selection Table */}
            <div className="flex-1 border border-slate-200 rounded-lg overflow-y-auto bg-white min-h-[260px]">
              <Table>
                <TableHeader className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200">
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="w-[42px] py-2 px-3">
                      <Checkbox
                        checked={isAllSelectableChecked}
                        onCheckedChange={(c) => toggleSelectAll(Boolean(c))}
                        disabled={selectableOnPage.length === 0}
                        className="data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981] border-slate-300"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 py-2">Candidate</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 py-2">Contact</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600 py-2 pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCandidates ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        <p className="text-xs text-slate-500">Loading candidates from server...</p>
                      </TableCell>
                    </TableRow>
                  ) : sortedContent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-700">No candidates found</p>
                        <p className="text-xs text-slate-400">
                          {debouncedSearch
                            ? `No candidates matched "${debouncedSearch}".`
                            : "No candidates registered in your organisation."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedContent.map((c) => {
                      const isAlreadyInvited = alreadyInvitedIds.has(c.id);
                      const isChecked = selectedIds.includes(c.id);

                      return (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "transition-colors border-b border-slate-100",
                            isAlreadyInvited
                              ? "opacity-50 bg-slate-50/50 cursor-not-allowed"
                              : isChecked
                              ? "bg-emerald-50/40 hover:bg-emerald-50/60"
                              : "hover:bg-slate-50/80"
                          )}
                        >
                          <TableCell className="py-2.5 px-3">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => toggleCandidate(c.id, Boolean(checked))}
                              disabled={isAlreadyInvited}
                              className="data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981] border-slate-300"
                            />
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                                isChecked
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              )}>
                                {c.user.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2) || "C"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-slate-900 truncate">{c.user.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">ID: {c.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-xs text-slate-700 truncate max-w-[180px]">{c.user.email}</div>
                            <div className="text-[10px] text-slate-400">{c.user.phoneNumber || "—"}</div>
                          </TableCell>
                          <TableCell className="text-right py-2.5 pr-4">
                            {isAlreadyInvited ? (
                              <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400 font-normal">
                                Already Invited
                              </Badge>
                            ) : isChecked ? (
                              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                Selected
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Available</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Server-Side Pagination Controls */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <span>
                Showing <strong>{pageData.totalElements === 0 ? 0 : page * pageSize + 1}</strong> to{" "}
                <strong>{Math.min((page + 1) * pageSize, pageData.totalElements)}</strong> of{" "}
                <strong>{pageData.totalElements}</strong> candidates
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0 || loadingCandidates}
                  className="h-7 w-7 p-0 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loadingCandidates}
                  className="h-7 w-7 p-0 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-semibold text-slate-800">
                  Page {pageData.totalPages === 0 ? 1 : page + 1} of {Math.max(1, pageData.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageData.totalPages - 1, p + 1))}
                  disabled={page >= pageData.totalPages - 1 || loadingCandidates}
                  className="h-7 w-7 p-0 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, pageData.totalPages - 1))}
                  disabled={page >= pageData.totalPages - 1 || loadingCandidates}
                  className="h-7 w-7 p-0 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Footer Action */}
            <DialogFooter className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={inviting}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 rounded-lg px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleInviteSelected}
                disabled={selectedIds.length === 0 || inviting}
                className={cn(
                  "text-xs font-semibold rounded-lg px-4 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  lastFailedCount > 0
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-[#10B981] hover:bg-[#059669] text-white"
                )}
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {lastFailedCount > 0 ? "Retrying..." : "Inviting..."}
                  </>
                ) : lastFailedCount > 0 ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Failed Invitations ({selectedIds.length})
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Invite Selected ({selectedIds.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TAB 2: Create New Candidate */}
        {activeTab === "create" && (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 pt-4 space-y-4">
            <form onSubmit={handleCreateAndInvite} className="space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Jane Doe"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-9 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. jane.doe@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-9 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                      Account Password <span className="text-red-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      Auto-generate
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Create a password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    className="h-9 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold text-slate-700">
                    Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    placeholder="e.g. +91 9876543210"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    className="h-9 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Dynamic Extra Custom Fields */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Custom Candidate Attributes</p>
                    <p className="text-[11px] text-slate-400">
                      Add optional extra metadata (e.g. College, Department, Graduation Year, Skills).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomField}
                    className="h-7 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Field
                  </Button>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {customFields.map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Field name (e.g. College)"
                          value={field.key}
                          onChange={(e) => updateCustomField(idx, "key", e.target.value)}
                          className="h-8 text-xs flex-1 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <Input
                          placeholder="Value (e.g. MIT)"
                          value={field.value}
                          onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                          className="h-8 text-xs flex-1 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomField(idx)}
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 rounded-lg px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-white rounded-lg px-4 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Create & Invite Candidate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
