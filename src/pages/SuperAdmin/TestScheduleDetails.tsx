// src/pages/SuperAdmin/TestScheduleDetails.tsx
import { useState, useEffect } from "react";
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

  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<TestScheduleExtended | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchScheduleDetails();
    }
  }, [id]);

  const fetchScheduleDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch schedule
      const scheduleData = await testService.getTestScheduleById(id!);
      console.log("📋 Schedule Details:", scheduleData);
      setSchedule(scheduleData);
      
      // Fetch test details
      if (scheduleData.testId) {
        const testData = await testService.getTestById(scheduleData.testId);
        console.log("📋 Test Details:", testData);
        setTest(testData);
      }
      
      // Fetch organisation details
      if (scheduleData.organisationId) {
        const orgsData = await apiClient.get("/organisations");
        const orgs = orgsData.data?.data || [];
        const org = orgs.find((o: Organisation) => o.id === scheduleData.organisationId);
        setOrganisation(org || null);
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
  };

  const fetchInvitations = async () => {
    try {
      setInvitationsLoading(true);
      // This endpoint might need to be added by backend
      const response = await apiClient.get(`/candidate-invitations/schedule/${id}`);
      const data = response.data?.data || response.data;
      setInvitations(data || []);
    } catch (error) {
      console.log("No invitations found or endpoint not ready");
      setInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-yellow-500/10 text-yellow-500",
      ACCEPTED: "bg-blue-500/10 text-blue-500",
      LIVE: "bg-green-500/10 text-green-500",
      COMPLETED: "bg-gray-500/10 text-gray-500",
      EXPIRED: "bg-red-500/10 text-red-500",
      PENDING: "bg-yellow-500/10 text-yellow-500",
    };
    return styles[status] || styles.SCHEDULED;
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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
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
            <Button onClick={() => navigate("/superadmin/test-schedules")} className="mt-4 w-full">
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
          onClick={() => navigate("/superadmin/test-schedules")}
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
              <Badge className={getStatusBadge(schedule.status)}>
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
              <p className="text-sm">{formatDateTime(schedule.createdAt || "")}</p>
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
                    <Badge className={getStatusBadge(invitation.status)}>
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
        <Button variant="outline" onClick={() => navigate("/superadmin/invitations")}>
          <Mail className="w-4 h-4 mr-2" />
          Invite More Candidates
        </Button>
        <Button onClick={() => navigate("/superadmin/test-schedules")}>
          Back to Schedules
        </Button>
      </div>
    </div>
  );
}