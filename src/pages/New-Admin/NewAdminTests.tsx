import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  Users,
  User,
  UserPlus,
  BarChart2,
  MoreVertical,
  CheckCircle2,
  Plus,
  Loader2,
  Search,
  ExternalLink,
  Edit,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTestsQuery } from "@/hooks/use-query-hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NewAdminTests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: tests = [], isLoading } = useTestsQuery();

  const filteredTests = useMemo(() => {
    return tests.filter((t) =>
      t.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [tests, search]);

  const formatDuration = (mins?: number) => {
    if (!mins || mins <= 0) return "60 mins";
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0 && remainingMins > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMins} mins`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${mins} mins`;
  };

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">All Assessments</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage, invite candidates, and configure test blueprints.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search assessments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            </div>
            <button
              onClick={() => navigate("/admin/tests/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-md shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tests Table / List */}
      <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center items-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Loading assessments...
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-3">
            <p>No assessments found.</p>
            <button
              onClick={() => navigate("/admin/tests/create")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Test</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTests.map((test) => {
              const questionCount =
                test.questions?.length || test.testQuestions?.length || 0;
              const orgName =
                test.organisation?.name ||
                user?.organisationData?.name ||
                "GryphonAcademy";

              return (
                <div
                  key={test.id}
                  className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/admin/tests/${test.id}`)}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm md:text-base group-hover:text-blue-600 transition-colors truncate">
                        {test.title}
                      </h3>
                      {test.status === "PUBLISHED" || test.isActive !== false ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50 shrink-0" />
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          {test.status || "DRAFT"}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{questionCount} {questionCount === 1 ? "problem" : "problems"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDuration(test.durationMins)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {test.testSchedules?.length
                            ? `${test.testSchedules.length} schedules`
                            : "0 candidates"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{orgName}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1 self-end md:self-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      title="Invite Candidates"
                      onClick={() => navigate("/admin/invitations")}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      title="View Test Details / Analytics"
                      onClick={() => navigate(`/admin/tests/${test.id}`)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          title="More Options"
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-lg rounded-md p-1 text-xs">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/tests/${test.id}`)}
                          className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-md"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/tests/edit/${test.id}`)}
                          className="cursor-pointer py-2 px-2.5 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-md"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Assessment</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        title="Create New Test"
        onClick={() => navigate("/admin/tests/create")}
        className="fixed bottom-8 right-8 w-12 h-12 rounded-md bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 z-40"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
