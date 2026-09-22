import { useState, useEffect, useCallback, useMemo } from "react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testService, Test, TestScheduleExtended } from "@/lib/test-service";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import {
  useTestSchedulesQuery,
  useTestsQuery,
  useOrganisationsQuery,
  useCreateTestScheduleMutation,
  useUpdateTestScheduleStatusMutation,
  useTriggerScheduleRefundMutation,
} from "@/hooks/use-query-hooks";
import { formatDateTime, toBackendDateTime } from "@/lib/date-utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [refundModalSchedule, setRefundModalSchedule] = useState<ScheduleWithOrg | null>(null);
  const [formData, setFormData] = useState({
    testId: "",
    organisationId: "",
    startTime: "",
    endTime: "",
    maxCandidates: 100,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: schedulesData = [],
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useTestSchedulesQuery();
  const {
    data: testsData = [],
    isLoading: testsLoading,
    refetch: refetchTests,
  } = useTestsQuery();
  const {
    data: orgsData = [],
    isLoading: orgsLoading,
    refetch: refetchOrgs,
  } = useOrganisationsQuery();

  const {
    data: invitations = [],
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: ["candidate-invitations"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/candidate-invitations?size=1000");
        const data = res.data?.data;

        if (Array.isArray(data)) {
          return data;
        }
        if (data && typeof data === "object" && "content" in data && Array.isArray((data as Record<string, unknown>).content)) {
          return (data as Record<string, unknown>).content as Record<string, unknown>[];
        }
        return [];
      } catch (e) {
        return [];
      }
    },
  });

  const loading =
    schedulesLoading || testsLoading || orgsLoading || invitationsLoading;

  const createScheduleMutation = useCreateTestScheduleMutation();
  const updateStatusMutation = useUpdateTestScheduleStatusMutation();
  const triggerRefundMutation = useTriggerScheduleRefundMutation();

  const schedules = useMemo(() => {
    const orgMap = new Map<string, string>();
    (orgsData || []).forEach((org) => {
      orgMap.set(org.id, org.name);
    });

    return schedulesData.map((schedule) => {
      const test = testsData.find((t) => t.id === schedule.testId);
      let organisationName = "Unknown Organisation";
      if (test?.organisationId && orgMap.has(test.organisationId)) {
        organisationName = orgMap.get(test.organisationId)!;
      } else {
        const scheduleOrgId = (schedule as { organisationId?: string })
          .organisationId;
        if (scheduleOrgId && orgMap.has(scheduleOrgId)) {
          organisationName = orgMap.get(scheduleOrgId)!;
        }
      }

      const invitedCount = invitations.filter(
        (inv: { testScheduleId?: string; scheduleId?: string }) =>
          inv.testScheduleId === schedule.id || inv.scheduleId === schedule.id,
      ).length;

      return {
        ...schedule,
        test,
        organisationName,
        invitedCount,
      };
    });
  }, [schedulesData, testsData, orgsData, invitations]);

  const tests = useMemo(
    () => testsData.filter((t) => t.status === "PUBLISHED"),
    [testsData],
  );
  const organisations = orgsData || [];

  const fetchData = useCallback(() => {
    refetchSchedules();
    refetchTests();
    refetchOrgs();
    refetchInvitations();
  }, [refetchSchedules, refetchTests, refetchOrgs, refetchInvitations]);

  const handleUpdateStatus = async (scheduleId: string, newStatus: string) => {
    setUpdatingStatus(scheduleId);
    try {
      await updateStatusMutation.mutateAsync({ scheduleId, status: newStatus });

      toast({
        title: "Success",
        description: `Schedule status updated to ${newStatus}`,
      });
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string } };
      } & Error;
      console.error("Failed to update status:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update status",
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
      await createScheduleMutation.mutateAsync({
        testId: formData.testId,
        startTime: toBackendDateTime(formData.startTime),
        endTime: toBackendDateTime(formData.endTime),
        maxCandidates: formData.maxCandidates,
      });

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
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string } };
      } & Error;
      console.error("Failed to create schedule:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create schedule",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
      LIVE: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
      COMPLETED: "bg-slate-500/10 text-slate-600 border border-slate-500/30",
    };
    return styles[status] || styles.SCHEDULED;
  };

  const getRefundBadge = (schedule: ScheduleWithOrg) => {
    if (schedule.refundProcessedAt) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 font-medium w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Refunded</span>
        </Badge>
      );
    }
    const isPastEndTime = new Date(schedule.endTime) <= new Date();
    if (isPastEndTime) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1 font-medium w-fit">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Refund Eligible</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs w-fit">
        Active / Pending
      </Badge>
    );
  };

  const handleTriggerRefund = async () => {
    if (!refundModalSchedule) return;
    try {
      const res = await triggerRefundMutation.mutateAsync(refundModalSchedule.id);
      toast({
        title: "No-Show Refund Processed",
        description:
          res.message ||
          `Successfully swept ${res.noShowCount} unstarted candidate(s) and refunded ${res.refundedPins} PIN(s) to ${refundModalSchedule.organisationName}.`,
      });
      setRefundModalSchedule(null);
      refetchSchedules();
      refetchInvitations();
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

  // Get available actions based on current status
  const getAvailableActions = (currentStatus: string) => {
    switch (currentStatus) {
      case "SCHEDULED":
        return [
          {
            label: "Make Live",
            value: "LIVE",
            icon: Play,
            color: "text-green-600",
          },
          {
            label: "Mark as Completed",
            value: "COMPLETED",
            icon: CheckCircle,
            color: "text-blue-600",
          },
        ];
      case "LIVE":
        return [
          {
            label: "Mark as Completed",
            value: "COMPLETED",
            icon: CheckCircle,
            color: "text-blue-600",
          },
        ];
      case "COMPLETED":
        return []; // No actions for completed
      default:
        return [];
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch =
      schedule.test?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.organisationName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => fetchData()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>
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
              <TableHead>Refund</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredSchedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
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
                      {getRefundBadge(schedule)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {schedule.invitedCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
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
                            onClick={() =>
                              navigate(
                                `/${user?.role === "ADMIN" ? "admin/schedules" : "superadmin/test-schedules"}/${schedule.id}`,
                              )
                            }
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
                                  navigate(
                                    `/${user?.role === "ADMIN" ? "admin" : "superadmin"}/test-schedules/${schedule.id}`,
                                  );
                                } else {
                                  handleUpdateStatus(schedule.id, action.value);
                                }
                              }}
                            >
                              <action.icon
                                className={`w-4 h-4 mr-2 ${action.color}`}
                              />
                              <span>{action.label}</span>
                            </DropdownMenuItem>
                          ))}

                          {/* SuperAdmin Manual Refund Option */}
                          {user?.role === "SUPERADMIN" && (
                            <>
                              <DropdownMenuSeparator />
                              {schedule.refundProcessedAt ? (
                                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                  <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                  <span>Refunded ({formatDateTime(schedule.refundProcessedAt)})</span>
                                </DropdownMenuItem>
                              ) : new Date(schedule.endTime) <= new Date() ? (
                                <DropdownMenuItem
                                  onClick={() => setRefundModalSchedule(schedule)}
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium cursor-pointer"
                                >
                                  <RotateCcw className="w-4 h-4 mr-2 text-amber-600" />
                                  <span>Trigger No-Show Refund</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                  <span>Refund Eligible After End Time</span>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
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
                onValueChange={(v) => {
                  const selectedTest = tests.find((t) => t.id === v);
                  setFormData((prev) => ({
                    ...prev,
                    testId: v,
                    organisationId: selectedTest?.organisationId || prev.organisationId,
                  }));
                }}
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

      {/* Confirmation Dialog for Triggering Refund */}
      <AlertDialog
        open={!!refundModalSchedule}
        onOpenChange={(open) => !open && setRefundModalSchedule(null)}
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
                  <div><strong className="text-slate-800">Test:</strong> {refundModalSchedule?.test?.title || "Test Schedule"}</div>
                  <div><strong className="text-slate-800">Organisation:</strong> {refundModalSchedule?.organisationName}</div>
                  <div><strong className="text-slate-800">Schedule Ended:</strong> {refundModalSchedule ? formatDateTime(refundModalSchedule.endTime) : ""}</div>
                  <div><strong className="text-slate-800">Total Invited:</strong> {refundModalSchedule?.invitedCount || 0} candidate(s)</div>
                </div>
                <p className="text-xs text-muted-foreground block">
                  This will immediately sweep all unstarted (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">PENDING</code>) candidate invitations, mark them as <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">EXPIRED</code>, and credit 1 PIN per no-show candidate back to the organisation's PIN balance.
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
