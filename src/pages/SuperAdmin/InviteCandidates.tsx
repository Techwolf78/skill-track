import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Send,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ClockIcon,
  Link2,
  Check,
  Trash2,
  Users,
  ChevronRight,
  ShieldAlert,
  Inbox,
  ArrowLeft,
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

export default function InviteCandidates() {
  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("available");
  const { toast } = useToast();
  const navigate = useNavigate();

  const baseUrl = window.location.origin;

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
        const response = await apiClient.get(
          "/candidate-invitations?size=1000",
        );
        const invData = response.data?.data;
        if (Array.isArray(invData)) {
          setInvitations(invData);
        } else if (
          invData &&
          typeof invData === "object" &&
          "content" in invData &&
          Array.isArray((invData as Record<string, unknown>).content)
        ) {
          setInvitations(
            (invData as Record<string, unknown>)
              .content as CandidateInvitation[],
          );
        } else {
          setInvitations([]);
        }
      } catch (error) {
        console.log("No invitations data yet");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-select the first active schedule when data is loaded
  useEffect(() => {
    if (schedules.length > 0 && !selectedSchedule) {
      const active = schedules.filter(
        (s) => s.status === "SCHEDULED" || s.status === "LIVE",
      );
      if (active.length > 0) {
        setSelectedSchedule(active[0].id);
      } else {
        setSelectedSchedule(schedules[0].id);
      }
    }
  }, [schedules, selectedSchedule]);

  const handleInvite = async () => {
    if (!selectedSchedule) {
      toast({
        title: "Error",
        description: "Please select a test schedule",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCandidate) {
      toast({
        title: "Error",
        description: "No candidate selected",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    console.log("[InviteCandidates] Sending invitation request...", {
      scheduleId: selectedSchedule,
      candidateId: selectedCandidate.id,
      candidateName: selectedCandidate.user.name,
      candidateEmail: selectedCandidate.user.email,
    });

    try {
      const response = await apiClient.post("/candidate-invitations", {
        scheduleId: selectedSchedule,
        candidateId: selectedCandidate.id,
      });

      console.log("[InviteCandidates] Invitation sent successfully:", response.data);

      toast({
        title: "Success",
        description: `Invitation sent to ${selectedCandidate.user.name}`,
      });
      setIsInviteDialogOpen(false);
      setSelectedCandidate(null);
      fetchData();
    } catch (error) {
      console.error("[InviteCandidates] Invitation sending failed:", {
        error,
        candidateId: selectedCandidate.id,
        candidateName: selectedCandidate.user.name,
        candidateEmail: selectedCandidate.user.email,
      });
      toast({
        title: "Error",
        description:
          (
            error as {
              response?: { data?: { message?: string } };
              message?: string;
            }
          ).response?.data?.message ||
          (error as { message?: string }).message ||
          "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!selectedSchedule) {
      toast({
        title: "Error",
        description: "Please select a test schedule",
        variant: "destructive",
      });
      return;
    }

    if (selectedCandidates.length === 0) {
      toast({
        title: "Error",
        description: "No candidates selected",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    console.log("[InviteCandidates] Starting bulk invitation for candidates:", selectedCandidates);

    try {
      for (const candidateId of selectedCandidates) {
        const candidateDetails = candidates.find(c => c.id === candidateId);
        try {
          console.log(`[InviteCandidates] Bulk sending invitation to candidate: ${candidateDetails?.user?.name || candidateId}`);
          await apiClient.post("/candidate-invitations", {
            scheduleId: selectedSchedule,
            candidateId: candidateId,
          });
          successCount++;
        } catch (err) {
          console.error(`[InviteCandidates] Bulk sending failed for candidate: ${candidateDetails?.user?.name || candidateId}`, err);
          failCount++;
        }
      }

      console.log("[InviteCandidates] Bulk invitation completed:", {
        totalSelected: selectedCandidates.length,
        successful: successCount,
        failed: failCount,
      });

      toast({
        title: "Bulk Invitation Complete",
        description: `Successfully invited ${successCount} candidates. ${failCount > 0 ? `${failCount} failed.` : ""}`,
      });

      setSelectedCandidates([]);
      fetchData();
    } catch (error) {
      console.error("Bulk invitation error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const copyTestLink = (id: string) => {
    const testUrl = `${baseUrl}/test/access/${id}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedToken(id);
    toast({
      title: "Link Copied!",
      description: "Test URL copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getActiveSchedules = () => {
    return schedules.filter(
      (s) => s.status === "SCHEDULED" || s.status === "LIVE",
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-xs gap-1 py-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 font-mono text-xs gap-1 py-0.5">
            <XCircle className="w-3 h-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-mono text-xs gap-1 py-0.5 animate-pulse">
            <ClockIcon className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  const getInvitationForCandidate = (
    candidateId: string,
    scheduleId: string,
  ) => {
    return (
      invitations.find(
        (i) => i.candidateId === candidateId && i.scheduleId === scheduleId,
      ) || null
    );
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const activeSchedules = getActiveSchedules();
  const allSchedules = schedules;
  const selectedScheduleData = allSchedules.find(
    (s) => s.id === selectedSchedule,
  );

  const isScheduleCompleted =
    selectedScheduleData?.status === "COMPLETED" ||
    selectedScheduleData?.status === "EXPIRED";

  // Filter candidates matching search query
  const candidatesMatchingSearch = candidates.filter((candidate) => {
    return (
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Segregate based on invitation status for selected schedule
  const filteredCandidates = candidatesMatchingSearch.filter((candidate) => {
    if (!selectedSchedule) return true;

    const invitation = getInvitationForCandidate(
      candidate.id,
      selectedSchedule,
    );

    if (activeTab === "available") {
      return !invitation;
    } else if (activeTab === "invited") {
      return !!invitation;
    }
    return true; // "all"
  });

  return (
    <div className="space-y-6 w-full mx-auto p-1 animate-fade-in">
      {/* 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left column: Control Panel / Active Schedule Selector */}
        <div className="lg:col-span-3 space-y-3">
          <div className="border border-border bg-card rounded-lg p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Control Center
              </h2>
              <Badge
                variant="outline"
                className="border-border text-muted-foreground font-mono text-[10px] px-1.5 py-0"
              >
                Schedules: {activeSchedules.length}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground font-mono uppercase tracking-wider">
                Active Test Schedule
              </Label>
              <Select
                value={selectedSchedule}
                onValueChange={setSelectedSchedule}
              >
                <SelectTrigger className="w-full h-8 bg-background border-border font-mono text-xs focus:ring-1 focus:ring-ring text-foreground px-2">
                  <SelectValue placeholder="Choose a schedule..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground font-mono text-xs">
                  {allSchedules.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">
                      No schedules found
                    </div>
                  ) : (
                    allSchedules.map((schedule) => (
                      <SelectItem
                        key={schedule.id}
                        value={schedule.id}
                        className="focus:bg-accent focus:text-accent-foreground"
                      >
                        {schedule.test?.title || "Test"} ({schedule.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedScheduleData ? (
              <div className="space-y-3 pt-2.5 border-t border-border">
                <div className="bg-muted/40 border border-border/80 rounded-md p-2.5 space-y-2 font-mono">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                        Selected Test
                      </span>
                      <h3 className="font-semibold text-foreground text-xs leading-tight mt-0.5">
                        {selectedScheduleData.test?.title || "Unknown Test"}
                      </h3>
                    </div>
                    <Badge
                      className={`text-[9px] font-bold tracking-wide uppercase px-1.5 py-0 shrink-0 ${
                        selectedScheduleData.status === "LIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : selectedScheduleData.status === "SCHEDULED"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {selectedScheduleData.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-[10px] pt-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                      <div className="truncate">
                        <span className="text-muted-foreground/50 mr-0.5 font-semibold">
                          START:
                        </span>
                        {formatDateTime(selectedScheduleData.startTime)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                      <div className="truncate">
                        <span className="text-muted-foreground/50 mr-0.5 font-semibold">
                          END:
                        </span>
                        {formatDateTime(selectedScheduleData.endTime)}
                      </div>
                    </div>
                  </div>

                  {isScheduleCompleted && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-destructive/10 border border-destructive/20 text-destructive rounded text-[9px] leading-snug">
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      <span>Completed / expired. Cannot send invites.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-[10px] text-muted-foreground font-mono border border-dashed border-border rounded-md">
                No active schedule selected
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("../invitations-history")}
              className="w-full h-8 justify-between border-border bg-muted/20 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted px-2.5"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
                History Log
              </span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Right column: Workspace (Candidates Management) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <Input
                placeholder="Search candidates by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border text-foreground focus-visible:ring-1 focus-visible:ring-ring text-sm font-mono"
              />
            </div>

            {selectedCandidates.length > 0 && (
              <Button
                onClick={handleBulkInvite}
                disabled={
                  submitting || !selectedSchedule || isScheduleCompleted
                }
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs gap-2 shrink-0 border border-emerald-500/20 shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Bulk Invites ({selectedCandidates.length})
              </Button>
            )}
          </div>

          {/* Tabs Filter */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="bg-muted/40 border border-border p-1 w-full justify-start rounded-md gap-1">
              <TabsTrigger
                value="available"
                className="font-mono text-xs py-1.5 px-3 rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
              >
                Available to Invite
              </TabsTrigger>
              <TabsTrigger
                value="invited"
                className="font-mono text-xs py-1.5 px-3 rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
              >
                Invited Candidates
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="font-mono text-xs py-1.5 px-3 rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
              >
                All Candidates
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Table Container */}
          <div className="border border-border bg-card rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-[40px] px-3 py-1.5">
                    {activeTab === "available" && (
                      <Checkbox
                        checked={
                          filteredCandidates.length > 0 &&
                          filteredCandidates.every((c) =>
                            selectedCandidates.includes(c.id),
                          )
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const allIds = filteredCandidates.map((c) => c.id);
                            setSelectedCandidates((prev) =>
                              Array.from(new Set([...prev, ...allIds])),
                            );
                          } else {
                            const filteredIds = new Set(
                              filteredCandidates.map((c) => c.id),
                            );
                            setSelectedCandidates((prev) =>
                              prev.filter((id) => !filteredIds.has(id)),
                            );
                          }
                        }}
                      />
                    )}
                  </TableHead>
                  <TableHead className="w-[50px] text-center font-mono text-[10px] text-muted-foreground py-1.5">
                    #
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground py-1.5">
                    Candidate
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground py-1.5">
                    Contact
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground py-1.5">
                    Account
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-muted-foreground py-1.5">
                    Invitation
                  </TableHead>
                  {activeTab !== "available" && (
                    <TableHead className="font-mono text-[10px] text-muted-foreground py-1.5">
                      Invite Link
                    </TableHead>
                  )}
                  <TableHead className="text-right font-mono text-[10px] text-muted-foreground pr-3 py-1.5">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          Querying candidates database...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCandidates.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground font-mono"
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Inbox className="w-6 h-6 text-muted-foreground/30" />
                        <span className="text-[11px]">
                          {activeTab === "available"
                            ? "No candidates available to invite."
                            : activeTab === "invited"
                              ? "No invited candidates for this schedule."
                              : "No candidates matching the criteria."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate, index) => {
                    const invitation = selectedSchedule
                      ? getInvitationForCandidate(
                          candidate.id,
                          selectedSchedule,
                        )
                      : null;

                    const displayStatus =
                      invitation?.status === "PENDING" && isScheduleCompleted
                        ? "EXPIRED"
                        : invitation?.status;

                    return (
                      <TableRow
                        key={candidate.id}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-3 py-1">
                          {activeTab === "available" && (
                            <Checkbox
                              checked={selectedCandidates.includes(
                                candidate.id,
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCandidates((prev) => [
                                    ...prev,
                                    candidate.id,
                                  ]);
                                } else {
                                  setSelectedCandidates((prev) =>
                                    prev.filter((id) => id !== candidate.id),
                                  );
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-[10px] text-muted-foreground/80 py-1">
                          {index + 1}
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-mono font-bold text-muted-foreground">
                                {candidate.user.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2) || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-xs leading-none">
                                {candidate.user.name}
                              </p>
                              <p className="text-[8px] font-mono text-muted-foreground/60 mt-0.5">
                                ID: {candidate.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="font-mono text-[10px] text-foreground/90 leading-tight">
                            <div>{candidate.user.email}</div>
                            <div className="text-muted-foreground text-[9px]">
                              {candidate.user.phoneNumber || "No phone"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[8px] uppercase border px-1 py-0 ${candidate.stale ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"}`}
                          >
                            {candidate.stale ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1">
                          {invitation ? (
                            getStatusBadge(displayStatus || "")
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground/75">
                              Not Invited
                            </span>
                          )}
                        </TableCell>
                        {activeTab !== "available" && (
                          <TableCell className="py-1">
                            {invitation ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyTestLink(invitation.id)}
                                className="h-6 px-1.5 border border-border bg-muted/20 hover:bg-muted font-mono text-[9px] text-muted-foreground hover:text-foreground"
                                disabled={displayStatus === "EXPIRED"}
                              >
                                {copiedToken === invitation.id ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 mr-1 text-emerald-500" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="w-2.5 h-2.5 mr-1 text-muted-foreground/70" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="font-mono text-[9px] text-muted-foreground/50">
                                -
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right pr-3 py-1">
                          {invitation ? (
                            <div className="flex items-center justify-end gap-1">
                              <Badge className="bg-green-500/10 text-green-400 border border-green-400/30 font-mono text-[10px] py-0.5 px-2 rounded-full shadow-sm shadow-green-500/10">
                                Sent
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Revoke/Delete invitation for ${candidate.user.name}?`,
                                    )
                                  ) {
                                    try {
                                      console.log("[InviteCandidates] Revoking invitation:", {
                                        invitationId: invitation.id,
                                        candidateName: candidate.user.name,
                                      });
                                      await apiClient.delete(
                                        `/candidate-invitations/${invitation.id}`,
                                      );
                                      console.log("[InviteCandidates] Invitation revoked successfully");
                                      toast({
                                        title: "Success",
                                        description:
                                          "Invitation revoked successfully.",
                                      });
                                      fetchData();
                                    } catch (err) {
                                      console.error("[InviteCandidates] Revocation failed:", {
                                        error: err,
                                        invitationId: invitation.id,
                                        candidateName: candidate.user.name,
                                      });
                                      const axiosErr = err as {
                                        response?: {
                                          data?: {
                                            message?: string;
                                            error?: string;
                                          };
                                        };
                                        message?: string;
                                      };
                                      const errorMessage =
                                        axiosErr.response?.data?.message ||
                                        axiosErr.response?.data?.error ||
                                        axiosErr.message ||
                                        "Failed to revoke invitation";
                                      toast({
                                        title: "Error",
                                        description: errorMessage,
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="h-6 bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-[10px] px-2"
                              onClick={() => {
                                setSelectedCandidate(candidate);
                                setIsInviteDialogOpen(true);
                              }}
                              disabled={
                                !selectedSchedule || isScheduleCompleted
                              }
                            >
                              <Send className="w-2.5 h-2.5 mr-1" />
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
        </div>
      </div>

      {/* Invite Confirmation Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="bg-popover border border-border text-popover-foreground">
          <DialogHeader>
            <DialogTitle className="font-mono text-foreground">
              Confirm Candidate Invitation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-mono text-xs">
              This triggers a direct test invitation and access link generation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 font-mono text-xs">
            <p className="text-foreground">
              Send access token to candidate{" "}
              <span className="text-emerald-500 font-bold">
                {selectedCandidate?.user.name}
              </span>
              ?
            </p>
            <div className="bg-muted border border-border/80 rounded-md p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Test:</span>
                <span className="text-foreground font-semibold">
                  {selectedScheduleData?.test?.title || "Test"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Starts:</span>
                <span className="text-foreground">
                  {formatDateTime(selectedScheduleData?.startTime || "")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ends:</span>
                <span className="text-foreground">
                  {formatDateTime(selectedScheduleData?.endTime || "")}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              className="border-border bg-transparent text-muted-foreground font-mono text-xs hover:bg-muted hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={submitting}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-mono text-xs"
            >
              {submitting && (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
