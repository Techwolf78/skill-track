import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { organisationPinService } from "@/lib/organisation-pin-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import * as XLSX from "xlsx";
import {
  Loader2,
  Send,
  UserPlus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowRight,
  Coins,
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
  const queryClient = useQueryClient();
  const orgId = user?.organisationData?.id;

  const { data: pinSummary, isLoading: isPinLoading } = useQuery({
    queryKey: ["admin-nav-pin-summary", orgId],
    queryFn: () => organisationPinService.getPinSummary(orgId!),
    enabled: !!orgId && open,
    staleTime: 10_000,
  });
  const pinBalance = pinSummary?.pinBalance ?? 0;

  const invalidatePinQueries = () => {
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: ["admin-nav-pin-summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-admin-pins-summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin-nav-pin-fy", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-admin-pins-fy-summary", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-admin-pins-tx", orgId] });
    }
  };

  const [activeTab, setActiveTab] = useState<"create" | "bulk">("create");

  // Tab 1: Create / Add Candidate Form state
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
  });
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [creating, setCreating] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [existingCandidate, setExistingCandidate] = useState<Candidate | null>(null);

  // Tab 2: Bulk Import state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [processingBulkFile, setProcessingBulkFile] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [parsedBulkCandidates, setParsedBulkCandidates] = useState<
    Array<{ name: string; email: string; phoneNumber?: string; status?: "SUCCESS" | "FAILED"; errorMessage?: string }>
  >([]);
  const [bulkStep, setBulkStep] = useState<"upload" | "review">("upload");
  const [inviting, setInviting] = useState(false);

  // Reset errors and form state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setActiveTab("create");
      setCreateForm({ name: "", email: "" });
      setCustomFields([]);
      setExistingCandidate(null);
      setCheckingEmail(false);
      setBulkFile(null);
      setBulkError(null);
      setParsedBulkCandidates([]);
      setBulkStep("upload");
    }
  }, [open]);

  // Debounced auto-lookup for existing candidate when user types/pastes email
  useEffect(() => {
    const trimmedEmail = createForm.email.trim().toLowerCase();
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setExistingCandidate(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setCheckingEmail(true);
        const res = await candidateService.getCandidatesPage(0, 5, trimmedEmail, orgId);
        if (!isMounted) return;

        const match = res.content.find(
          (c) =>
            c.user?.email?.toLowerCase() === trimmedEmail ||
            c.email?.toLowerCase() === trimmedEmail
        );

        if (match) {
          setExistingCandidate(match);
          // Auto-fill name if not already manually typed
          setCreateForm((prev) => ({
            ...prev,
            name: prev.name.trim() ? prev.name : match.user?.name || match.name || "",
          }));
        } else {
          setExistingCandidate(null);
        }
      } catch (err) {
        console.warn("Background email lookup error:", err);
      } finally {
        if (isMounted) setCheckingEmail(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [createForm.email, orgId]);

  // Generate random strong password for new candidate creation
  const generateSecurePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const specials = "!@#$%";
    const all = upper + lower + digits + specials;
    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += specials[Math.floor(Math.random() * specials.length)];
    for (let i = 4; i < 12; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    return pwd.split("").sort(() => 0.5 - Math.random()).join("");
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

  // Handle Create/Add Candidate + Invite (Merged Logic)
  const handleCreateAndInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = createForm.name.trim();
    const trimmedEmail = createForm.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in Name and Email Address.",
        variant: "destructive",
      });
      return;
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Check if candidate is already invited to this schedule
    if (existingCandidate && alreadyInvitedIds.has(existingCandidate.id)) {
      toast({
        title: "Already Invited",
        description: "This candidate has already been invited to this test schedule.",
        variant: "destructive",
      });
      return;
    }

    if (pinBalance < 1) {
      toast({
        title: "Insufficient PIN Balance",
        description: `You need 1 PIN to invite this candidate, but only ${pinBalance} PINs are available. Please top up your balance.`,
        variant: "destructive",
      });
      return;
    }

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

      let candidateId: string | undefined = existingCandidate?.id;
      let isExisting = Boolean(existingCandidate);

      // 1. If candidate is not already known, attempt to create in DB
      if (!candidateId) {
        try {
          const autoPassword = generateSecurePassword();
          candidateId = await candidateService.createCandidate({
            name: trimmedName,
            email: trimmedEmail,
            password: autoPassword,
            organisationId: orgId,
            extraFields: Object.keys(extraFieldsMap).length > 0 ? extraFieldsMap : undefined,
          });
        } catch (createErr) {
          const cErr = createErr as { response?: { data?: { message?: string } }; message?: string };
          const cErrMsg = cErr.response?.data?.message || cErr.message || "";
          if (/email.*already.*exists/i.test(cErrMsg) || /conflict/i.test(cErrMsg)) {
            console.log("Candidate email already exists in DB, proceeding to send invitation:", trimmedEmail);
            isExisting = true;
          } else {
            throw createErr;
          }
        }
      }

      // 2. Send test invitation (Backend requires exactly one of candidateId or candidateEmail)
      await candidateService.createInvitation(
        candidateId
          ? { scheduleId, candidateId }
          : { scheduleId, candidateEmail: trimmedEmail }
      );

      invalidatePinQueries();

      toast({
        title: isExisting ? "Existing Candidate Added & Invited" : "Candidate Created & Invited",
        description: isExisting
          ? `${trimmedName || trimmedEmail} was found in the system and successfully added to the test.`
          : `Successfully added ${trimmedName} and issued test invitation.`,
      });

      setCreateForm({ name: "", email: "" });
      setCustomFields([]);
      setExistingCandidate(null);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Create and invite error:", error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      const errData = (error as { response?: { data?: { errorCode?: string; message?: string } } })?.response?.data;
      const errorCode = errData?.errorCode;
      const errMsg = errData?.message || (error as Error)?.message || "An error occurred.";

      if (
        (status === 400 && (errorCode === "INSUFFICIENT_PINS" || /insufficient.*pin/i.test(errMsg) || /available.*pin/i.test(errMsg))) ||
        status === 402 ||
        errorCode === "INSUFFICIENT_PINS"
      ) {
        toast({
          title: "Insufficient PIN Balance",
          description: `You need 1 PIN to invite this candidate, but only ${pinBalance} PINs are available. Please top up your balance.`,
          variant: "destructive",
        });
      } else if (/already.*invited/i.test(errMsg) || /invitation.*already.*exists/i.test(errMsg)) {
        toast({
          title: "Already Invited",
          description: "This candidate has already been invited to this test schedule.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Add Candidate",
          description: errMsg,
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  // Bulk Template Download (Name and Email headers)
  const downloadBulkTemplate = (format: "xlsx" | "csv" = "xlsx") => {
    const headers = ["Name", "Email"];
    const sampleRow = ["Jane Doe", "jane.doe@example.com"];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");

    const fileName = `candidate_import_template.${format}`;
    XLSX.writeFile(wb, fileName, { bookType: format });

    toast({
      title: "Template Downloaded",
      description: `Downloaded "${fileName}" template.`,
    });
  };

  const handleRemoveBulkFile = () => {
    setBulkFile(null);
    setBulkError(null);
    setParsedBulkCandidates([]);
    setBulkStep("upload");
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.substring(selected.name.lastIndexOf(".")).toLowerCase();
      if (![".csv", ".xlsx", ".xls"].includes(ext)) {
        setBulkError("Please upload a valid CSV or Excel file (.xlsx, .xls, .csv).");
        handleRemoveBulkFile();
        return;
      }
      setBulkFile(selected);
      setBulkError(null);
      setParsedBulkCandidates([]);
      setBulkStep("upload");
    }
  };

  const handleProcessBulkFile = async () => {
    if (!bulkFile) return;
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

      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validCandidates: Array<{ name: string; email: string; phoneNumber?: string; status: "SUCCESS" | "FAILED"; errorMessage?: string }> = [];
      let localOmittedCount = 0;

      for (const r of rows) {
        const entries = Object.entries(r);
        let name = "";
        let rawEmail = "";
        let phoneNumber = "";

        // 1. Check normalized column headers
        for (const [key, val] of entries) {
          const normKey = key.trim().toLowerCase().replace(/[\s_\-\.]+/g, "");
          const strVal = String(val ?? "").trim();
          if (!strVal) continue;

          if (
            !rawEmail &&
            (normKey === "email" ||
              normKey === "emailid" ||
              normKey === "emailaddress" ||
              normKey === "candidateemail" ||
              normKey === "studentemail" ||
              normKey === "mail" ||
              normKey === "useremail")
          ) {
            rawEmail = strVal;
          } else if (
            !name &&
            (normKey === "name" ||
              normKey === "fullname" ||
              normKey === "candidatename" ||
              normKey === "studentname" ||
              normKey === "firstname" ||
              normKey === "nameofstudent" ||
              normKey === "nameofcandidate" ||
              normKey === "username")
          ) {
            name = strVal;
          } else if (
            !phoneNumber &&
            (normKey === "phone" ||
              normKey === "phonenumber" ||
              normKey === "mobile" ||
              normKey === "mobilenumber" ||
              normKey === "mobileno" ||
              normKey === "contact" ||
              normKey === "contactnumber" ||
              normKey === "contactno")
          ) {
            phoneNumber = strVal;
          }
        }

        // 2. Fallback email value auto-detection
        if (!rawEmail) {
          for (const [, val] of entries) {
            const strVal = String(val ?? "").trim();
            if (strVal.includes("@") && strVal.includes(".")) {
              const cleaned = strVal.replace(/\s+/g, "");
              if (EMAIL_REGEX.test(cleaned)) {
                rawEmail = cleaned;
                break;
              }
            }
          }
        }

        const email = rawEmail ? rawEmail.replace(/\s+/g, "") : "";

        // 3. Fallback name
        if (!name && email) {
          for (const [, val] of entries) {
            const strVal = String(val ?? "").trim();
            if (strVal && !strVal.includes("@") && strVal !== phoneNumber && isNaN(Number(strVal))) {
              name = strVal;
              break;
            }
          }
          if (!name) {
            name = email.split("@")[0];
          }
        }

        // Skip completely blank rows
        if (!name && !email) {
          continue;
        }

        // Omit rows with invalid email
        if (!email || !EMAIL_REGEX.test(email)) {
          localOmittedCount++;
          continue;
        }

        validCandidates.push({
          name: name || email.split("@")[0],
          email,
          phoneNumber: phoneNumber || undefined,
          status: "SUCCESS" as const,
        });
      }

      if (validCandidates.length === 0) {
        throw new Error("No valid candidate rows found. Please ensure at least Name and a valid Email address are provided.");
      }

      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("organisationId", orgId);

      const uploadRes = await apiClient.post("/candidates/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const responseData = uploadRes.data?.data || uploadRes.data;
      const backendFailCount = responseData?.failCount || 0;
      const totalOmitted = Math.max(localOmittedCount, backendFailCount);

      if (totalOmitted > 0) {
        toast({
          title: "Import Completed with Omissions",
          description: `Loaded ${validCandidates.length} valid candidate(s). ${totalOmitted} invalid row(s) were omitted.`,
        });
      }

      setParsedBulkCandidates(validCandidates);
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
    if (parsedBulkCandidates.length > pinBalance) {
      toast({
        title: "Insufficient PIN Balance",
        description: `You need ${parsedBulkCandidates.length} PINs to invite these candidates, but only ${pinBalance} PINs are available. Please top up your balance.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setInviting(true);
      let successCount = 0;
      let failCount = 0;
      let insufficientPins = false;
      let lastErrMsg = "";

      for (const cand of parsedBulkCandidates) {
        try {
          await candidateService.createInvitation({
            scheduleId,
            candidateEmail: cand.email,
          });
          successCount++;
        } catch (err) {
          failCount++;
          const status = (err as { response?: { status?: number } })?.response?.status;
          const errData = (err as { response?: { data?: { errorCode?: string; message?: string } } })?.response?.data;
          const errorCode = errData?.errorCode;
          const msg = errData?.message || (err as Error)?.message || "";

          if (
            (status === 400 && (errorCode === "INSUFFICIENT_PINS" || /insufficient.*pin/i.test(msg) || /available.*pin/i.test(msg))) ||
            status === 402 ||
            errorCode === "INSUFFICIENT_PINS"
          ) {
            insufficientPins = true;
            lastErrMsg = `Insufficient PIN balance: You need ${parsedBulkCandidates.length} PINs to invite these candidates, but only ${pinBalance} PINs are available. Please top up your balance.`;
            break;
          } else {
            if (!lastErrMsg) lastErrMsg = msg;
            console.error("Bulk invite failure for:", cand.email, err);
          }
        }
      }

      if (successCount > 0) {
        invalidatePinQueries();
      }

      if (insufficientPins) {
        toast({
          title: "Insufficient Organisation PINs",
          description: lastErrMsg,
          variant: "destructive",
        });
        if (successCount > 0) {
          onSuccess();
        }
      } else if (failCount > 0 && successCount === 0) {
        toast({
          title: "Bulk Invite Failed",
          description: lastErrMsg || "Failed to send bulk invitations.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bulk Invitations Dispatched",
          description: `Successfully sent ${successCount} invitation${successCount === 1 ? "" : "s"}.${failCount > 0 ? ` (${failCount} failed)` : ""}`,
        });
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      toast({ title: "Invite Error", description: "Failed to send bulk invitations.", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const isCandidateAlreadyInvited = Boolean(
    existingCandidate && alreadyInvitedIds.has(existingCandidate.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideDefaultClose
        className="w-[85vw] max-w-[1360px] h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl text-slate-900 font-sans"
      >
        {/* Top Header Banner matching New-Admin theme */}
        <div className="bg-[#0f172a] text-white px-6 py-3.5 flex items-center justify-between shrink-0 select-none shadow-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span className="text-slate-300">Invite candidates for</span>
              <span className="font-bold text-white underline decoration-indigo-400 underline-offset-2">
                {testTitle}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {orgId && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-colors",
                  pinBalance > 0
                    ? "bg-slate-800/90 text-slate-100 border-slate-700"
                    : "bg-red-500/20 text-red-300 border-red-500/40"
                )}
                title="Available PIN balance for this organisation"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Available PINs:</span>
                <span className={cn("font-bold", pinBalance === 0 && "text-red-400")}>
                  {isPinLoading ? "..." : pinBalance.toLocaleString()}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content: Split Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* ──── LEFT COLUMN: Candidate Creation / Bulk Import (7 cols) ──── */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
            {/* Top Navigation Tabs (2 Tabs: Create New & Bulk Import) */}
            <div className="p-4 pb-2 border-b border-slate-100 shrink-0">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-medium gap-1">
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
                  <UserPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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

            {/* TAB 1: Create New / Add Candidate */}
            {activeTab === "create" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 pt-4">
                <form onSubmit={handleCreateAndInvite} className="flex-1 flex flex-col space-y-4">
                  {/* Informational text */}
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter candidate details below. If the candidate already exists in the system, they will be automatically linked to this test without duplication.
                  </p>

                  {/* Insufficient PIN balance warning in Tab 1 */}
                  {pinBalance < 1 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs shrink-0">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>
                        <strong>Insufficient PIN balance:</strong> Your organisation has 0 available PINs. 1 PIN is reserved per candidate invitation. Please top up your balance.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="h-5 flex items-center">
                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                      </div>
                      <Input
                        id="name"
                        placeholder="e.g. Jane Doe"
                        value={createForm.name}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                        required
                        className="h-10 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-5 flex items-center justify-between">
                        <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        {checkingEmail && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Checking...
                          </span>
                        )}
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="e.g. jane.doe@example.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                        required
                        className="h-10 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {/* Existing candidate detection pill */}
                      {existingCandidate && (
                        <div className="pt-1">
                          {isCandidateAlreadyInvited ? (
                            <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1 py-0.5 px-2">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Already invited to this test schedule
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1 py-0.5 px-2">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Existing Candidate Detected (will be added directly)
                            </Badge>
                          )}
                        </div>
                      )}
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
                              className="h-8 text-xs flex-1 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <Input
                              placeholder="Value (e.g. MIT)"
                              value={field.value}
                              onChange={(e) => updateCustomField(idx, "value", e.target.value)}
                              className="h-8 text-xs flex-1 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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

                  {/* Action Footer for Tab 1 */}
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
                      disabled={creating || isCandidateAlreadyInvited || pinBalance < 1}
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {existingCandidate ? "Add & Invite Candidate" : "Create & Invite Candidate"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: Bulk Import */}
            {activeTab === "bulk" && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Top Card: Template Download & File Upload */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Download Template</h4>
                        <p className="text-[11px] text-slate-500">Get a pre-formatted candidate spreadsheet</p>
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
                        Select your completed Excel or CSV file. <span className="font-semibold text-slate-700">Name</span> and <span className="font-semibold text-slate-700">Email</span> are required. Any additional columns in your spreadsheet will automatically be imported as custom attributes.
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
                            onClick={handleRemoveBulkFile}
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
                  </div>

                  {/* Review table if file uploaded */}
                  {bulkStep === "review" && parsedBulkCandidates.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>Parsed Candidates ({parsedBulkCandidates.length})</span>
                        <span className="text-emerald-600 font-medium">Ready to invite</span>
                      </div>

                      {/* Insufficient PIN balance alert in review */}
                      {parsedBulkCandidates.length > pinBalance && (
                        <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                          <span>
                            <strong>Insufficient PIN balance:</strong> You need {parsedBulkCandidates.length} PINs to invite these candidates, but only {pinBalance} PINs are available. Please top up your balance.
                          </span>
                        </div>
                      )}

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
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                      disabled={inviting || parsedBulkCandidates.length === 0 || parsedBulkCandidates.length > pinBalance}
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            {/* Exact Actual Email Template Card (White & Indigo Theme: Assessment Invitation) */}
            <div className="flex-1 bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden font-sans">
              {/* Header: Assessment Invitation Banner */}
              <div className="bg-[#0f172a] px-6 py-4 border-b border-slate-800">
                <h3 className="text-xs font-bold tracking-wider text-white uppercase font-sans flex items-center justify-between">
                  <span>Assessment Invitation</span>
                  <span className="text-[10px] text-indigo-400 font-mono font-normal">Preview</span>
                </h3>
              </div>

              {/* Email Card Body */}
              <div className="p-6 flex-1 flex flex-col space-y-5">
                {/* Salutation and Intro */}
                <div className="space-y-2.5 text-xs leading-relaxed text-slate-600">
                  <p className="text-xs font-semibold text-slate-800">Hello,</p>
                  <p className="text-slate-600 text-xs leading-normal">
                    You have been invited to complete a proctored assessment on <span className="text-slate-900 font-semibold">{organisationName || user?.organisationData?.name || "Gryphon 360"}</span>. Click the button below to start or resume your assessment session securely.
                  </p>
                </div>

                {/* Action Button: Start Assessment */}
                <div className="py-2 flex justify-center">
                  <div className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-md shadow-xs tracking-wide cursor-default transition-all">
                    Start Assessment
                  </div>
                </div>

                {/* Fallback Access Code Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5 mt-auto text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Fallback Access Code
                  </p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-indigo-600">
                    660822
                  </p>
                  <p className="text-[11px] text-slate-400 pt-0.5">
                    If the button does not work, enter this 6-digit access code manually on the assessment portal.
                  </p>
                </div>
              </div>

              {/* Email Footer */}
              <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-3 text-center">
                <p className="text-[11px] text-slate-400">
                  This is an automated system email. Please do not reply directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
