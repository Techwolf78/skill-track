import { useState, useEffect } from "react";
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

interface CandidateInvitation {
  id: string;
  scheduleId: string;
  candidateId: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  sentAt: string;
}

export default function InvitedCandidatesHistory() {
  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      setInvitations(invitationsResponse.data.data || []);
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

  // Filter ONLY invited candidates
  const invitedCandidateIds = new Set(invitations.map(i => i.candidateId));
  
  const filteredInvitedCandidates = candidates.filter(candidate => {
    const isInvited = invitedCandidateIds.has(candidate.id);
    const matchesSearch = 
      candidate.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return isInvited && matchesSearch;
  });

  // Map invitations to candidate display
  const invitationsForDisplay = filteredInvitedCandidates.flatMap(candidate => {
    const candInvs = invitations.filter(i => i.candidateId === candidate.id);
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

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="px-3 py-1">
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
                      onClick={() => copyTestLink(inv.token)}
                      className="h-8 px-2"
                      disabled={inv.displayStatus === "EXPIRED"}
                    >
                      {copiedToken === inv.token ? (
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
