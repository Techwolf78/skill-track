import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { candidateService, CandidateInvitation } from "@/lib/candidate-service";
import { TestScheduleExtended } from "@/lib/test-service";
import {
  Loader2,
  Search,
  RefreshCw,
  Trash2,
  Link2,
  Check,
  Send,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface InvitedCandidatesTableProps {
  scheduleId: string;
  scheduleData?: TestScheduleExtended | null;
  onOpenAddModal: () => void;
  onOpenBulkModal: () => void;
  onInvitationsLoaded?: (invitations: CandidateInvitation[]) => void;
}

const LOCKED_SESSION_STATUSES = new Set([
  "IN_PROGRESS",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "EVALUATED",
]);

export function InvitedCandidatesTable({
  scheduleId,
  scheduleData,
  onOpenAddModal,
  onOpenBulkModal,
  onInvitationsLoaded,
}: InvitedCandidatesTableProps) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "EXPIRED">("ALL");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isBulkRevokeOpen, setIsBulkRevokeOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Action States
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [invitationToRevoke, setInvitationToRevoke] = useState<CandidateInvitation | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!scheduleId) return;
    try {
      setLoading(true);
      const data = await candidateService.getInvitationsBySchedule(scheduleId);
      setInvitations(data);
      if (onInvitationsLoaded) {
        onInvitationsLoaded(data);
      }
    } catch (error) {
      console.error("Failed to load invitations:", error);
      toast({
        title: "Error",
        description: "Failed to load invited candidates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [scheduleId, onInvitationsLoaded, toast]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Reset pagination & selection on search / filter changes
  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [searchTerm, statusFilter, pageSize]);

  // Filtered dataset
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const name = (inv.candidateName || inv.candidate?.user?.name || "").toLowerCase();
      const email = (inv.candidateEmail || inv.candidate?.user?.email || "").toLowerCase();
      const phone = (inv.candidatePhone || inv.candidate?.user?.phoneNumber || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || email.includes(query) || phone.includes(query);
      const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invitations, searchTerm, statusFilter]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: invitations.length,
      pending: invitations.filter((i) => i.status === "PENDING").length,
      accepted: invitations.filter((i) => i.status === "ACCEPTED").length,
      expired: invitations.filter((i) => i.status === "EXPIRED").length,
    };
  }, [invitations]);

  // Paginated dataset
  const totalPages = Math.max(1, Math.ceil(filteredInvitations.length / pageSize));
  const paginatedInvitations = useMemo(() => {
    const start = page * pageSize;
    return filteredInvitations.slice(start, start + pageSize);
  }, [filteredInvitations, page, pageSize]);

  const copyTestLink = (invitation: CandidateInvitation) => {
    const baseUrl = window.location.origin;
    const tokenParam = invitation.token ? `?magicToken=${encodeURIComponent(invitation.token)}` : "";
    const testUrl = `${baseUrl}/test/access/${invitation.id}${tokenParam}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedToken(invitation.id);
    toast({
      title: "Link Copied!",
      description: "Test access link copied to clipboard.",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const isLocked = (inv: CandidateInvitation) => {
    return inv.status === "ACCEPTED" && LOCKED_SESSION_STATUSES.has(inv.sessionStatus ?? "");
  };

  const getLockReason = (inv: CandidateInvitation) => {
    if (inv.sessionStatus === "IN_PROGRESS") return "Test is currently in progress";
    if (inv.sessionStatus === "SUBMITTED") return "Test has been submitted";
    if (inv.sessionStatus === "AUTO_SUBMITTED") return "Test was auto-submitted";
    if (inv.sessionStatus === "EVALUATED") return "Test has been evaluated";
    return "Test has already been started";
  };

  // Selection helpers
  const selectableVisibleInvitations = useMemo(() => {
    return paginatedInvitations.filter((inv) => !isLocked(inv));
  }, [paginatedInvitations]);

  const isAllVisibleSelected =
    selectableVisibleInvitations.length > 0 &&
    selectableVisibleInvitations.every((inv) => selectedIds.includes(inv.id));

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(selectableVisibleInvitations.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = selectableVisibleInvitations.map((i) => i.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResend = async (inv: CandidateInvitation) => {
    if (isLocked(inv)) return;
    try {
      setResendingId(inv.id);
      await candidateService.reissueInvitation(scheduleId, inv.candidateId, inv.id);
      toast({
        title: "Invitation Reissued",
        description: `Fresh access token and invitation generated for ${inv.candidateName || "candidate"}.`,
      });
      await fetchInvitations();
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "Resend Failed",
        description: err.response?.data?.message || err.message || "Failed to reissue invitation.",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleBulkResend = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      const inv = invitations.find((i) => i.id === id);
      if (!inv || isLocked(inv)) continue;
      try {
        await candidateService.reissueInvitation(scheduleId, inv.candidateId, inv.id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    toast({
      title: failCount === 0 ? "Bulk Reissue Complete" : "Partial Success",
      description: `Successfully reissued ${successCount} invitation(s).${failCount > 0 ? ` (${failCount} failed)` : ""}`,
      variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
    });
    setSelectedIds([]);
    await fetchInvitations();
    setBulkActionLoading(false);
  };

  const handleRevokeConfirm = async () => {
    if (!invitationToRevoke) return;
    try {
      setRevokingId(invitationToRevoke.id);
      await candidateService.deleteInvitation(invitationToRevoke.id);
      toast({
        title: "Invitation Revoked",
        description: `Invitation for ${invitationToRevoke.candidateName || "candidate"} has been permanently revoked.`,
      });
      setInvitationToRevoke(null);
      await fetchInvitations();
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "Revocation Failed",
        description: err.response?.data?.message || err.message || "Failed to revoke invitation.",
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleBulkRevokeConfirm = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      const inv = invitations.find((i) => i.id === id);
      if (!inv || isLocked(inv)) continue;
      try {
        await candidateService.deleteInvitation(inv.id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    toast({
      title: failCount === 0 ? "Bulk Revocation Complete" : "Partial Success",
      description: `Successfully revoked ${successCount} invitation(s).${failCount > 0 ? ` (${failCount} failed)` : ""}`,
      variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
    });
    setSelectedIds([]);
    setIsBulkRevokeOpen(false);
    await fetchInvitations();
    setBulkActionLoading(false);
  };

  const renderInvitationStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 gap-1 text-xs">
            <XCircle className="w-3 h-3" />
            Expired
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  const renderSessionStatusBadge = (sessionStatus?: string) => {
    switch (sessionStatus) {
      case "IN_PROGRESS":
        return (
          <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 gap-1 text-xs animate-pulse">
            <PlayCircle className="w-3 h-3" />
            In Progress
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Submitted
          </Badge>
        );
      case "AUTO_SUBMITTED":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Auto-Submitted
          </Badge>
        );
      case "EVALUATED":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 gap-1 text-xs">
            <Award className="w-3 h-3" />
            Evaluated
          </Badge>
        );
      case "NOT_STARTED":
      default:
        return (
          <span className="text-xs text-muted-foreground font-mono">
            Not Started
          </span>
        );
    }
  };

  const isScheduleCompleted =
    scheduleData?.status === "COMPLETED" || scheduleData?.status === "EXPIRED";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Top Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchInvitations}
              disabled={loading}
              title="Refresh invitations"
              className="h-9 w-9 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenBulkModal}
              disabled={isScheduleCompleted}
              className="h-9 gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Bulk Import
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onOpenAddModal}
              disabled={isScheduleCompleted}
              className="h-9 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Candidates
            </Button>
          </div>
        </div>

        {/* Merged Filter Dropdown + Resend / Revoke Toolbar */}
        <div className="flex items-center justify-between pb-2 border-b gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Merged Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter:</span>
              <Select
                value={statusFilter}
                onValueChange={(val: "ALL" | "PENDING" | "ACCEPTED" | "EXPIRED") => {
                  setStatusFilter(val);
                }}
              >
                <SelectTrigger className="h-8 min-w-[170px] text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All ({counts.all})</SelectItem>
                  <SelectItem value="PENDING">Pending ({counts.pending})</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted ({counts.accepted})</SelectItem>
                  <SelectItem value="EXPIRED">Expired ({counts.expired})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Resend & Revoke Actions Toolbar */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkResend}
                disabled={bulkActionLoading || selectedIds.length === 0}
                className="h-8 text-xs text-primary hover:bg-primary/10 border-primary/20 gap-1.5"
                title={selectedIds.length === 0 ? "Select candidates to resend invites" : "Resend invites for selected candidates"}
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Resend {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkRevokeOpen(true)}
                disabled={bulkActionLoading || selectedIds.length === 0}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
                title={selectedIds.length === 0 ? "Select candidates to revoke invites" : "Revoke invites for selected candidates"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
              </Button>

              {selectedIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  Clear Selection
                </Button>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            {filteredInvitations.length} {filteredInvitations.length === 1 ? "candidate" : "candidates"} matching
          </div>
        </div>

        {/* Invited Candidates Table */}
        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                {/* Select All Checkbox */}
                <TableHead className="w-[42px] px-3">
                  <Checkbox
                    checked={isAllVisibleSelected}
                    onCheckedChange={toggleSelectAllVisible}
                    disabled={selectableVisibleInvitations.length === 0}
                    aria-label="Select all visible candidates"
                  />
                </TableHead>
                <TableHead className="w-[50px] text-center text-xs text-muted-foreground font-mono">
                  #
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">Candidate</TableHead>
                <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground">Invitation Status</TableHead>
                <TableHead className="text-xs text-muted-foreground">Assessment Progress</TableHead>
                <TableHead className="text-xs text-muted-foreground">Access Link</TableHead>
                <TableHead className="text-right text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground mt-2">Loading invited candidates...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedInvitations.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {searchTerm || statusFilter !== "ALL"
                      ? "No candidates matching your search/filter criteria."
                      : "No candidates have been invited to this schedule yet."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvitations.map((inv, index) => {
                  const locked = isLocked(inv);
                  const lockReason = getLockReason(inv);
                  const candidateName = inv.candidateName || inv.candidate?.user?.name || "Candidate";
                  const candidateEmail = inv.candidateEmail || inv.candidate?.user?.email || "—";
                  const rowIndex = page * pageSize + index + 1;
                  const isSelected = selectedIds.includes(inv.id);

                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      {/* Checkbox */}
                      <TableCell className="w-[42px] px-3">
                        {locked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Checkbox disabled checked={false} className="opacity-40" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">{lockReason} — cannot modify.</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOne(inv.id)}
                            aria-label={`Select ${candidateName}`}
                          />
                        )}
                      </TableCell>

                      {/* # Index */}
                      <TableCell className="text-center text-muted-foreground text-xs font-mono">
                        {rowIndex}
                      </TableCell>

                      {/* Candidate Name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                            {candidateName
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "C"}
                          </div>
                          <div className="truncate max-w-[180px]">
                            <p className="font-semibold text-sm text-foreground truncate">{candidateName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              ID: {inv.candidateId?.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Candidate Email */}
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        <span className="truncate max-w-[200px] block" title={candidateEmail}>
                          {candidateEmail}
                        </span>
                      </TableCell>

                      {/* Invitation Status */}
                      <TableCell>
                        {renderInvitationStatusBadge(inv.status)}
                      </TableCell>

                      {/* Assessment Progress */}
                      <TableCell>
                        {renderSessionStatusBadge(inv.sessionStatus)}
                      </TableCell>

                      {/* Copy Link Button */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyTestLink(inv)}
                          disabled={inv.status === "EXPIRED"}
                          className="h-8 px-2.5 text-xs text-foreground hover:bg-muted font-normal"
                        >
                          {copiedToken === inv.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3.5 h-3.5 mr-1 text-primary" />
                              <span className="text-xs">Copy Link</span>
                            </>
                          )}
                        </Button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Resend Button */}
                          {locked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    className="h-8 px-2 text-xs opacity-50 cursor-not-allowed"
                                  >
                                    <Send className="w-3.5 h-3.5 mr-1" />
                                    Resend
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{lockReason} — cannot resend.</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResend(inv)}
                              disabled={resendingId === inv.id}
                              className="h-8 px-2 text-xs text-primary hover:bg-primary/10"
                              title="Reissue a fresh invitation link & email"
                            >
                              {resendingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5 mr-1" />
                                  Resend
                                </>
                              )}
                            </Button>
                          )}

                          {/* Revoke Button */}
                          {locked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled
                                    className="h-8 px-2 text-xs opacity-50 text-destructive cursor-not-allowed"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    Revoke
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{lockReason} — cannot revoke.</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setInvitationToRevoke(inv)}
                              disabled={revokingId === inv.id}
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Revoke and cancel invitation"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
          {/* Summary Count & Rows per Page Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Showing{" "}
              <strong className="text-foreground font-mono">
                {filteredInvitations.length === 0 ? 0 : page * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground font-mono">
                {Math.min((page + 1) * pageSize, filteredInvitations.length)}
              </strong>{" "}
              of{" "}
              <strong className="text-foreground font-mono">{filteredInvitations.length}</strong> candidates
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => setPageSize(Number(val))}
              >
                <SelectTrigger className="h-8 w-[72px] text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(0)}
              disabled={page === 0 || loading}
              className="h-8 w-8 p-0"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 w-8 p-0"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="px-2 font-medium text-foreground font-mono">
              Page {filteredInvitations.length === 0 ? 1 : page + 1} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="h-8 w-8 p-0"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, totalPages - 1))}
              disabled={page >= totalPages - 1 || loading}
              className="h-8 w-8 p-0"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Single Revoke Confirmation Dialog */}
        <Dialog open={Boolean(invitationToRevoke)} onOpenChange={(open) => !open && setInvitationToRevoke(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Revoke Candidate Invitation?
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <p>
                  Are you sure you want to revoke the invitation for{" "}
                  <strong className="text-foreground">
                    {invitationToRevoke?.candidateName || invitationToRevoke?.candidateEmail}
                  </strong>
                  ?
                </p>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Their test access link will be permanently deactivated, and they will be removed from this schedule.
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setInvitationToRevoke(null)}
                disabled={Boolean(revokingId)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevokeConfirm}
                disabled={Boolean(revokingId)}
              >
                {revokingId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Confirm Revocation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Revoke Confirmation Dialog */}
        <Dialog open={isBulkRevokeOpen} onOpenChange={setIsBulkRevokeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Revoke {selectedIds.length} Invitation(s)?
              </DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <p>
                  Are you sure you want to permanently revoke the invitations for{" "}
                  <strong className="text-foreground">{selectedIds.length} selected candidate(s)</strong>?
                </p>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Their test access links will be permanently deactivated, and they will be removed from this schedule. Candidates who have already started or submitted their tests will be skipped.
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsBulkRevokeOpen(false)}
                disabled={bulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkRevokeConfirm}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Confirm Bulk Revocation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
