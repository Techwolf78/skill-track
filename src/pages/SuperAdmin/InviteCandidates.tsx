import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Send, Loader2, Calendar, Clock, CheckCircle2, XCircle,
  ClockIcon, Link2, Check, Trash2, Users, ChevronRight, ShieldAlert,
  Inbox, Mail, AlertCircle, X, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, TestSchedule } from "@/lib/test-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { useNavigate } from "react-router-dom";

interface CandidateInvitation {
  id: string;
  scheduleId: string;
  candidateId: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  sentAt: string;
}

type FilterTab = "available" | "invited" | "all";

function getInitials(name: string) {
  return (name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_PALETTE = [
  "bg-violet-500/15 text-violet-600",
  "bg-blue-500/15 text-blue-600",
  "bg-emerald-500/15 text-emerald-600",
  "bg-amber-500/15 text-amber-600",
  "bg-rose-500/15 text-rose-600",
  "bg-cyan-500/15 text-cyan-600",
  "bg-fuchsia-500/15 text-fuchsia-600",
  "bg-orange-500/15 text-orange-600",
];
function avatarColour(name: string) {
  return AVATAR_PALETTE[(name || "U").charCodeAt(0) % AVATAR_PALETTE.length];
}

function InviteStatusBadge({ status }: { status: string }) {
  if (status === "ACCEPTED")
    return (
      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 gap-1 px-2 py-0.5">
        <CheckCircle2 className="w-3 h-3" /> Accepted
      </Badge>
    );
  if (status === "EXPIRED")
    return (
      <Badge className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/25 gap-1 px-2 py-0.5">
        <XCircle className="w-3 h-3" /> Expired
      </Badge>
    );
  return (
    <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/25 gap-1 px-2 py-0.5">
      <ClockIcon className="w-3 h-3" /> Pending
    </Badge>
  );
}

export default function InviteCandidates() {
  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("available");
  const { toast } = useToast();
  const navigate = useNavigate();
  const baseUrl = window.location.origin;

  const handleResendEmail = async (invitationId: string, candidateName: string) => {
    setResendingId(invitationId);
    try {
      await apiClient.post(`/candidate-invitations/${invitationId}/access/request`);
      toast({
        title: "Access email sent",
        description: `A new magic access link has been sent to ${candidateName}.`,
      });
      fetchData();
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } }; message?: string })
          .response?.data?.message ||
        (error as { message?: string }).message ||
        "Failed to resend access email";
      toast({
        title: "Resend failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedulesData, candidatesData] = await Promise.all([
        testService.getAllTestSchedules(),
        candidateService.getCandidates(),
      ]);
      const schedulesWithTests = await Promise.all(
        schedulesData.map(async (schedule) => {
          try {
            const test = await testService.getTestById(schedule.testId);
            return { ...schedule, test };
          } catch {
            return schedule;
          }
        }),
      );
      setSchedules(schedulesWithTests);
      setCandidates(candidatesData);
      try {
        const response = await apiClient.get("/candidate-invitations?size=1000");
        const invData = response.data?.data;
        if (Array.isArray(invData)) {
          setInvitations(invData);
        } else if (
          invData &&
          typeof invData === "object" &&
          "content" in invData &&
          Array.isArray((invData as Record<string, unknown>).content)
        ) {
          setInvitations((invData as Record<string, unknown>).content as CandidateInvitation[]);
        } else {
          setInvitations([]);
        }
      } catch { /* no invitations yet */ }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async () => {
    if (!selectedSchedule) {
      toast({ title: "Select a schedule", description: "Choose a test schedule before sending an invite.", variant: "destructive" });
      return;
    }
    if (!selectedCandidate) return;
    setSubmitting(true);
    try {
      await apiClient.post("/candidate-invitations", {
        scheduleId: selectedSchedule,
        candidateId: selectedCandidate.id,
        baseUrl: window.location.origin,
      });
      toast({ title: "Invitation sent", description: `${selectedCandidate.user.name} has been invited.` });
      setIsInviteDialogOpen(false);
      setSelectedCandidate(null);
      fetchData();
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        (error as { message?: string }).message ||
        "Failed to send invitation";
      toast({ title: "Couldn't send invite", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!selectedSchedule) {
      toast({ title: "Select a schedule", description: "Choose a test schedule first.", variant: "destructive" });
      return;
    }
    if (selectedCandidates.length === 0) return;
    setSubmitting(true);
    let successCount = 0, failCount = 0;
    for (const candidateId of selectedCandidates) {
      try {
        await apiClient.post("/candidate-invitations", { scheduleId: selectedSchedule, candidateId, baseUrl: window.location.origin });
        successCount++;
      } catch { failCount++; }
    }
    toast({
      title: failCount === 0 ? "Bulk invite complete" : "Partial success",
      description: `${successCount} invited.${failCount > 0 ? ` ${failCount} failed.` : ""}`,
      variant: failCount > 0 && successCount === 0 ? "destructive" : "default",
    });
    setSelectedCandidates([]);
    fetchData();
    setSubmitting(false);
  };

  const copyTestLink = (id: string, token?: string) => {
    const url = `${baseUrl}/test/access/${id}${token ? `?magicToken=${encodeURIComponent(token)}` : ""}`;
    console.log("[InviteCandidates] Copying link:", url, "| token:", token);

    const doFallbackCopy = () => {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedToken(id);
        toast({ title: token ? "Magic link copied!" : "Link copied", description: url });
        setTimeout(() => setCopiedToken(null), 2000);
      }).catch(() => {
        doFallbackCopy();
        setCopiedToken(id);
        toast({ title: token ? "Magic link copied!" : "Link copied", description: url });
        setTimeout(() => setCopiedToken(null), 2000);
      });
    } else {
      doFallbackCopy();
      setCopiedToken(id);
      toast({ title: token ? "Magic link copied!" : "Link copied", description: url });
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const getInvitationForCandidate = (candidateId: string, scheduleId: string) =>
    invitations.find((i) => i.candidateId === candidateId && i.scheduleId === scheduleId) || null;

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };

  const selectedScheduleData = schedules.find((s) => s.id === selectedSchedule);
  const isScheduleCompleted =
    selectedScheduleData?.status === "COMPLETED" || selectedScheduleData?.status === "EXPIRED";

  const candidatesMatchingSearch = useMemo(
    () => candidates.filter((c) =>
      c.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
    [candidates, searchTerm],
  );

  const getInv = (cId: string) => selectedSchedule ? getInvitationForCandidate(cId, selectedSchedule) : null;

  const availableCount = useMemo(() => candidatesMatchingSearch.filter((c) => !getInv(c.id)).length, [candidatesMatchingSearch, selectedSchedule, invitations]); // eslint-disable-line react-hooks/exhaustive-deps
  const invitedCount = useMemo(() => candidatesMatchingSearch.filter((c) => !!selectedSchedule && !!getInv(c.id)).length, [candidatesMatchingSearch, selectedSchedule, invitations]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCandidates = useMemo(() => candidatesMatchingSearch.filter((c) => {
    if (!selectedSchedule) return true;
    const inv = getInv(c.id);
    if (activeTab === "available") return !inv;
    if (activeTab === "invited") return !!inv;
    return true;
  }), [candidatesMatchingSearch, selectedSchedule, activeTab, invitations]); // eslint-disable-line react-hooks/exhaustive-deps

  const allVisibleSelected = filteredCandidates.length > 0 && filteredCandidates.every((c) => selectedCandidates.includes(c.id));
  const toggleSelectAll = (checked: boolean) => {
    const ids = filteredCandidates.map((c) => c.id);
    if (checked) setSelectedCandidates((prev) => Array.from(new Set([...prev, ...ids])));
    else { const s = new Set(ids); setSelectedCandidates((prev) => prev.filter((id) => !s.has(id))); }
  };

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "available", label: "Available", count: availableCount },
    { key: "invited", label: "Invited", count: invitedCount },
    { key: "all", label: "All", count: candidatesMatchingSearch.length },
  ];

  return (
    <div className="flex flex-col gap-0 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Invite Candidates
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a schedule, then invite candidates individually or in bulk.
            </p>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate(`../invitations-history${selectedSchedule ? `?scheduleId=${selectedSchedule}` : ""}`)}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 border border-border/60 hover:border-border"
          >
            <Clock className="w-3.5 h-3.5" />
            Invitation History
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Button>
        </div>

        {/* Schedule Selector */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 max-w-sm">
            <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
              <SelectTrigger className="h-9 bg-background border-border text-sm">
                <SelectValue placeholder="Choose a test schedule…" />
              </SelectTrigger>
              <SelectContent className="text-sm">
                {schedules.length === 0
                  ? <div className="p-3 text-xs text-muted-foreground text-center">No schedules found</div>
                  : schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.test?.title || "Untitled Test"} <span className="opacity-50">({s.status})</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {selectedScheduleData && (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 " +
                (selectedScheduleData.status === "LIVE"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                  : selectedScheduleData.status === "SCHEDULED"
                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                    : "bg-muted text-muted-foreground border border-border")
              }>
                {selectedScheduleData.status === "LIVE" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
                )}
                {selectedScheduleData.status}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDateTime(selectedScheduleData.startTime)}
                <span className="opacity-40 mx-0.5">→</span>
                {formatDateTime(selectedScheduleData.endTime)}
              </span>
              {isScheduleCompleted && (
                <span className="inline-flex items-center gap-1 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-0.5">
                  <ShieldAlert className="w-3 h-3" />
                  Invites disabled — schedule ended
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter + Search ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-4">
        <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-md p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedCandidates([]); }}
              className={
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all " +
                (activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {tab.label}
              <span className={
                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-mono font-bold " +
                (activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
              }>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm bg-background border-border"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="border border-border rounded-lg overflow-hidden mt-3 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              {activeTab === "available" && (
                <TableHead className="w-10 px-3">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                </TableHead>
              )}
              <TableHead className="w-8 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2">#</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Candidate</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden md:table-cell">Contact</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Account</TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Invitation</TableHead>
              {activeTab === "invited" && (
                <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Link</TableHead>
              )}
              <TableHead className="text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wider pr-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent border-b border-border/40">
                  {activeTab === "available" && <TableCell className="w-10 px-3"><div className="w-4 h-4 bg-muted animate-pulse rounded" /></TableCell>}
                  <TableCell className="w-8 px-2"><div className="w-5 h-3 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-28 h-3 bg-muted animate-pulse rounded" />
                        <div className="w-20 h-2 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><div className="w-36 h-3 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><div className="w-10 h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><div className="w-14 h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="text-right pr-4"><div className="w-14 h-6 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredCandidates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="w-8 h-8 opacity-25" />
                    <p className="text-sm font-medium">
                      {activeTab === "available" ? "All candidates have been invited"
                        : activeTab === "invited" ? "No candidates invited yet"
                          : searchTerm ? `No candidates match "${searchTerm}"` : "No candidates found"}
                    </p>
                    {!selectedSchedule && <p className="text-xs">Select a schedule above first.</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCandidates.map((candidate, index) => {
                const invitation = getInv(candidate.id);
                const displayStatus =
                  invitation?.status === "PENDING" && isScheduleCompleted ? "EXPIRED" : invitation?.status;
                const isSelected = selectedCandidates.includes(candidate.id);

                return (
                  <TableRow
                    key={candidate.id}
                    className={
                      "border-b border-border/40 transition-colors " +
                      (isSelected ? "bg-primary/[0.04] hover:bg-primary/[0.06]" : "hover:bg-muted/30")
                    }
                  >
                    {activeTab === "available" && (
                      <TableCell className="w-10 px-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            setSelectedCandidates((prev) =>
                              checked ? [...prev, candidate.id] : prev.filter((id) => id !== candidate.id),
                            )
                          }
                          aria-label={`Select ${candidate.user.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-center text-xs font-mono text-muted-foreground/60 px-2 tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${avatarColour(candidate.user.name)}`}>
                          {getInitials(candidate.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground leading-tight truncate">{candidate.user.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground/60">ID: {candidate.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2.5">
                      <p className="text-xs text-foreground/80 truncate max-w-[200px]">{candidate.user.email}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{candidate.user.phoneNumber || "No phone"}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2.5">
                      <Badge variant="outline" className={`font-mono text-[9px] uppercase border px-1.5 py-0 ${candidate.stale ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600"}`}>
                        {candidate.stale ? "Inactive" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2.5">
                      {invitation
                        ? <InviteStatusBadge status={displayStatus || ""} />
                        : <span className="text-[11px] text-muted-foreground/60">Not Invited</span>
                      }
                    </TableCell>
                    {activeTab === "invited" && (
                      <TableCell className="hidden lg:table-cell py-2.5">
                        {invitation ? (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => copyTestLink(invitation.id, invitation.token)}
                            disabled={displayStatus === "EXPIRED"}
                            className="h-7 px-2 text-[11px] border border-border/60 font-mono gap-1.5 text-muted-foreground hover:text-foreground hover:border-border"
                          >
                            {copiedToken === invitation.id
                              ? <><Check className="w-3 h-3 text-emerald-500" />Copied</>
                              : <><Link2 className="w-3 h-3" />Copy</>}
                          </Button>
                        ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-4 py-2.5">
                      {invitation ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 px-2 py-0.5">Sent</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Resend magic link email"
                            disabled={resendingId === invitation.id || displayStatus === "EXPIRED"}
                            className="h-7 px-2 text-[11px] font-mono gap-1 border-border/80 text-muted-foreground hover:text-foreground"
                            onClick={() => handleResendEmail(invitation.id, candidate.user.name)}
                          >
                            {resendingId === invitation.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3 text-primary" />
                            )}
                            Resend
                          </Button>
                          <Button
                            variant="ghost" size="icon" title="Revoke invitation"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Revoke invitation for ${candidate.user.name}?`)) {
                                try {
                                  await apiClient.delete(`/candidate-invitations/${invitation.id}`);
                                  toast({ title: "Invitation revoked", description: `${candidate.user.name}'s invite removed.` });
                                  fetchData();
                                } catch (err) {
                                  const e2 = err as { response?: { data?: { message?: string } }; message?: string };
                                  toast({ title: "Couldn't revoke", description: e2.response?.data?.message || e2.message || "Failed", variant: "destructive" });
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!selectedSchedule) {
                              toast({ title: "No schedule selected", description: "Choose a test schedule before inviting.", variant: "destructive" });
                              return;
                            }
                            setSelectedCandidate(candidate);
                            setIsInviteDialogOpen(true);
                          }}
                          disabled={!!selectedSchedule && isScheduleCompleted}
                          className="h-7 text-xs px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                          title={!selectedSchedule ? "Select a schedule first" : undefined}
                        >
                          <Send className="w-3 h-3" />
                          Invite
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Sticky Bulk Bar ── */}
      {selectedCandidates.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background rounded-xl px-4 py-2.5 shadow-xl border border-foreground/10">
          <Users className="w-4 h-4 opacity-60 shrink-0" />
          <span className="text-sm font-medium">
            <span className="font-bold">{selectedCandidates.length}</span> candidate{selectedCandidates.length !== 1 && "s"} selected
          </span>
          <div className="w-px h-4 bg-background/20" />
          {!selectedSchedule && (
            <span className="text-xs opacity-60 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Select a schedule
            </span>
          )}
          <Button
            size="sm" onClick={handleBulkInvite}
            disabled={submitting || !selectedSchedule || isScheduleCompleted}
            className="h-7 text-xs px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Invites
          </Button>
          <button onClick={() => setSelectedCandidates([])} className="opacity-50 hover:opacity-80" aria-label="Clear selection">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Invite Dialog ── */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Send Invitation
            </DialogTitle>
            <DialogDescription>A unique access link will be emailed to this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${selectedCandidate ? avatarColour(selectedCandidate.user.name) : ""}`}>
                {selectedCandidate ? getInitials(selectedCandidate.user.name) : ""}
              </div>
              <div>
                <p className="font-semibold text-sm">{selectedCandidate?.user.name}</p>
                <p className="text-xs text-muted-foreground">{selectedCandidate?.user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Test", value: selectedScheduleData?.test?.title || "—" },
                { label: "Status", value: selectedScheduleData?.status || "—" },
                { label: "Starts", value: formatDateTime(selectedScheduleData?.startTime || "") },
                { label: "Ends", value: formatDateTime(selectedScheduleData?.endTime || "") },
              ].map(({ label, value }) => (
                <div key={label} className="p-2.5 bg-muted/40 border border-border rounded-md">
                  <p className="text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-medium text-foreground truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsInviteDialogOpen(false); setSelectedCandidate(null); }}>Cancel</Button>
            <Button onClick={handleInvite} disabled={submitting} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
