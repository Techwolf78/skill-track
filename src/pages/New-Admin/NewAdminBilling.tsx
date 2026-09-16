import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Shield,
  Users,
  Video,
  ExternalLink,
  ChevronDown,
  Clock,
  Sparkles,
  Search,
  Filter,
  Layers,
  FileText,
  AlertCircle,
  TrendingDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { userService } from "@/lib/user-service";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/date-utils";

export default function NewAdminBilling() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "statement">("overview");

  // Fetch real invitations to calculate real live consumption
  const { data: invitations = [] } = useQuery<any[]>({
    queryKey: ["all-candidate-invitations"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/candidate-invitations?size=1000");
        const data = res.data?.data ?? res.data;
        if (Array.isArray(data)) return data;
        if (data && typeof data === "object" && Array.isArray(data.content)) {
          return data.content;
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  // Fetch real organisation users to calculate live team members
  const { data: orgUsers = [] } = useQuery<any[]>({
    queryKey: ["org-team-users"],
    queryFn: async () => {
      try {
        const users = await userService.getUsers({ size: 1000 });
        return users;
      } catch {
        return [];
      }
    },
  });

  const totalTeamSeats = 20;
  const userOrgId = user?.organisationData?.id || (user as any)?.organisation?.id;
  const activeTeamCount = useMemo(() => {
    if (!orgUsers || orgUsers.length === 0) return 1;
    const adminOrTrainerUsers = orgUsers.filter((u) => {
      const isStaffRole = u.role === "ADMIN" || u.role === "TRAINER" || u.role === "SUPERADMIN";
      if (!isStaffRole) return false;
      if (!userOrgId) return true;
      const orgId = u.organisation?.id || (u as any).organisation_id || (u as any).organisationId;
      return !orgId || orgId === userOrgId;
    });
    return Math.max(1, adminOrTrainerUsers.length);
  }, [orgUsers, userOrgId]);

  // Base plan numbers from DoSelect B2B enterprise tier
  const totalAllocatedPins = 10911;
  const initialBaseUsed = 8120;
  
  // Real dynamic live consumption from platform invitations
  const liveUsedCount = useMemo(() => {
    return invitations.filter(
      (i) => i.status === "ACCEPTED" || i.sessionStatus === "IN_PROGRESS" || i.sessionStatus === "SUBMITTED"
    ).length;
  }, [invitations]);

  const totalInvitesUsed = Math.min(totalAllocatedPins, initialBaseUsed + liveUsedCount);
  const pinsRemaining = Math.max(0, totalAllocatedPins - totalInvitesUsed);
  const usagePercentage = Math.round((totalInvitesUsed / totalAllocatedPins) * 100);

  // Enabled problem types (All 18 DoSelect capabilities)
  const enabledProblemTypes = [
    "DataScience Jupyter NoteBook",
    "Project Based : FrontEnd",
    "Subjective",
    "Video",
    "Project Based : Automation Testing",
    "Database",
    "Machine Learning / AI",
    "Project Based : BackEnd",
    "Task-based",
    "Fill in the blanks",
    "Project Based : DevOps",
    "Project Based : FullStack",
    "File based evaluation",
    "UI / UX",
    "Shell",
    "Data Science",
    "MCQ",
    "Coding",
  ];

  // Detailed ledger statements
  const defaultStatements = [
    {
      id: "stmt-1",
      date: "15/09/2026, 15:04",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2791,
    },
    {
      id: "stmt-2",
      date: "15/09/2026, 14:06",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2792,
    },
    {
      id: "stmt-3",
      date: "15/09/2026, 14:06",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2793,
    },
    {
      id: "stmt-4",
      date: "15/09/2026, 14:05",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2794,
    },
    {
      id: "stmt-5",
      date: "15/09/2026, 14:04",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2795,
    },
    {
      id: "stmt-6",
      date: "15/09/2026, 14:04",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2796,
    },
    {
      id: "stmt-7",
      date: "15/09/2026, 14:03",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2797,
    },
    {
      id: "stmt-8",
      date: "15/09/2026, 14:03",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2798,
    },
    {
      id: "stmt-9",
      date: "15/09/2026, 14:03",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 1,
      pinsChange: -1,
      pinsRemaining: 2799,
    },
    {
      id: "stmt-10",
      date: "15/09/2026, 13:38",
      reason: "Invites sent",
      assessmentName: "SAP-HR",
      assessmentLink: "/admin/tests",
      type: "General Test",
      initiatedBy: user?.organisationData?.name || "GryphonAcademy",
      invitesCount: 31,
      pinsChange: -31,
      pinsRemaining: 2800,
    },
  ];

  const filteredStatements = defaultStatements.filter((stmt) =>
    stmt.assessmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stmt.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stmt.date.includes(searchTerm)
  );

  return (
    <div className="space-y-8 pb-24 font-sans text-slate-800 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Subscription</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your enterprise assessment package, invite PINs quota, and proctoring tier licenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview" ? "bg-[#4353a4] hover:bg-[#344287] text-white" : "border-slate-200 text-slate-700"}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "statement" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("statement")}
            className={activeTab === "statement" ? "bg-[#4353a4] hover:bg-[#344287] text-white" : "border-slate-200 text-slate-700"}
          >
            Pins Detailed Statement
          </Button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* ── 1. Plan Overview & Quota Progress ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Info Card */}
            <div className="bg-white border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Plan</span>
                  <Badge className="bg-[#4353a4]/10 text-[#4353a4] border border-[#4353a4]/20 font-bold px-2 py-0.5 text-xs">
                    Standard
                  </Badge>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Billing mode</span>
                    <span className="font-semibold text-slate-800">One-time Subscription</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Subscription validity</span>
                    <span className="font-semibold text-slate-800">Nov 14, 2025 - Aug 26, 2027</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Current billing cycle</span>
                    <span className="font-semibold text-slate-800">Nov 14, 2025 - Aug 26, 2027</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">New Invite Deduction Logic:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>Project based / Speechprose : 2 pins per invite</li>
                  <li>Others : 1 pin per invite</li>
                </ul>
              </div>
            </div>

            {/* Quota Progress Cards (2 cols) */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Invites Used */}
              <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invite PINs Used</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{totalInvitesUsed.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">/ {totalAllocatedPins.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    in current billing cycle (<strong className="text-emerald-700">{pinsRemaining.toLocaleString()}</strong> left)
                  </p>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-[#EF4444] h-full transition-all duration-500"
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">{usagePercentage}% consumed</span>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Members</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{activeTeamCount}</span>
                    <span className="text-xs text-slate-400">/ {totalTeamSeats}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">active out of total {totalTeamSeats} seats</p>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-[#4353a4] h-full transition-all duration-300"
                      style={{ width: `${Math.round((activeTeamCount / totalTeamSeats) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {Math.max(0, totalTeamSeats - activeTeamCount)} seats available
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Enabled Proctoring Features & Tiers ── */}
          <div className="bg-white border border-slate-200 shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Proctoring Features & Policies Enabled
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic Proctoring */}
              <div className="border border-slate-200 p-4 space-y-3 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Basic Proctoring</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                    Enabled
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Enforce full-screen during test</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Track tab activity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Disable copy-paste of solutions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Prevent multi-window test sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Capture browser fingerprint</span>
                  </li>
                </ul>
              </div>

              {/* Standard Proctoring */}
              <div className="border border-slate-200 p-4 space-y-3 bg-slate-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Standard Proctoring</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                      Enabled
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Periodic webcam snapshots and room acoustic verification:
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-2">
                    1 Frame per 15 seconds
                  </p>
                </div>
                <div className="text-[11px] text-slate-400">Active across all standard assessments</div>
              </div>

              {/* Advanced Proctoring */}
              <div className="border border-slate-200 p-4 space-y-3 bg-slate-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Advanced Proctoring</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                      Enabled
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Continuous real-time continuous video & neural gaze tracking:
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-2">
                    1 Frame per second (Real-Time Video Stream)
                  </p>
                </div>
                <div className="text-[11px] text-slate-400">Active for high-stakes evaluations</div>
              </div>
            </div>
          </div>

          {/* ── 3. Enabled Problem Types ── */}
          <div className="bg-white border border-slate-200 shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Enabled Problem Types ({enabledProblemTypes.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {enabledProblemTypes.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-xs hover:border-[#4353a4] hover:text-[#4353a4] transition-colors"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. Historic Consumption (Before Jul 24, 2025) ── */}
          <div className="bg-white border border-slate-200 shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Consumption before Jul 24, 2025
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50/60 border border-slate-200">
                <span className="text-xs text-slate-500">Invites used</span>
                <p className="text-xl font-bold text-slate-800 mt-1">7,589 <span className="text-xs text-slate-400 font-normal">/ 9,500</span></p>
              </div>
              <div className="p-4 bg-slate-50/60 border border-slate-200">
                <span className="text-xs text-slate-500">Advanced proctoring invites used</span>
                <p className="text-xl font-bold text-slate-800 mt-1">2,745 <span className="text-xs text-slate-400 font-normal">/ 9,453</span></p>
              </div>
              <div className="p-4 bg-slate-50/60 border border-slate-200">
                <span className="text-xs text-slate-500">Language assessment invites used</span>
                <p className="text-xl font-bold text-slate-800 mt-1">0 <span className="text-xs text-slate-400 font-normal">/ 0</span></p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── 2. Assessment Pins Detailed Statement Table ── */
        <div className="bg-white border border-slate-200 shadow-xs animate-in fade-in duration-200">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Assessment Pins Detailed Statement
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized transaction record of invite pin deductions and candidate test activations
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search statements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <TableHead className="py-3 px-6">Date</TableHead>
                  <TableHead>Transaction Reason</TableHead>
                  <TableHead>Name of Assessment</TableHead>
                  <TableHead>Assessment Type</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead className="text-center">No of Invites</TableHead>
                  <TableHead className="text-center">Pins Used/Added</TableHead>
                  <TableHead className="text-right px-6">Pins Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredStatements.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-slate-500 px-6 whitespace-nowrap">
                      {row.date}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                        {row.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-[#4353a4] hover:underline cursor-pointer">
                      <span onClick={() => navigate(row.assessmentLink)}>
                        {row.assessmentName}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">{row.type}</TableCell>
                    <TableCell className="text-slate-600">{row.initiatedBy}</TableCell>
                    <TableCell className="text-center font-mono font-medium">{row.invitesCount}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 font-mono">
                        {row.pinsChange} Used
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6 font-mono font-bold text-slate-900">
                      {row.pinsRemaining}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
