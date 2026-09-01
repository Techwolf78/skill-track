import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Tab 1: Pick Existing Candidates state
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [lastFailedCount, setLastFailedCount] = useState(0);

  // Reset errors and selections when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLastFailedCount(0);
      setSelectedIds([]);
      setSearchTerm("");
      setPage(0);
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

  // Fetch all candidates on dialog open
  const loadCandidates = useCallback(async () => {
    if (!open) return;
    try {
      setLoadingCandidates(true);
      const list = await candidateService.getCandidates();
      setAllCandidates(list);
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load candidate list.",
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  }, [open, toast]);

  useEffect(() => {
    if (open) {
      loadCandidates();
    }
  }, [open, loadCandidates]);

  // Client-side search across all candidates
  const filteredCandidates = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return allCandidates;
    const query = searchTerm.trim().toLowerCase();
    return allCandidates.filter(
      (c) =>
        c.user?.name?.toLowerCase().includes(query) ||
        c.user?.email?.toLowerCase().includes(query) ||
        c.user?.phoneNumber?.toLowerCase().includes(query)
    );
  }, [allCandidates, searchTerm]);

  // Reset to page 0 when searching
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const totalElements = filteredCandidates.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;

  const pagedCandidates = useMemo(() => {
    const startIndex = page * pageSize;
    return filteredCandidates.slice(startIndex, startIndex + pageSize);
  }, [filteredCandidates, page, pageSize]);

  // Sort candidate list: non-invited first, already-invited at bottom
  const sortedContent = useMemo(() => {
    const uninvited = pagedCandidates.filter((c) => !alreadyInvitedIds.has(c.id));
    const invited = pagedCandidates.filter((c) => alreadyInvitedIds.has(c.id));
    return [...uninvited, ...invited];
  }, [pagedCandidates, alreadyInvitedIds]);

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
        // Partial or complete failure: Keep modal open and retain only failed IDs for retry
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Candidates to Assessment
          </DialogTitle>
          <DialogDescription>
            Select from existing candidates in your organisation or create a new candidate.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "pick" | "create")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pick" className="gap-2">
                <Users className="w-4 h-4" />
                Select Existing Candidates
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <Plus className="w-4 h-4" />
                Create New Candidate
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: Pick Existing */}
          <TabsContent value="pick" className="flex-1 flex flex-col overflow-hidden p-6 pt-3 space-y-3">
            {/* Failure Alert Banner */}
            {lastFailedCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{lastFailedCount} invitation{lastFailedCount === 1 ? "" : "s"} failed.</strong> The failed candidates remain selected below for you to retry.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLastFailedCount(0)}
                  className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/20"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Candidates Selection Table */}
            <div className="flex-1 border rounded-lg overflow-y-auto bg-card min-h-[260px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[42px]">
                      <Checkbox
                        checked={isAllSelectableChecked}
                        onCheckedChange={(c) => toggleSelectAll(Boolean(c))}
                        disabled={selectableOnPage.length === 0}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Candidate</TableHead>
                    <TableHead className="text-xs font-semibold">Contact</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCandidates ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                        <p className="text-xs text-muted-foreground">Loading candidates...</p>
                      </TableCell>
                    </TableRow>
                  ) : sortedContent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-medium">No candidates found</p>
                        <p className="text-xs text-muted-foreground">
                          {searchTerm
                            ? "No candidates matched your search query."
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
                          className={`transition-colors ${
                            isAlreadyInvited
                              ? "opacity-50 bg-muted/20 cursor-not-allowed"
                              : isChecked
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => toggleCandidate(c.id, Boolean(checked))}
                              disabled={isAlreadyInvited}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {c.user.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2) || "C"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-xs text-foreground truncate">{c.user.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">ID: {c.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-foreground truncate max-w-[180px]">{c.user.email}</div>
                            <div className="text-[10px] text-muted-foreground">{c.user.phoneNumber || "-"}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isAlreadyInvited ? (
                              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                Already Invited
                              </Badge>
                            ) : isChecked ? (
                              <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                                Selected
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Available</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>
                Showing <strong>{totalElements === 0 ? 0 : page * pageSize + 1}</strong> to{" "}
                <strong>{Math.min((page + 1) * pageSize, totalElements)}</strong> of{" "}
                <strong>{totalElements}</strong> candidates
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0 || loadingCandidates}
                  className="h-7 w-7 p-0"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loadingCandidates}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  Page {totalPages === 0 ? 1 : page + 1} of {Math.max(1, totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loadingCandidates}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, totalPages - 1))}
                  disabled={page >= totalPages - 1 || loadingCandidates}
                  className="h-7 w-7 p-0"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Footer Action */}
            <DialogFooter className="pt-2 border-t mt-auto gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inviting}>
                Cancel
              </Button>
              <Button
                onClick={handleInviteSelected}
                disabled={selectedIds.length === 0 || inviting}
                variant={lastFailedCount > 0 ? "destructive" : "default"}
                className="gap-1.5"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lastFailedCount > 0 ? "Retrying..." : "Inviting..."}
                  </>
                ) : lastFailedCount > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry Failed Invitations ({selectedIds.length})
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Invite Selected ({selectedIds.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: Create New Candidate */}
          <TabsContent value="create" className="flex-1 flex flex-col overflow-y-auto p-6 pt-3 space-y-4">
            <form onSubmit={handleCreateAndInvite} className="space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Jane Doe"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. jane.doe@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold">
                      Account Password <span className="text-destructive">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
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
                    className="h-9 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold">
                    Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    placeholder="e.g. +91 9876543210"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Extra Custom Fields */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Custom Candidate Attributes</p>
                    <p className="text-[11px] text-muted-foreground">
                      Add optional extra metadata (e.g. College, Department, Graduation Year, Skills).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomField}
                    className="h-7 text-xs gap-1"
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
                          className="h-8 text-xs flex-1"
                        />
                        <Input
                          placeholder="Value (e.g. MIT)"
                          value={field.value}
                          onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomField(idx)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="gap-1.5">
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Create & Invite Candidate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
