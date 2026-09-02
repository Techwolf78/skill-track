import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { candidateService } from "@/lib/candidate-service";
import {
  CustomFieldsConfigurator,
  CustomFieldDefinition,
} from "@/components/candidates/CustomFieldsConfigurator";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Users,
  Check,
  X,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface BulkInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  onSuccess: () => void;
}

interface ParsedCandidateRow {
  name: string;
  email: string;
  phoneNumber?: string;
  extraFields?: Record<string, string>;
  status?: "SUCCESS" | "FAILED" | "PENDING";
  errorMessage?: string;
}

interface BulkUploadRow {
  rowNumber: number;
  email: string;
  status: string;
  errorMessage?: string;
}

interface BulkUploadResponseData {
  totalRows?: number;
  successCount?: number;
  failCount?: number;
  rows?: BulkUploadRow[];
}

type ModalStep = "upload" | "review" | "sending" | "complete";

// Circular Progress Component
function CircularProgress({
  progress,
  current,
  total,
  currentEmail,
}: {
  progress: number;
  current: number;
  total: number;
  currentEmail?: string;
}) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-4">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-muted/20"
          />
          {/* Progress Indicator */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold font-mono tracking-tight text-foreground">
            {progress}%
          </span>
          <span className="text-xs font-mono text-muted-foreground mt-0.5">
            {current} / {total}
          </span>
        </div>
      </div>

      {/* Realtime Candidate Status */}
      <div className="text-center space-y-1.5 max-w-sm">
        <p className="text-xs font-medium text-muted-foreground">
          {current < total ? "Sending invitations..." : "All invitations processed"}
        </p>
        {currentEmail && (
          <Badge
            variant="outline"
            className="font-mono text-[11px] max-w-[300px] truncate border-primary/30 bg-primary/5 text-primary py-0.5"
          >
            <Send className="w-3 h-3 mr-1 animate-pulse" />
            {currentEmail}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function BulkInviteModal({
  open,
  onOpenChange,
  scheduleId,
  onSuccess,
}: BulkInviteModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Workflow Step
  const [step, setStep] = useState<ModalStep>("upload");

  // Custom Fields Definition State
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([
    { id: "std_name", name: "Name", required: true, isStandard: true },
    { id: "std_email", name: "Email", required: true, isStandard: true },
    { id: "std_password", name: "Password", required: true, isStandard: true },
    { id: "std_phone", name: "PhoneNumber", required: false, isStandard: true },
    { id: "cf_college", name: "College Name", required: true, isStandard: false },
    { id: "cf_domain", name: "Domain", required: true, isStandard: false },
  ]);

  // File upload & parsing state
  const [file, setFile] = useState<File | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidateRow[]>([]);
  const [importStats, setImportStats] = useState<{ total: number; success: number; failed: number }>({
    total: 0,
    success: 0,
    failed: 0,
  });

  // Invitation sending state
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteProgress, setInviteProgress] = useState(0);
  const [currentInviteIndex, setCurrentInviteIndex] = useState(0);
  const [currentCandidateEmail, setCurrentCandidateEmail] = useState("");
  const [inviteStats, setInviteStats] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  // Reset state when opening/closing
  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep("upload");
      setFile(null);
      setParsedCandidates([]);
      setError(null);
      setInviteProgress(0);
      setCurrentInviteIndex(0);
      setImportStats({ total: 0, success: 0, failed: 0 });
      setInviteStats({ success: 0, failed: 0 });
    }
    onOpenChange(isOpen);
  };

  // Download custom Excel / CSV template
  const downloadTemplate = (format: "xlsx" | "csv" = "xlsx") => {
    const headers = customFieldDefs.map((f) => f.name);
    const sampleRow = customFieldDefs.map((f) => {
      const lower = f.name.toLowerCase();
      if (lower.includes("name") && !lower.includes("college")) return "Jane Doe";
      if (lower.includes("email")) return "jane.doe@example.com";
      if (lower.includes("password")) return "SecurePass@123";
      if (lower.includes("phone")) return "+91 9876543210";
      if (lower.includes("college")) return "Stanford University";
      if (lower.includes("domain")) return "Full Stack Development";
      return `Sample ${f.name}`;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");

    const fileName = `candidate_import_template.${format}`;
    XLSX.writeFile(wb, fileName, { bookType: format });

    toast({
      title: "Template Downloaded",
      description: `Downloaded "${fileName}" with ${customFieldDefs.length} column(s).`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.substring(selected.name.lastIndexOf(".")).toLowerCase();
      if (![".csv", ".xlsx", ".xls"].includes(ext)) {
        setError("Please upload a valid CSV or Excel file (.xlsx, .xls, .csv).");
        setFile(null);
        return;
      }
      if (selected.size > 15 * 1024 * 1024) {
        setError("File size must be under 15MB.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  // Process file upload and prepare candidates
  const handleProcessFile = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    const orgId = user?.organisationData?.id;
    if (!orgId) {
      setError("No organisation found for current user.");
      return;
    }

    setProcessingFile(true);
    setError(null);

    try {
      // 1. Parse client-side preview
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

      const parsed: ParsedCandidateRow[] = rows.map((r): ParsedCandidateRow => {
        const name = String(r["Name"] || r["name"] || r["Full Name"] || r["Candidate Name"] || "");
        const email = String(
          r["Email"] || r["email"] || r["EMAIL"] || r["Email Address"] || r["email address"] || "",
        ).trim();
        const phoneNumber = String(r["PhoneNumber"] || r["Phone"] || r["phonenumber"] || r["phone"] || "");

        const extraFields: Record<string, string> = {};
        Object.entries(r).forEach(([k, v]) => {
          if (
            !["name", "email", "password", "phone", "phonenumber", "organisationid"].includes(
              k.toLowerCase(),
            ) &&
            v
          ) {
            extraFields[k] = String(v);
          }
        });

        return {
          name,
          email,
          phoneNumber,
          extraFields,
          status: "PENDING",
        };
      }).filter((c) => Boolean(c.email));

      if (parsed.length === 0) {
        throw new Error("No valid candidate rows with email addresses found in the file.");
      }

      // 2. Upload file to backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("organisationId", orgId);

      const bulkRes = await apiClient.post<{
        data?: BulkUploadResponseData;
      } & BulkUploadResponseData>("/candidates/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const resData: BulkUploadResponseData = bulkRes.data?.data || bulkRes.data || {};
      const total = resData.totalRows || parsed.length;
      const successCount = resData.successCount ?? total;
      const failCount = resData.failCount ?? 0;

      let readyCount = 0;
      let failedCount = 0;

      if (resData.rows && Array.isArray(resData.rows)) {
        const rowMap = new Map<string, BulkUploadRow>(resData.rows.map((r) => [r.email.toLowerCase(), r]));
        parsed.forEach((p) => {
          const matched = rowMap.get(p.email.toLowerCase());
          if (matched) {
            const isEmailExists =
              matched.errorMessage?.toLowerCase().includes("already exists") ||
              matched.errorMessage?.toLowerCase().includes("already exist");

            if (matched.status === "SUCCESS" || isEmailExists) {
              p.status = "SUCCESS";
              p.errorMessage = isEmailExists ? "Existing candidate (ready to invite)" : undefined;
              readyCount++;
            } else {
              p.status = "FAILED";
              p.errorMessage = matched.errorMessage;
              failedCount++;
            }
          } else {
            p.status = "SUCCESS";
            readyCount++;
          }
        });
      } else {
        parsed.forEach((p) => {
          p.status = "SUCCESS";
        });
        readyCount = parsed.length;
      }

      setParsedCandidates(parsed);
      setImportStats({
        total: parsed.length,
        success: readyCount,
        failed: failedCount,
      });

      // Move to Review Step
      setStep("review");
    } catch (err) {
      console.error("File processing error:", err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj.response?.data?.message || errorObj.message || "Failed to process candidate file.");
    } finally {
      setProcessingFile(false);
    }
  };

  // Step 2: Send Invitations with Circular Progress Bar
  const handleSendInvitations = async () => {
    const candidatesToInvite = parsedCandidates.filter((c) => c.status !== "FAILED");
    if (candidatesToInvite.length === 0) {
      toast({
        title: "No Candidates Available",
        description: "There are no valid candidates in this list to send invitations to.",
        variant: "destructive",
      });
      return;
    }

    setSendingInvites(true);
    setStep("sending");
    setInviteProgress(0);
    setCurrentInviteIndex(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < candidatesToInvite.length; i++) {
      const candidate = candidatesToInvite[i];
      setCurrentInviteIndex(i + 1);
      setCurrentCandidateEmail(candidate.email);

      try {
        await candidateService.createInvitation({
          scheduleId,
          candidateEmail: candidate.email,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to send invitation to ${candidate.email}:`, err);
        failCount++;
      }

      const calculatedProgress = Math.round(((i + 1) / candidatesToInvite.length) * 100);
      setInviteProgress(calculatedProgress);

      // Brief pause for animation pacing
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setInviteStats({
      success: successCount,
      failed: failCount,
    });
    setSendingInvites(false);
    setStep("complete");

    toast({
      title: "Invitations Sent",
      description: `Successfully sent ${successCount} test invitations.`,
    });

    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            {step === "upload" && "Bulk Invite Candidates"}
            {step === "review" && "Review Candidates"}
            {step === "sending" && "Sending Invitations"}
            {step === "complete" && "Invitations Sent"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload a spreadsheet to invite multiple candidates to this assessment."}
            {step === "review" &&
              "Review the candidate list before sending test invitations."}
            {step === "sending" &&
              "Dispatching test links and invitations to candidate emails..."}
            {step === "complete" &&
              "All candidate invitations have been processed successfully."}
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Upload View */}
          {step === "upload" && (
            <>
              {/* Custom Fields Configurator Box */}
              <div className="border rounded-lg p-5 bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Template & Custom Fields</h4>
                    <p className="text-xs text-muted-foreground">Configure columns and download template</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate("xlsx")}
                      className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel (.xlsx)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate("csv")}
                      className="h-8 text-xs gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </Button>
                  </div>
                </div>

                <CustomFieldsConfigurator
                  fields={customFieldDefs}
                  onChange={setCustomFieldDefs}
                  title="Custom fields"
                  description="Customize fields / questions to be asked."
                />
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    Upload Completed File
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Select your completed Excel or CSV file.
                  </p>
                </div>

                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors bg-card">
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                    <p className="text-xs text-foreground font-medium">Click to select file or drag & drop</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Supports .xlsx, .xls, .csv</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    disabled={processingFile}
                  />
                </label>

                {/* Selected File Card */}
                {file && (
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      disabled={processingFile}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {/* STEP 2: Review View */}
          {step === "review" && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-card text-center">
                  <p className="text-xs text-muted-foreground">Total Candidates</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-1">{importStats.total}</p>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Ready to Invite</p>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {importStats.success}
                  </p>
                </div>
              </div>

              {/* Candidate Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-2.5 bg-muted/40 border-b flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Candidates ({parsedCandidates.length})
                  </span>
                  <span className="text-muted-foreground text-[11px]">Ready for assessment</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="w-8 text-[11px]">#</TableHead>
                        <TableHead className="text-[11px]">Candidate</TableHead>
                        <TableHead className="text-[11px]">Email</TableHead>
                        <TableHead className="text-[11px] text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedCandidates.map((cand, idx) => (
                        <TableRow key={cand.email + idx} className="text-xs">
                          <TableCell className="text-muted-foreground font-mono text-[10px]">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{cand.name || "Candidate"}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{cand.email}</TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              {cand.status === "FAILED" ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="text-[10px] gap-1 cursor-help">
                                      <X className="w-3 h-3" />
                                      Invalid
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p className="text-xs">{cand.errorMessage || "Invalid candidate data"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : cand.errorMessage?.includes("Existing") ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 gap-1 font-medium"
                                  title="Candidate already exists in database and is ready to receive an invitation"
                                >
                                  <Check className="w-3 h-3" />
                                  Existing
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 font-medium"
                                >
                                  <Check className="w-3 h-3" />
                                  Ready
                                </Badge>
                              )}
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Circular Progress View */}
          {step === "sending" && (
            <div className="py-4">
              <CircularProgress
                progress={inviteProgress}
                current={currentInviteIndex}
                total={parsedCandidates.filter((c) => c.status !== "FAILED").length}
                currentEmail={currentCandidateEmail}
              />
            </div>
          )}

          {/* STEP 4: Complete View */}
          {step === "complete" && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Invitations Sent Successfully!</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  All candidate invitations have been generated and sent to this test schedule.
                </p>
              </div>

              <div className="flex gap-4 pt-2">
                <div className="px-5 py-2.5 border rounded-lg bg-card text-center">
                  <p className="text-[11px] text-muted-foreground">Invitations Sent</p>
                  <p className="text-xl font-bold font-mono text-emerald-600">{inviteStats.success}</p>
                </div>
                {inviteStats.failed > 0 && (
                  <div className="px-5 py-2.5 border rounded-lg bg-card text-center">
                    <p className="text-[11px] text-muted-foreground">Failed</p>
                    <p className="text-xl font-bold font-mono text-destructive">{inviteStats.failed}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t gap-2 bg-muted/20 flex flex-row items-center justify-between">
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => handleDialogChange(false)} disabled={processingFile}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessFile}
                disabled={!file || processingFile}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {processingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Review
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                className="gap-1 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Change File
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleDialogChange(false);
                    onSuccess();
                  }}
                  className="text-xs"
                >
                  Save for Later
                </Button>
                <Button
                  onClick={handleSendInvitations}
                  disabled={sendingInvites || importStats.success === 0}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Invitations ({importStats.success})
                </Button>
              </div>
            </>
          )}

          {step === "sending" && (
            <div className="w-full text-center text-xs text-muted-foreground italic py-1">
              Please wait while invitations are being dispatched...
            </div>
          )}

          {step === "complete" && (
            <div className="w-full flex justify-end">
              <Button
                onClick={() => {
                  handleDialogChange(false);
                  onSuccess();
                }}
                className="gap-1.5 bg-primary"
              >
                <Check className="w-4 h-4" />
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
