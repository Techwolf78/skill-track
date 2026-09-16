// src/pages/SuperAdmin/TestScheduleDetails.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  Building2, 
  FileText,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  ClockIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, TestScheduleExtended, Test } from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { organisationService } from "@/lib/organisation-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { formatDateTime } from "@/lib/date-utils";

interface Organisation {
  id: string;
  name: string;
}

interface Invitation {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  sentAt: string;
}

export default function TestScheduleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<(TestScheduleExtended & { organisationId?: string }) | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!id) return;
    try {
      setInvitationsLoading(true);
      // Fetch invitations specifically for this schedule, and candidates for name/email resolution
      const [scheduleInvs, candData] = await Promise.all([
        candidateService.getInvitationsBySchedule(id).catch(() => []),
        candidateService.getCandidates().catch(() => []),
      ]);

      const candMap = new Map<string, { name: string; email: string }>();
      (candData || []).forEach((c: Candidate) => {
        const userObj = c.user || (c as unknown as { user?: { id?: string; name?: string; email?: string } }).user;
        const name = userObj?.name || (c as unknown as { name?: string }).name || (c as unknown as { email?: string }).email || userObj?.email || "";
        const email = userObj?.email || (c as unknown as { email?: string }).email || "";
        candMap.set(c.id, { name, email });
        if (userObj?.id) {
          candMap.set(userObj.id, { name, email });
        }
      });


      const resolvedInvs: Invitation[] = scheduleInvs.map((inv) => {
        const invObj = inv as Record<string, unknown>;
        const candidateId = String(inv.candidateId || "");
        const cand = candMap.get(candidateId);
        const invName = String(inv.candidateName || invObj.name || "");
        const invEmail = String(inv.candidateEmail || invObj.email || "");
        const name = String(invName || cand?.name || invEmail || cand?.email || "Candidate");
        const email = String(invEmail || cand?.email || "N/A");
        return {
          id: String(inv.id || ""),
          candidateId,
          candidateName: name === "Candidate" || name === "Unknown Candidate" ? (cand?.name || cand?.email || name) : name,
          candidateEmail: email === "N/A" ? (cand?.email || "N/A") : email,
          status: (String(inv.status || "PENDING").toUpperCase() as "PENDING" | "ACCEPTED" | "EXPIRED"),
          sentAt: String(inv.sentAt || inv.createdAt || ""),
        };
      });

      setInvitations(resolvedInvs);
    } catch (error) {
      console.log("Error loading invitations:", error);
      setInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  }, [id]);

  const fetchScheduleDetails = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch schedule, tests, and organisations
      const [scheduleData, allTests, allOrgs] = await Promise.all([
        testService.getTestScheduleById(id!).catch(() => null) as Promise<(TestScheduleExtended & { organisationId?: string; organisation?: { name: string } }) | null>,
        testService.getAllTests().catch(() => []),
        organisationService.getOrganisations().catch(() => []),
      ]);

      if (!scheduleData) {
        setSchedule(null);
        return;
      }

      setSchedule(scheduleData);
      
      // Resolve test
      if (scheduleData.testId) {
        const foundTest = allTests.find((t) => t.id === scheduleData.testId);
        setTest(foundTest || null);
      }
      
      // Resolve organisation (from scheduleData.organisationId, or scheduleData.organisation, or first org fallback)
      const orgId = scheduleData.organisationId;
      const foundOrg = allOrgs.find((o) => o.id === orgId);
      if (foundOrg) {
        setOrganisation(foundOrg);
      } else if (scheduleData.organisation?.name) {
        setOrganisation({ id: orgId || "default", name: scheduleData.organisation.name });
      } else if (allOrgs.length > 0) {
        setOrganisation({ id: allOrgs[0].id, name: allOrgs[0].name });
      } else {
        setOrganisation({ id: "default", name: "Default Organisation" });
      }

      // Fetch invitations for this schedule
      await fetchInvitations();
      
    } catch (error) {
      console.error("Failed to fetch schedule details:", error);
      toast({
        title: "Error",
        description: "Failed to load schedule details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, fetchInvitations, toast]);

  useEffect(() => {
    if (id) {
      fetchScheduleDetails();
    }
  }, [id, fetchScheduleDetails]);

  const getScheduleStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
      LIVE: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
      COMPLETED: "bg-slate-500/10 text-slate-600 border border-slate-500/30",
    };
    return styles[status] || styles.SCHEDULED;
  };

  const getInvitationStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
      ACCEPTED: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
      EXPIRED: "bg-red-500/10 text-red-600 border border-red-500/30",
    };
    return styles[status] || styles.PENDING;
  };

  const getInvitationStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "EXPIRED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Schedule not found</p>
            <Button onClick={() => navigate(user?.role === "ADMIN" ? "/admin/schedules" : "/superadmin/test-schedules")} className="mt-4 w-full">
              Back to Schedules
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(user?.role === "ADMIN" ? "/admin/schedules" : "/superadmin/test-schedules")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold">Schedule Details</h1>
          <p className="text-muted-foreground mt-1">
            View complete information about this test schedule
          </p>
        </div>
      </div>

      {/* Schedule Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Test Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold">{test?.title || "Unknown Test"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {test?.durationMins || 0} mins
            </p>
          </CardContent>
        </Card>

        {/* Organisation Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-semibold">{organisation?.name || "Unknown"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Window */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Schedule Window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Start: {formatDateTime(schedule.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">End: {formatDateTime(schedule.endTime)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status & Capacity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status & Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={getScheduleStatusBadge(schedule.status)}>
                {schedule.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Max: {schedule.maxCandidates} candidates</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Information</CardTitle>
          <CardDescription>Detailed information about this test schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Schedule ID</p>
              <p className="text-sm font-mono">{schedule.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Test ID</p>
              <p className="text-sm font-mono">{schedule.testId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p className="text-sm">{formatDateTime(schedule.createdAt || (schedule as unknown as Record<string, unknown>).startTime as string || test?.createdAt || "")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p className="text-sm font-mono">{schedule.createdById || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── B2B Assessment Credits & Consumption Metering ── */}
      <Card className="border-orange-200/80 bg-gradient-to-r from-orange-50/30 via-white to-slate-50/50 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 font-bold text-[11px] tracking-wider uppercase rounded-xs">
                B2B Metering
              </span>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Pay-Per-Attempt Credit Metering
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Credits are deducted only when candidates verify their PIN and start the assessment
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs px-2.5 py-0.5 self-start sm:self-auto">
              Auto-Release Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invited</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{invitations.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total PINs dispatched</p>
            </div>
            <div className="p-3.5 bg-white border border-emerald-200/80 rounded-xl shadow-2xs">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Attempted & Consumed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {invitations.filter((i) => i.status === "ACCEPTED").length}
              </p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Credits deducted (Started)</p>
            </div>
            <div className="p-3.5 bg-white border border-amber-200/80 rounded-xl shadow-2xs">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Logins</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {invitations.filter((i) => i.status === "PENDING").length}
              </p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Reserved / Awaiting start</p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unused / Auto-Released</p>
              <p className="text-2xl font-bold text-slate-600 mt-1">
                {invitations.filter((i) => i.status === "EXPIRED").length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Credits saved (0 charge)</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Consumption Rate:</span>
              <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{
                    width: `${invitations.length > 0 ? (invitations.filter((i) => i.status === "ACCEPTED").length / invitations.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="font-bold text-slate-800">
                {invitations.length > 0
                  ? Math.round((invitations.filter((i) => i.status === "ACCEPTED").length / invitations.length) * 100)
                  : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              💡 <strong>B2B Rule:</strong> If 200 candidates are invited and 150 start the test, exactly 150 credits are deducted. Unused PINs auto-release at schedule end.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Candidate Invitations</CardTitle>
              <CardDescription>
                List of candidates invited to this test schedule
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchInvitations}
              disabled={invitationsLoading}
            >
              {invitationsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No invitations sent yet</p>
              <p className="text-sm">Go to "Invite Candidates" page to send invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-2">
                Total Invitations: {invitations.length}
              </div>
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{invitation.candidateName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{invitation.candidateEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* B2B Credit Status Badge */}
                    {invitation.status === "ACCEPTED" && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 text-[10px] font-medium">
                        1 Credit Deducted
                      </Badge>
                    )}
                    {invitation.status === "PENDING" && (
                      <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/25 text-[10px] font-medium">
                        Reserved
                      </Badge>
                    )}
                    {invitation.status === "EXPIRED" && (
                      <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                        Auto-Released (0 Cost)
                      </Badge>
                    )}

                    {getInvitationStatusIcon(invitation.status)}
                    <Badge className={getInvitationStatusBadge(invitation.status)}>
                      {invitation.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatDateTime(invitation.sentAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(user?.role === "ADMIN" ? "/admin/invitations" : "/superadmin/invitations")}>
          <Mail className="w-4 h-4 mr-2" />
          Invite More Candidates
        </Button>
        <Button onClick={() => navigate(user?.role === "ADMIN" ? "/admin/schedules" : "/superadmin/test-schedules")}>
          Back to Schedules
        </Button>
      </div>
    </div>
  );
}