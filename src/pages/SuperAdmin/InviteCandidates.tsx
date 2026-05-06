import { useState, useEffect } from "react";
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
  Copy,
  Check,
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
  const { toast } = useToast();
  const navigate = useNavigate();

  const baseUrl = window.location.origin; // Gets http://localhost:8080 or production URL

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesData, candidatesData] = await Promise.all([
        testService.getAllTestSchedules(),
        candidateService.getCandidates(),
      ]);

      // Fetch test details for each schedule
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

      // Fetch invitations
      try {
        const response = await apiClient.get("/candidate-invitations");
        setInvitations(response.data.data || []);
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
  };

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
    try {
      const response = await apiClient.post("/candidate-invitations", {
        scheduleId: selectedSchedule,
        candidateId: selectedCandidate.id,
      });

      console.log("Invitation created successfully. Response:", response.data);

      toast({
        title: "Success",
        description: `Invitation sent to ${selectedCandidate.user.name}`,
      });
      setIsInviteDialogOpen(false);
      setSelectedCandidate(null);
      fetchData(); // Refresh to get the new invitation with token
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
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

    try {
      // Backend doesn't have bulk endpoint, so we loop
      for (const candidateId of selectedCandidates) {
        try {
          await apiClient.post("/candidate-invitations", {
            scheduleId: selectedSchedule,
            candidateId: candidateId,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to invite candidate ${candidateId}:`, err);
          failCount++;
        }
      }

      toast({
        title: "Bulk Invitation Complete",
        description: `Successfully invited ${successCount} candidates. ${failCount > 0 ? `${failCount} failed.` : ""}`,
      });

      setSelectedCandidates([]);
      fetchData();
    } catch (error: any) {
      console.error("Bulk invitation error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const copyTestLink = (token: string) => {
    const testUrl = `${baseUrl}/test/access/${token}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedToken(token);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case "EXPIRED":
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <ClockIcon className="w-3 h-3 text-yellow-500" />;
    }
  };

  const getInvitationForCandidate = (
    candidateId: string,
    scheduleId: string,
  ) => {
    // Priority: Find all invitations for this candidate
    const candidateInvitations = invitations.filter(
      (i) => i.candidateId === candidateId,
    );

    // 1. If any invitation is ACCEPTED, show that first regardless of schedule
    const accepted = candidateInvitations.find((i) => i.status === "ACCEPTED");
    if (accepted) return accepted;

    // 2. Otherwise, look for a match specifically for the SELECTED schedule
    const scheduleMatch = candidateInvitations.find(
      (i) => i.scheduleId === scheduleId,
    );
    if (scheduleMatch) return scheduleMatch;

    return null;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const activeSchedules = getActiveSchedules();
  // Display only SCHEDULED or LIVE in the dropdown, but we also want to be able to see others
  const allSchedules = schedules;
  const selectedScheduleData = allSchedules.find(
    (s) => s.id === selectedSchedule,
  );

  // If no schedule is selected, show only candidates who have been invited to at least one test
  const invitedCandidateIds = new Set(invitations.map((i) => i.candidateId));

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Always return true if match search, filtering by invited is removed
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Invite Candidates</h1>
          <p className="text-muted-foreground mt-1">
            Send test invitations to candidates
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("../invitations-history")}
          className="gap-2"
        >
          <Clock className="w-4 h-4" />
          View Invitation History
        </Button>
      </div>

      {/* Select Schedule */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <Label className="text-sm font-medium">Select Test Schedule</Label>
        <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Choose a test schedule" />
          </SelectTrigger>
          <SelectContent>
            {activeSchedules.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                No active schedules
              </div>
            ) : (
              activeSchedules.map((schedule) => (
                <SelectItem key={schedule.id} value={schedule.id}>
                  {schedule.test?.title || "Test"} -{" "}
                  {formatDateTime(schedule.startTime)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedSchedule && selectedScheduleData?.test && (
          <div className="text-xs text-muted-foreground">
            {selectedScheduleData.test.title} will be available from{" "}
            {formatDateTime(selectedScheduleData.startTime)} to{" "}
            {formatDateTime(selectedScheduleData.endTime)}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedCandidates.length > 0 && (
          <Button
            onClick={handleBulkInvite}
            disabled={submitting || !selectedSchedule}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Invite Selected ({selectedCandidates.length})
          </Button>
        )}
      </div>

{/* Candidates Table */}
<div className="border rounded-lg overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[50px]">
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
        </TableHead>
        <TableHead className="w-[50px] text-center">#</TableHead>
        <TableHead>Candidate</TableHead>
        <TableHead>Contact</TableHead>
        <TableHead>Account</TableHead>
        <TableHead>Invitation</TableHead>
        <TableHead>Test Link</TableHead>
        <TableHead className="text-right">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {loading ? (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-10">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </TableCell>
        </TableRow>
      ) : filteredCandidates.length === 0 ? (
        <TableRow>
          <TableCell
            colSpan={8}
            className="text-center py-10 text-muted-foreground"
          >
            No candidates found.
          </TableCell>
        </TableRow>
      ) : (
        filteredCandidates.map((candidate, index) => {
          const invitation = selectedSchedule
            ? getInvitationForCandidate(candidate.id, selectedSchedule)
            : null;

          // Check if the invitation should be considered EXPIRED based on schedule status
          const isScheduleCompleted =
            selectedScheduleData?.status === "COMPLETED" ||
            selectedScheduleData?.status === "EXPIRED";

          const displayStatus =
            invitation?.status === "PENDING" && isScheduleCompleted
              ? "EXPIRED"
              : invitation?.status;

          return (
            <TableRow key={candidate.id}>
              <TableCell>
                <Checkbox
                  checked={selectedCandidates.includes(candidate.id)}
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
              </TableCell>
              <TableCell className="text-center text-muted-foreground text-sm">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">
                      {candidate.user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{candidate.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {candidate.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{candidate.user.email}</div>
                  <div className="text-muted-foreground">
                    {candidate.user.phoneNumber || "No phone"}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {candidate.stale ? "Inactive" : "Active"}
                </Badge>
              </TableCell>
              <TableCell>
                {invitation ? (
                  <div className="flex items-center gap-1">
                    {getStatusIcon(displayStatus || "")}
                    <span className="text-sm">{displayStatus}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not invited
                  </span>
                )}
              </TableCell>
              <TableCell>
                {invitation?.token ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyTestLink(invitation.token)}
                    className="h-8 px-2"
                    disabled={displayStatus === "EXPIRED"}
                  >
                    {copiedToken === invitation.token ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-500" />
                        <span className="text-xs">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3 h-3 mr-1" />
                        <span className="text-xs">Copy Link</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setIsInviteDialogOpen(true);
                  }}
                  disabled={
                    !selectedSchedule ||
                    !!invitation ||
                    isScheduleCompleted
                  }
                >
                  <Send className="w-4 h-4 mr-2" />
                  {invitation ? "Invited" : "Send Invite"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })
      )}
    </TableBody>
  </Table>
</div>

      {/* Invite Confirmation Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Invitation</DialogTitle>
            <DialogDescription>
              Send test invitation to candidate?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              This will send an invitation to{" "}
              <span className="font-semibold">
                {selectedCandidate?.user.name}
              </span>{" "}
              for the test{" "}
              <span className="font-semibold">
                {selectedScheduleData?.test?.title || "Test"}
              </span>
            </p>
            <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>
                  Start: {formatDateTime(selectedScheduleData?.startTime || "")}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3" />
                <span>
                  End: {formatDateTime(selectedScheduleData?.endTime || "")}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
