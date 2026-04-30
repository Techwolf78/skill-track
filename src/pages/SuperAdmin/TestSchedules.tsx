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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  Loader2,
  Building2,
  Eye,
  MoreHorizontal,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, Test, TestScheduleExtended } from "@/lib/test-service";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";

interface Organisation {
  id: string;
  name: string;
}

// Extended schedule with organisation name
interface ScheduleWithOrg extends TestScheduleExtended {
  organisationName: string;
  test?: Test;
  invitedCount?: number;
}

export default function TestSchedules() {
  const [schedules, setSchedules] = useState<ScheduleWithOrg[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    testId: "",
    organisationId: "",
    startTime: "",
    endTime: "",
    maxCandidates: 100,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const [schedulesData, testsData, orgsData, invitationsResponse] = await Promise.all([
      testService.getAllTestSchedules(),
      testService.getAllTests(),
      apiClient.get("/organisations").then((res) => res.data.data || []),
      apiClient.get("/candidate-invitations").catch(() => ({ data: { data: [] } })),
    ]);

    const invitations = invitationsResponse.data.data || [];

    console.log("📋 Loaded Schedules:", schedulesData);
    console.log("📋 Loaded Tests:", testsData);
    console.log("📋 Loaded Organisations:", orgsData);
    console.log("📋 Loaded Invitations:", invitations);

    // Create a quick map of organisationId to name from orgsData
    const orgMap = new Map();
    orgsData.forEach((org: Organisation) => {
      orgMap.set(org.id, org.name);
    });

    const schedulesWithOrg = schedulesData.map((schedule) => {
      const test = testsData.find((t) => t.id === schedule.testId);
      
      // Get organisation name from test.organisationId using the orgMap
      let organisationName = "Unknown Organisation";
      
      // First try to get from test.organisationId
      if (test?.organisationId && orgMap.has(test.organisationId)) {
        organisationName = orgMap.get(test.organisationId);
      } 
      // Fallback to schedule.organisationId if available
      else if (schedule.organisationId && orgMap.has(schedule.organisationId)) {
        organisationName = orgMap.get(schedule.organisationId);
      }
      
      // Count invitations for this schedule
      const invitedCount = invitations.filter((inv: any) => inv.testScheduleId === schedule.id || inv.scheduleId === schedule.id).length;

      console.log(`Schedule ${schedule.id} -> Test: ${test?.title}, Org: ${organisationName}, Invited: ${invitedCount}`);
      
      return {
        ...schedule,
        test,
        organisationName,
        invitedCount,
      };
    });

    setSchedules(schedulesWithOrg);
    setTests(testsData.filter((t) => t.status === "PUBLISHED"));
    setOrganisations(orgsData);
  } catch (error) {
    console.error("Failed to fetch data:", error);
    toast({
      title: "Error",
      description: "Failed to load test schedules",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (scheduleId: string, newStatus: string) => {
    setUpdatingStatus(scheduleId);
    try {
      await testService.updateTestScheduleStatus(scheduleId, newStatus);
      toast({
        title: "Success",
        description: `Schedule status updated to ${newStatus}`,
      });
      fetchData(); // Refresh the data
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCreateSchedule = async () => {
    if (!formData.testId) {
      toast({
        title: "Error",
        description: "Please select a test",
        variant: "destructive",
      });
      return;
    }
    if (!formData.organisationId) {
      toast({
        title: "Error",
        description: "Please select an organisation",
        variant: "destructive",
      });
      return;
    }
    if (!formData.startTime) {
      toast({
        title: "Error",
        description: "Please select start time",
        variant: "destructive",
      });
      return;
    }
    if (!formData.endTime) {
      toast({
        title: "Error",
        description: "Please select end time",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    if (endDate <= startDate) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const newSchedule = await testService.createTestSchedule({
        testId: formData.testId,
        organisationId: formData.organisationId,
        startTime: formData.startTime,
        endTime: formData.endTime,
        maxCandidates: formData.maxCandidates,
      });

      console.log("✅ Schedule created:", newSchedule);

      toast({
        title: "Success",
        description: "Test schedule created successfully",
      });
      setIsCreateDialogOpen(false);
      setFormData({
        testId: "",
        organisationId: "",
        startTime: "",
        endTime: "",
        maxCandidates: 100,
      });
      fetchData();
    } catch (error: any) {
      console.error("Failed to create schedule:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create schedule",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-yellow-500/10 text-yellow-500",
      ACCEPTED: "bg-blue-500/10 text-blue-500",
      LIVE: "bg-green-500/10 text-green-500",
      COMPLETED: "bg-gray-500/10 text-gray-500",
      EXPIRED: "bg-red-500/10 text-red-500",
    };
    return styles[status] || styles.SCHEDULED;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Get available actions based on current status
  const getAvailableActions = (currentStatus: string) => {
    switch (currentStatus) {
      case "SCHEDULED":
        return [
          { label: "Make Live", value: "LIVE", icon: Play, color: "text-green-600" },
          { label: "Mark as Completed", value: "COMPLETED", icon: CheckCircle, color: "text-blue-600" },
        ];
      case "LIVE":
        return [
          { label: "Mark as Completed", value: "COMPLETED", icon: CheckCircle, color: "text-blue-600" },
        ];
      case "COMPLETED":
        return [
          { label: "Mark as Expired", value: "EXPIRED", icon: XCircle, color: "text-red-600" },
        ];
      case "EXPIRED":
        return [
          { label: "View Details", value: "view", icon: Eye, color: "text-gray-600" },
        ];
      default:
        return [
          { label: "View Details", value: "view", icon: Eye, color: "text-gray-600" },
        ];
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch =
      schedule.test?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.organisationName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Test Schedules</h1>
          <p className="text-muted-foreground mt-1">
            Schedule tests for organisations and their candidates
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by test or organisation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Schedules Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Name</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Max Candidates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredSchedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-muted-foreground"
                >
                  No schedules found. Create your first test schedule.
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedules.map((schedule) => {
                const actions = getAvailableActions(schedule.status);
                const isUpdating = updatingStatus === schedule.id;
                
                return (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {schedule.test?.title || "Unknown Test"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {schedule.organisationName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDateTime(schedule.startTime)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDateTime(schedule.endTime)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{schedule.maxCandidates}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(schedule.status)}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.invitedCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="w-4 h-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* View option always available */}
                          <DropdownMenuItem
                            onClick={() => navigate(`/superadmin/test-schedules/${schedule.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          
                          {/* Status change options based on current status */}
                          {actions.map((action) => (
                            <DropdownMenuItem
                              key={action.value}
                              onClick={() => {
                                if (action.value === "view") {
                                  navigate(`/superadmin/test-schedules/${schedule.id}`);
                                } else {
                                  handleUpdateStatus(schedule.id, action.value);
                                }
                              }}
                            >
                              <action.icon className={`w-4 h-4 mr-2 ${action.color}`} />
                              <span>{action.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Schedule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Test</DialogTitle>
            <DialogDescription>
              Select a test, organisation, and set the availability window
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Test *</Label>
              <Select
                value={formData.testId}
                onValueChange={(v) => setFormData({ ...formData, testId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.title} ({test.durationMins} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Organisation *</Label>
              <Select
                value={formData.organisationId}
                onValueChange={(v) =>
                  setFormData({ ...formData, organisationId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max Candidates</Label>
              <Input
                type="number"
                value={formData.maxCandidates}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxCandidates: parseInt(e.target.value),
                  })
                }
                min={1}
                max={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}