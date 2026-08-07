import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Eye, ShieldCheck, ChevronRight, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { testService, TestScheduleExtended, Test } from "@/lib/test-service";
import { apiClient } from "@/lib/api-client";
import { organisationService, OrganisationResponse } from "@/lib/organisation-service";

interface MappedSchedule extends TestScheduleExtended {
  resolvedTestTitle: string;
  resolvedOrgName: string;
  invitedCount: number;
  completedCount: number;
  proctoringMode?: string;
  batchName?: string;
  batch?: string;
}

export function RecentTestsTable() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");
  const [schedules, setSchedules] = useState<MappedSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompleteScheduleData() {
      try {
        setLoading(true);
        const schedulesData = await testService.getAllTestSchedules().catch((err) => {
          console.error("Failed to fetch schedules:", err);
          return [] as TestScheduleExtended[];
        });

        const testsData = await testService.getAllTests().catch(() => [] as Test[]);
        const orgsData = await organisationService.getOrganisations().catch(() => [] as OrganisationResponse[]);

        // Fetch candidate invitations safely
        let invitations: Array<{ testScheduleId?: string; scheduleId?: string; status?: string }> = [];
        try {
          const res = await apiClient.get("/candidate-invitations?size=1000");
          const data = res.data?.data || res.data;
          if (Array.isArray(data)) {
            invitations = data;
          } else if (data && typeof data === "object" && "content" in data && Array.isArray((data as Record<string, unknown>).content)) {
            invitations = (data as Record<string, unknown>).content as typeof invitations;
          }
        } catch {
          invitations = [];
        }

        const orgMap = new Map<string, string>();
        if (Array.isArray(orgsData)) {
          orgsData.forEach((org) => orgMap.set(org.id, org.name));
        }

        const testMap = new Map<string, Test>();
        if (Array.isArray(testsData)) {
          testsData.forEach((t) => testMap.set(t.id, t));
        }

        const safeSchedulesData = Array.isArray(schedulesData) ? schedulesData : [];

        const mapped: MappedSchedule[] = safeSchedulesData.map((sch) => {
          const schAny = sch as unknown as Record<string, unknown>;
          const test = testMap.get(sch.testId);
          const resolvedTestTitle = test?.title || (schAny.testTitle as string) || (schAny.title as string) || "React Test";

          let resolvedOrgName = "Gryphon Academy";
          if (test?.organisationId && orgMap.has(test.organisationId)) {
            resolvedOrgName = orgMap.get(test.organisationId)!;
          } else if (schAny.organisationId && orgMap.has(schAny.organisationId as string)) {
            resolvedOrgName = orgMap.get(schAny.organisationId as string)!;
          }

          const schInvs = invitations.filter(
            (inv) => inv.testScheduleId === sch.id || inv.scheduleId === sch.id
          );
          const invitedCount = schInvs.length || (schAny.totalInvitations as number) || 1;
          const completedCount = schInvs.filter((inv) => inv.status === "ACCEPTED" || inv.status === "SUBMITTED").length || (schAny.completedInvitations as number) || 0;

          return {
            ...sch,
            resolvedTestTitle,
            resolvedOrgName,
            invitedCount,
            completedCount,
          };
        });

        setSchedules(mapped);
      } catch (err) {
        console.error("Failed to load full schedule table data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompleteScheduleData();
  }, []);

  const filteredSchedules = schedules.filter((sch) => {
    const status = String(sch.status || "").toUpperCase();
    if (filter === "ACTIVE") return status === "LIVE" || status === "SCHEDULED" || status === "ACTIVE";
    if (filter === "COMPLETED") return status === "COMPLETED" || status === "EXPIRED";
    return true;
  });

  return (
    <div className="space-y-3 font-sans">
      {/* Table Filter Tabs Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-muted/60 border border-border rounded-lg p-0.5 text-xs font-mono">
          {(["ALL", "ACTIVE", "COMPLETED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-md transition-all font-semibold ${
                filter === tab
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/superadmin/test-schedules")}
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          VIEW ALL SCHEDULES <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Modern High-Density Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card text-xs">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="font-mono text-xs">Loading live schedule data...</span>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-sans">
            No schedules found matching filter <strong className="text-foreground font-mono">{filter}</strong>.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground uppercase font-mono text-[10px] tracking-wider py-2.5">TEST / SCHEDULE</TableHead>
                <TableHead className="text-muted-foreground uppercase font-mono text-[10px] tracking-wider">TYPE</TableHead>
                <TableHead className="text-muted-foreground uppercase font-mono text-[10px] tracking-wider">ORGANISATION / BATCH</TableHead>
                <TableHead className="text-muted-foreground uppercase font-mono text-[10px] tracking-wider">STATUS</TableHead>
                <TableHead className="text-muted-foreground uppercase font-mono text-[10px] tracking-wider text-center">INVITATION PROGRESS</TableHead>
                <TableHead className="text-muted-foreground uppercase font-mono text-[10px] tracking-wider text-right pr-4">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {filteredSchedules.map((sch) => {
                const totalInvited = sch.invitedCount;
                const completedCount = sch.completedCount;
                const progressPct = totalInvited > 0 ? Math.round((completedCount / totalInvited) * 100) : 0;
                const schStatus = String(sch.status || "").toUpperCase();

                return (
                  <TableRow key={sch.id} className="hover:bg-muted/30 border-border/60 transition-colors">
                    <TableCell className="font-medium text-foreground py-3">
                      <div className="flex flex-col">
                        <span className="text-foreground font-semibold text-xs">{sch.resolvedTestTitle}</span>
                        <span className="text-muted-foreground text-[10px] font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          {sch.startTime ? new Date(sch.startTime).toLocaleDateString() : "Scheduled"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground font-mono text-[10px]">
                        {sch.proctoringMode || "PROCTORED"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col font-sans">
                        <span className="text-foreground text-xs font-semibold">{sch.resolvedOrgName}</span>
                        <span className="text-muted-foreground text-[10px] font-mono">{sch.batchName || sch.batch || "All Candidates"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {schStatus === "COMPLETED" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-medium inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> COMPLETED
                        </span>
                      )}
                      {(schStatus === "LIVE" || schStatus === "ACTIVE" || !sch.status) && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-medium inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE ACTIVE
                        </span>
                      )}
                      {(schStatus === "SCHEDULED" || schStatus === "UPCOMING") && (
                        <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-mono font-medium">
                          SCHEDULED
                        </span>
                      )}
                      {schStatus === "EXPIRED" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-medium">
                          EXPIRED
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="w-[160px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-foreground font-medium">{completedCount} / {totalInvited}</span>
                          <span className="text-muted-foreground">{progressPct}%</span>
                        </div>
                        <Progress value={progressPct} className="h-1.5 bg-muted border border-border/40" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/superadmin/test-schedules/${sch.id}`)}
                        className="h-7 border-border bg-background hover:bg-muted text-foreground font-mono text-[10px] transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                        VIEW
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}