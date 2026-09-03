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
import { apiClient } from "@/lib/api-client";
import * as XLSX from "xlsx";
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
  X,
  FileSpreadsheet,
  Download,
  Upload,
  GripVertical,
  Check,
  ArrowRight,
} from "lucide-react";

interface AddCandidatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  alreadyInvitedIds: Set<string>;
  onSuccess: () => void;
  testTitle?: string;
  organisationName?: string;
}

export function AddCandidatesModal({
  open,
  onOpenChange,
  scheduleId,
  alreadyInvitedIds,
  onSuccess,
  testTitle = "Assessment",
  organisationName,
}: AddCandidatesModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pick" | "create" | "bulk">("pick");

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

  // Tab 3: Bulk Import state
  const [bulkCustomFields, setBulkCustomFields] = useState<Array<{ id: string; name: string; required: boolean }>>([
    { id: "std_name", name: "Name", required: true },
    { id: "std_email", name: "Email", required: true },
    { id: "std_password", name: "Password", required: true },
    { id: "std_phone", name: "PhoneNumber", required: false },
  ]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [processingBulkFile, setProcessingBulkFile] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [parsedBulkCandidates, setParsedBulkCandidates] = useState<
    Array<{ name: string; email: string; phoneNumber?: string; status?: "SUCCESS" | "FAILED"; errorMessage?: string }>
  >([]);
  const [bulkStep, setBulkStep] = useState<"upload" | "review">("upload");

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
      setBulkFile(null);
      setBulkError(null);
      setParsedBulkCandidates([]);
      setBulkStep("upload");
    }
  }, [open]);

  // Bulk Template Download
  const downloadBulkTemplate = (format: "xlsx" | "csv" = "xlsx") => {
    const headers = bulkCustomFields.map((f) => f.name);
    const sampleRow = bulkCustomFields.map((f) => {
      const lower = f.name.toLowerCase();
      if (lower.includes("name") && !lower.includes("college")) return "Jane Doe";
      if (lower.includes("email")) return "jane.doe@example.com";
      if (lower.includes("password")) return "SecurePass@123";
      if (lower.includes("phone")) return "+91 9876543210";
      return `Sample ${f.name}`;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");

    const fileName = `candidate_import_template.${format}`;
    XLSX.writeFile(wb, fileName, { bookType: format });

    toast({
      title: "Template Downloaded",
      description: `Downloaded "${fileName}" with ${bulkCustomFields.length} column(s).`,
    });
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.substring(selected.name.lastIndexOf(".")).toLowerCase();
      if (![".csv", ".xlsx", ".xls"].includes(ext)) {
        setBulkError("Please upload a valid CSV or Excel file (.xlsx, .xls, .csv).");
        setBulkFile(null);
        return;
      }
      setBulkFile(selected);
      setBulkError(null);
    }
  };

  const handleAddBulkField = () => {
    const trimmed = newFieldName.trim();
    if (!trimmed) return;
    if (bulkCustomFields.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Field Exists", description: `"${trimmed}" is already in the list.`, variant: "destructive" });
      return;
    }
    setBulkCustomFields((prev) => [
      ...prev,
      { id: "cf_" + Math.random().toString(36).substring(2, 9), name: trimmed, required: newFieldRequired },
    ]);
    setNewFieldName("");
    setNewFieldRequired(false);
  };

  const handleProcessBulkFile = async () => {
    if (!bulkFile) return;
    const orgId = user?.organisationData?.id;
    if (!orgId) {
      setBulkError("No organisation found.");
      return;
    }

    try {
      setProcessingBulkFile(true);
      setBulkError(null);

      const arrayBuffer = await bulkFile.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

      const parsed = rows
        .map((r) => {
          const name = String(r["Name"] || r["name"] || r["Full Name"] || "");
          const email = String(r["Email"] || r["email"] || r["EMAIL"] || "").trim();
          const phoneNumber = String(r["PhoneNumber"] || r["Phone"] || r["phone"] || "");
          return { name, email, phoneNumber, status: "SUCCESS" as const };
        })
        .filter((c) => Boolean(c.email));

      if (parsed.length === 0) {
        throw new Error("No candidate rows with valid email addresses found.");
      }

      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("organisationId", orgId);

      await apiClient.post("/candidates/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setParsedBulkCandidates(parsed);
      setBulkStep("review");
    } catch (err) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setBulkError(errorObj.response?.data?.message || errorObj.message || "Failed to process candidate file.");
    } finally {
      setProcessingBulkFile(false);
    }
  };

  const handleSendBulkInvitations = async () => {
    if (parsedBulkCandidates.length === 0) return;
    try {
      setInviting(true);
      let successCount = 0;
      for (const cand of parsedBulkCandidates) {
        try {
          await candidateService.createInvitation({
            scheduleId,
            candidateEmail: cand.email,
          });
          successCount++;
        } catch (err) {
          console.error("Bulk invite failure for:", cand.email, err);
        }
      }
      toast({
        title: "Bulk Invitations Dispatched",
        description: `Successfully sent ${successCount} invitation${successCount === 1 ? "" : "s"}.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Invite Error", description: "Failed to send bulk invitations.", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const effectiveOrgName =
    organisationName ||
    user?.organisationData?.name ||
    (user as { organisationName?: string })?.organisationName ||
    "Gryphon 360";

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
      <DialogContent
        hideDefaultClose
        className="w-[85vw] max-w-[1360px] h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl text-slate-900 font-sans"
      >
        {/* Top Header Banner matching reference design */}
        <div className="bg-[#3b50a6] text-white px-6 py-3.5 flex items-center justify-between shrink-0 select-none shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>Invite candidates for</span>
              <span className="font-bold text-white underline decoration-white/40 underline-offset-2">
                {testTitle}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content: Split Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* ──── LEFT COLUMN: Candidate Selection / Creation (7 cols) ──── */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
            {/* Top Navigation Tabs */}
            <div className="p-4 pb-2 border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-lg text-xs font-medium gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("pick")}
                  className={cn(
                    "py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center",
                    activeTab === "pick"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Select Existing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className={cn(
                    "py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center",
                    activeTab === "create"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Create New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("bulk")}
                  className={cn(
                    "py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center",
                    activeTab === "bulk"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Bulk Import</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Select Existing Candidates */}
            {activeTab === "pick" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5 pt-3 space-y-3">
                {/* Failure Alert Banner */}
                {lastFailedCount > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>
                        <strong>{lastFailedCount} invitation{lastFailedCount === 1 ? "" : "s"} failed.</strong> The failed candidates remain selected for retry.
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
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search candidates by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
                  />
                </div>

                {/* Candidates Selection Table (Fills full height) */}
                <div className="flex-1 border border-slate-200 rounded-lg overflow-y-auto bg-white min-h-0">
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
                          <TableCell colSpan={4} className="text-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#3b50a6] mb-2" />
                            <p className="text-xs text-slate-500">Loading candidates from server...</p>
                          </TableCell>
                        </TableRow>
                      ) : sortedContent.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-16 text-slate-500">
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
                                  <div
                                    className={cn(
                                      "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                                      isChecked
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                    )}
                                  >
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
                                <div className="text-xs text-slate-700 truncate max-w-[170px]">{c.user.email}</div>
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
                <div className="flex items-center justify-between pt-1 text-xs text-slate-500 shrink-0">
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

                {/* Action Footer for Tab 1 */}
                <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-end gap-2 shrink-0">
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
                      "text-xs font-semibold rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                      lastFailedCount > 0
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-[#10B981] hover:bg-[#059669] text-white"
                    )}
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {lastFailedCount > 0 ? "Retrying..." : "Sending Invitations..."}
                      </>
                    ) : lastFailedCount > 0 ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Failed Invitations ({selectedIds.length})
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Invitations {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: Create New Candidate (Same fixed height container with internal scroll) */}
            {activeTab === "create" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 pt-4">
                <form onSubmit={handleCreateAndInvite} className="flex-1 flex flex-col space-y-4">
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
                        className="h-10 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
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
                        className="h-10 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5">
                        <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                          Account Password <span className="text-red-500">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
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
                        className="h-10 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center h-5">
                        <Label htmlFor="phoneNumber" className="text-xs font-semibold text-slate-700">
                          Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                        </Label>
                      </div>
                      <Input
                        id="phoneNumber"
                        placeholder="e.g. +91 9876543210"
                        value={createForm.phoneNumber}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                        className="h-10 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
                      />
                    </div>
                  </div>

                  {/* Dynamic Extra Custom Fields */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Custom Candidate Attributes</p>
                        <p className="text-[11px] text-slate-400">
                          Add optional extra metadata (e.g. College, Department, Graduation Year).
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
                              className="h-8 text-xs flex-1 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
                            />
                            <Input
                              placeholder="Value (e.g. MIT)"
                              value={field.value}
                              onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                              className="h-8 text-xs flex-1 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3b50a6] focus:border-[#3b50a6]"
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

                  {/* Action Footer for Tab 2 */}
                  <div className="pt-4 border-t border-slate-100 mt-auto flex items-center justify-end gap-2 shrink-0">
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
                      className="text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-white rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: Bulk Import */}
            {activeTab === "bulk" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Top Card: Template & Custom Fields with Excel & CSV download buttons */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Template & Custom Fields</h4>
                        <p className="text-[11px] text-slate-500">Configure columns and download template</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => downloadBulkTemplate("xlsx")}
                          className="h-8 text-xs font-semibold gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          Excel (.xlsx)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => downloadBulkTemplate("csv")}
                          className="h-8 text-xs font-semibold gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          CSV
                        </Button>
                      </div>
                    </div>

                    {/* Drag and Drop File Upload Area */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Upload className="w-3.5 h-3.5 text-orange-500" />
                        <span>Upload Completed File</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Select your completed Excel or CSV file.
                      </p>

                      <label className="flex flex-col items-center justify-center w-full py-5 px-4 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                        <span className="text-xs font-semibold text-slate-800">
                          Click to select file or drag & drop
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          Supports .xlsx, .xls, .csv
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleBulkFileChange}
                          disabled={processingBulkFile}
                        />
                      </label>

                      {bulkFile && (
                        <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-medium text-slate-800 truncate">{bulkFile.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(bulkFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBulkFile(null)}
                            className="text-xs font-medium text-red-600 hover:underline shrink-0 ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {bulkError && (
                        <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                          <span>{bulkError}</span>
                        </div>
                      )}
                    </div>

                    {/* Standard Fields: Name, Email, Password, PhoneNumber */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 text-xs">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab" />
                          <span className="font-semibold text-slate-800">Name</span>
                          <span className="text-red-500 font-bold">*</span>
                        </div>
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 text-xs">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab" />
                          <span className="font-semibold text-slate-800">Email</span>
                          <span className="text-red-500 font-bold">*</span>
                        </div>
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 text-xs">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab" />
                          <span className="font-semibold text-slate-800">Password</span>
                          <span className="text-red-500 font-bold">*</span>
                        </div>
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 text-xs">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab" />
                          <span className="font-semibold text-slate-800">PhoneNumber</span>
                        </div>
                      </div>

                      {/* Additional Custom Fields if user added any */}
                      {bulkCustomFields.filter((f) => !["std_name", "std_email", "std_password", "std_phone"].includes(f.id)).length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          {bulkCustomFields
                            .filter((f) => !["std_name", "std_email", "std_password", "std_phone"].includes(f.id))
                            .map((f) => (
                              <div key={f.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 text-xs">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-semibold text-slate-800">{f.name}</span>
                                  {f.required && <span className="text-red-500 font-bold">*</span>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBulkCustomFields((prev) => prev.filter((field) => field.id !== f.id))}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Custom fields addition section */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Custom fields</h5>
                        <p className="text-[11px] text-slate-500">Customize fields / questions to be asked.</p>
                      </div>

                      {/* Unified connected field name + Required checkbox container */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#3b50a6] focus-within:border-[#3b50a6] transition-all">
                        <input
                          type="text"
                          placeholder="Field name"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          className="h-9 px-3 text-xs bg-transparent border-none outline-none flex-1 text-slate-800 placeholder:text-slate-400 font-medium"
                        />
                        <div className="h-5 w-px bg-slate-200 shrink-0" />
                        <label
                          htmlFor="bulk-new-field-required"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100/80 cursor-pointer select-none shrink-0 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id="bulk-new-field-required"
                            checked={newFieldRequired}
                            onChange={(e) => setNewFieldRequired(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-orange-500 focus:ring-0 cursor-pointer accent-orange-500"
                          />
                          <span className="text-[11px] text-slate-600">Required</span>
                        </label>
                      </div>

                      {/* Action buttons below */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={handleAddBulkField}
                          size="sm"
                          className="h-8 px-4 text-[11px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Field
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setNewFieldName("");
                            setNewFieldRequired(false);
                          }}
                          size="sm"
                          className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 rounded-lg gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Clear Field
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Review table if file uploaded */}
                  {bulkStep === "review" && parsedBulkCandidates.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>Parsed Candidates ({parsedBulkCandidates.length})</span>
                        <span className="text-emerald-600 font-medium">Ready to invite</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow>
                              <TableHead className="w-8 text-[11px]">#</TableHead>
                              <TableHead className="text-[11px]">Name</TableHead>
                              <TableHead className="text-[11px]">Email</TableHead>
                              <TableHead className="text-[11px] text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedBulkCandidates.map((c, i) => (
                              <TableRow key={c.email + i} className="text-xs">
                                <TableCell className="font-mono text-slate-400 text-[10px]">{i + 1}</TableCell>
                                <TableCell className="font-medium text-slate-800">{c.name || "Candidate"}</TableCell>
                                <TableCell className="font-mono text-slate-600">{c.email}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50">
                                    Ready
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 border-slate-200 rounded-lg px-4 py-2"
                  >
                    Cancel
                  </Button>
                  {bulkStep === "upload" ? (
                    <Button
                      type="button"
                      onClick={handleProcessBulkFile}
                      disabled={!bulkFile || processingBulkFile}
                      className="text-xs font-semibold bg-orange-400 hover:bg-orange-500 text-white rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {processingBulkFile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to Review
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSendBulkInvitations}
                      disabled={inviting || parsedBulkCandidates.length === 0}
                      className="text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-white rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Sending Invitations...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send Invitations ({parsedBulkCandidates.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ──── RIGHT COLUMN: Actual Email Template Preview (5 cols) ──── */}
          <div className="lg:col-span-5 bg-slate-50/70 p-6 flex flex-col h-full overflow-y-auto">
            {/* Exact Actual Email Template Card (Dark theme: SECURE ASSESSMENT GATEWAY) */}
            <div className="flex-1 bg-[#0b101b] border border-slate-800 text-slate-200 rounded-2xl p-7 shadow-lg flex flex-col space-y-6 font-sans">
              {/* Header: SECURE ASSESSMENT GATEWAY */}
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-sm font-extrabold tracking-wider text-[#10B981] uppercase font-mono">
                  SECURE ASSESSMENT GATEWAY
                </h3>
              </div>

              {/* Salutation and Intro */}
              <div className="space-y-3.5 text-xs leading-relaxed text-slate-300">
                <p className="text-xs font-medium text-slate-200">Hello,</p>
                <p className="text-slate-400 text-xs leading-normal">
                  You have been invited to take an assessment on <span className="text-white font-semibold">Gryphon 360</span>. Click the button below to start your test directly. The link will automatically perform secure identity checks in the background.
                </p>
              </div>

              {/* Action Button: Start Test */}
              <div className="py-2 flex justify-center">
                <div className="px-7 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg shadow-md tracking-wide cursor-default transition-all">
                  Start Test
                </div>
              </div>

              {/* Expiration Note */}
              <p className="text-[11px] text-slate-400 text-center leading-normal">
                The access link is valid for 15 minutes and can only be used to initiate/resume your session.
              </p>

              {/* Fallback Access Code Card */}
              <div className="bg-[#172033] border border-slate-700/60 rounded-xl p-4 space-y-2 mt-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  FALLBACK ACCESS CODE
                </p>
                <p className="text-xl font-mono font-extrabold tracking-widest text-[#10B981]">
                  660822
                </p>
                <div className="flex items-center gap-1 text-slate-500 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
