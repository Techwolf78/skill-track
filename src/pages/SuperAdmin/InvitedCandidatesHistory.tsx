import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ClockIcon,
  Link2,
  Check,
  ArrowLeft,
  Calendar,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, TestSchedule } from "@/lib/test-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { apiClient } from "@/lib/api-client";
import { useNavigate } from "react-router-dom";

import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CandidateInvitation {
  id: string;
  scheduleId: string;
  candidateId: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  sentAt: string;
}

export default function InvitedCandidatesHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScheduleId = searchParams.get("scheduleId") || "ALL";

  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<string>(initialScheduleId);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const baseUrl = window.location.origin;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedulesData, candidatesData, invitationsResponse] = await Promise.all([
        testService.getAllTestSchedules(),
        candidateService.getCandidates(),
        apiClient.get("/candidate-invitations").catch(() => ({ data: { data: [] } })),
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
        })
      );
      
      setSchedules(schedulesWithTests);
      setCandidates(candidatesData);
      const invData = invitationsResponse.data?.data;
      if (Array.isArray(invData)) {
        setInvitations(invData);
      } else if (invData && typeof invData === "object" && "content" in invData && Array.isArray((invData as Record<string, unknown>).content)) {
        setInvitations((invData as Record<string, unknown>).content as CandidateInvitation[]);
      } else {
        setInvitations([]);
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

  const copyTestLink = (id: string, token?: string) => {
    const tokenParam = token ? `?magicToken=${encodeURIComponent(token)}` : "";
    const testUrl = `${baseUrl}/test/access/${id}${tokenParam}`;
    navigator.clipboard.writeText(testUrl);
    setCopiedToken(id);
    toast({
      title: "Link Copied!",
      description: token ? "Magic access link copied to clipboard" : "Test URL copied to clipboard",
    });
    setTimeout(() => setCopiedToken(null), 2000);
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

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Filter invitations by selected schedule (if specific schedule is selected)
  const filteredInvitationsList = selectedScheduleFilter === "ALL" 
    ? invitations 
    : invitations.filter(i => i.scheduleId === selectedScheduleFilter);

  const invitedCandidateIds = new Set(filteredInvitationsList.map(i => i.candidateId));
  
  const filteredInvitedCandidates = candidates.filter(candidate => {
    const isInvited = invitedCandidateIds.has(candidate.id);
    const matchesSearch = 
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return isInvited && matchesSearch;
  });

  // Map invitations to candidate display
  const invitationsForDisplay = filteredInvitedCandidates.flatMap(candidate => {
    const candInvs = filteredInvitationsList.filter(i => i.candidateId === candidate.id);
    return candInvs.map(inv => {
      const schedule = schedules.find(s => s.id === inv.scheduleId);
      return {
        ...inv,
        candidate,
        schedule,
        // Visual status derived from schedule
        displayStatus: (inv.status === "PENDING" && (schedule?.status === "COMPLETED" || schedule?.status === "EXPIRED"))
                        ? "EXPIRED"
                        : inv.status
      };
    });
  }).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold">Invitation History</h1>
          <p className="text-muted-foreground mt-1">
            View all previously sent test invitations
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 font-mono text-sm"
            />
          </div>

          {/* Schedule Filter Dropdown (Toggle Selected Schedule vs All Schedules) */}
          <Select
            value={selectedScheduleFilter}
            onValueChange={(val) => {
              setSelectedScheduleFilter(val);
              setSearchParams(val === "ALL" ? {} : { scheduleId: val });
            }}
          >
            <SelectTrigger className="w-[260px] font-mono text-xs h-10 border-border bg-background">
              <SelectValue placeholder="Filter by schedule..." />
            </SelectTrigger>
            <SelectContent className="font-mono text-xs bg-popover border-border">
              <SelectItem value="ALL" className="font-bold text-emerald-400">
                🌐 All Test Schedules (Global View)
              </SelectItem>
              {schedules.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.test?.title || "Test Schedule"} ({s.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="secondary" className="px-3 py-1 font-mono text-xs border border-border shrink-0">
          {invitationsForDisplay.length} Total Invitations
        </Badge>
      </div>

      {/* Invitations Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Test Schedule</TableHead>
              <TableHead>Sent At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : invitationsForDisplay.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No invitation history found.
                </TableCell>
              </TableRow>
            ) : (
              invitationsForDisplay.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inv.candidate.user.name}</p>
                        <p className="text-xs text-muted-foreground">{inv.candidate.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium text-primary">
                        {inv.schedule?.test?.title || "Unknown Test"}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{inv.schedule ? new Date(inv.schedule.startTime).toLocaleDateString() : "N/A"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(inv.sentAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(inv.displayStatus)}
                      <span className="text-sm">{inv.displayStatus}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyTestLink(inv.id, inv.token)}
                      className="h-8 px-2"
                      disabled={inv.displayStatus === "EXPIRED"}
                    >
                      {copiedToken === inv.id ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-green-500" />
                          <span className="text-xs">Copied</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3 h-3 mr-1" />
                          <span className="text-xs">Copy Link</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
