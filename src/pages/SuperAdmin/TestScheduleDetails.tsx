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
  ClockIcon,
  RotateCcw,
  Coins,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { testService, TestScheduleExtended, Test } from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { organisationService } from "@/lib/organisation-service";
import { candidateService, Candidate } from "@/lib/candidate-service";
import { formatDateTime } from "@/lib/date-utils";
import { useTriggerScheduleRefundMutation } from "@/hooks/use-query-hooks";

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
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);

  const triggerRefundMutation = useTriggerScheduleRefundMutation();

  const handleTriggerRefund = async () => {
    if (!schedule) return;
    try {
      const res = await triggerRefundMutation.mutateAsync(schedule.id);
      toast({
        title: "Refund Processed Successfully",
        description:
          res.message ||
          `Swept ${res.noShowCount} unstarted candidate(s) and refunded ${res.refundedPins} PIN(s) to ${organisation?.name || "the organisation"}.`,
      });
      setRefundConfirmOpen(false);
      setSchedule((prev) => (prev ? { ...prev, refundProcessedAt: res.refundProcessedAt || new Date().toISOString() } : null));
      fetchScheduleDetails();
    } catch (err) {
      console.error("Manual schedule refund failed:", err);
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to trigger refund.";
      toast({
        title: "Refund Failed",
        description: errMsg,
        variant: "destructive",
      });
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        {user?.role === "SUPERADMIN" && (
          <div className="flex items-center gap-3">
            {schedule.refundProcessedAt ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 py-1.5 px-3 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Refund Processed ({formatDateTime(schedule.refundProcessedAt)})</span>
              </Badge>
            ) : new Date(schedule.endTime) <= new Date() ? (
              <Button
                onClick={() => setRefundConfirmOpen(true)}
                disabled={triggerRefundMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                Trigger No-Show Refund
              </Button>
            ) : (
              <Badge variant="outline" className="text-slate-500 border-slate-200 py-1.5 px-3 text-xs">
                Refund Eligible After End Time
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Schedule Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Test Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold truncate">{test?.title || "Unknown Test"}</span>
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
              <span className="font-semibold truncate">{organisation?.name || "Unknown"}</span>
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
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs truncate">Start: {formatDateTime(schedule.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs truncate">End: {formatDateTime(schedule.endTime)}</span>
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
              <span className="text-xs">Max: {schedule.maxCandidates} candidates</span>
            </div>
          </CardContent>
        </Card>

        {/* Refund Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refund Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              {schedule.refundProcessedAt ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Processed</span>
                </Badge>
              ) : new Date(schedule.endTime) <= new Date() ? (
                <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1 font-medium text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending (Eligible)</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs">
                  Schedule Active
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {schedule.refundProcessedAt
                ? `Processed on ${formatDateTime(schedule.refundProcessedAt)}`
                : new Date(schedule.endTime) <= new Date()
                ? "Eligible for manual or auto sweep"
                : "Awaiting schedule completion"}
            </p>
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
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invitation.candidateName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{invitation.candidateEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getInvitationStatusIcon(invitation.status)}
                    <Badge className={getInvitationStatusBadge(invitation.status)}>
                      {invitation.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
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

      {/* Confirmation Dialog for Triggering Refund */}
      <AlertDialog
        open={refundConfirmOpen}
        onOpenChange={(open) => !open && setRefundConfirmOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Trigger Manual No-Show Refund
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-left text-sm text-muted-foreground">
                <p>
                  Are you sure you want to sweep and refund unstarted invitations for:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1 my-2">
                  <div><strong className="text-slate-800">Test:</strong> {test?.title || "Test Schedule"}</div>
                  <div><strong className="text-slate-800">Organisation:</strong> {organisation?.name || "Organisation"}</div>
                  <div><strong className="text-slate-800">Schedule Ended:</strong> {formatDateTime(schedule.endTime)}</div>
                  <div><strong className="text-slate-800">Total Invitations:</strong> {invitations.length} candidate(s)</div>
                </div>
                <p className="text-xs text-muted-foreground block">
                  This will immediately sweep all unstarted (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">PENDING</code>) candidate invitations for this schedule, mark them as <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">EXPIRED</code>, and credit 1 PIN per no-show candidate back to the organisation's PIN balance.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggerRefundMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleTriggerRefund();
              }}
              disabled={triggerRefundMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {triggerRefundMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm & Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}