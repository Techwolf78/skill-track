import React, { useEffect, useState, useMemo } from "react";
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
  RefreshCw,
  ExternalLink,
  Edit,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTestsQuery } from "@/hooks/use-query-hooks";
import { auditLogService, AuditLog } from "@/lib/audit-log-service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export default function NewAdminHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Fetch Real Tests from Backend
  const { data: tests = [], isLoading: isLoadingTests } = useTestsQuery();

  // Top recent tests sorted by creation date descending
  const recentTests = useMemo(() => {
    return [...tests]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [tests]);

  // 2. Fetch Real Activity Feed (Audit Logs) from Backend
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const response = await auditLogService.getAuditLogs({ size: 50 });
      const rawContent = response.content || [];

      // Filter out raw submission/calculation events, keep admin operational activities
      const adminLogs = rawContent
        .filter((log) => {
          const details = (log.details || "").toLowerCase();
          const action = (log.action || "").toLowerCase();
          if (
            details.includes("testsession") ||
            details.includes("submission") ||
            details.includes("testresult") ||
            action === "submit" ||
            action === "calculate"
          ) {
            return false;
          }
          return true;
        })
        .slice(0, 10);

      setLogs(adminLogs);
    } catch (err: unknown) {
      console.warn("Could not fetch real audit logs:", err);
      setLogsError("Unable to load activity feed");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Format Duration string
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
    <div className="space-y-6 pb-20 relative">
      {/* 1. RECENT TESTS SECTION (Real Backend Tests) */}
      <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">
            Recent tests
          </h2>
          <button
            onClick={() => navigate("/new-admin/tests")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            All tests
          </button>
        </div>

        {/* Tests List Content */}
        {isLoadingTests ? (
          <div className="py-12 flex justify-center items-center text-slate-400 gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Loading recent assessments...
          </div>
        ) : recentTests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm space-y-3">
            <p>No assessments found in this organization.</p>
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
            {recentTests.map((test) => {
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
                  {/* Test Info */}
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

                    {/* Metadata Badges Row */}
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

                  {/* Actions */}
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

      {/* 2. ACTIVITY FEED SECTION (Real Backend Audit Logs) */}
      <div className="bg-white rounded-md border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Activity feed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live operational audit log of administrative activities and events.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="h-8 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${
                isLoadingLogs ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Feed List */}
        <div className="divide-y divide-slate-100">
          {isLoadingLogs ? (
            <div className="py-12 flex justify-center items-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Loading real activities...
            </div>
          ) : logsError || logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No recent admin activity recorded yet.
            </div>
          ) : (
            logs.map((log) => (
              <ActivityFeedItem key={log.id} log={log} />
            ))
          )}
        </div>
      </div>

      {/* 3. FLOATING ACTION BUTTON (FAB) */}
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

/**
 * Real Activity Feed Item Component
 */
function ActivityFeedItem({ log }: { log: AuditLog }) {
  const actorName = "You";

  let timeAgo = "recently";
  try {
    if (log.timestamp) {
      timeAgo = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });
    }
  } catch (e) {}

  const { prefix, highlighted, textAfter, entityName } = parseDoSelectSentence(
    log,
    actorName
  );

  return (
    <div className="px-6 py-3.5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
      <Avatar className="w-8 h-8 mt-0.5 border border-amber-200 bg-amber-50 text-amber-700 font-bold text-xs shrink-0 rounded-md">
        <AvatarFallback className="bg-amber-500 text-white font-semibold rounded-md">
          Y
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 text-sm text-slate-600 leading-snug">
        <p>
          <span className="text-slate-800">{prefix} </span>
          {highlighted && (
            <span className="font-semibold text-slate-900">{highlighted} </span>
          )}
          {textAfter && <span className="text-slate-800">{textAfter} </span>}
          {entityName && (
            <span className="font-bold text-slate-900">{entityName}</span>
          )}
          .
        </p>
        <span className="text-xs text-slate-400 block mt-1">{timeAgo}</span>
      </div>
    </div>
  );
}

/**
 * Natural language parser for Backend Audit Logs
 */
function parseDoSelectSentence(log: AuditLog, actorName: string = "You") {
  const action = (log.action || "").toUpperCase();
  const details = log.details || "";

  let afterObj: Record<string, any> = {};
  if (log.afterSnapshot) {
    try {
      afterObj = JSON.parse(log.afterSnapshot);
    } catch (e) {}
  }

  let beforeObj: Record<string, any> = {};
  if (log.beforeSnapshot) {
    try {
      beforeObj = JSON.parse(log.beforeSnapshot);
    } catch (e) {}
  }

  // 1. Candidate Invitations
  if (
    details.toLowerCase().includes("invited") ||
    details.toLowerCase().includes("candidate")
  ) {
    const emailMatches =
      details.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const testTitle =
      afterObj.testTitle || afterObj.title || beforeObj.testTitle || "the test";

    if (emailMatches.length > 0) {
      const primaryEmail = emailMatches[0];
      const restCount = emailMatches.length - 1;
      const extraText = restCount > 0 ? `and ${restCount} others ` : "";

      return {
        prefix: `${actorName} invited`,
        highlighted: `${primaryEmail} ${extraText}`,
        textAfter: "to take the test",
        entityName: testTitle,
      };
    }
  }

  // 2. Question / Problem updates to Test
  if (
    details.toLowerCase().includes("added") &&
    details.toLowerCase().includes("problem")
  ) {
    const numMatch = details.match(/\d+/);
    const count = numMatch ? numMatch[0] : "1";
    const testTitle = afterObj.testTitle || afterObj.title || "the test";
    return {
      prefix: `${actorName} added`,
      highlighted: `${count} problems`,
      textAfter: "to the test",
      entityName: testTitle,
    };
  }

  if (
    action === "DELETE" &&
    (details.toLowerCase().includes("problem") ||
      details.toLowerCase().includes("question"))
  ) {
    const questionName =
      afterObj.title ||
      beforeObj.title ||
      afterObj.name ||
      beforeObj.name ||
      "the problem";
    const testTitle = afterObj.testTitle || beforeObj.testTitle || "the test";
    return {
      prefix: `${actorName} removed the problem`,
      highlighted: questionName,
      textAfter: "from the test",
      entityName: testTitle,
    };
  }

  // 3. Test Duration / Configuration Updates
  if (
    action === "UPDATE" &&
    (details.toLowerCase().includes("duration") || afterObj.durationMinutes)
  ) {
    const testTitle = afterObj.title || beforeObj.title || "the test";
    const duration =
      afterObj.durationMinutes || afterObj.timeLimit || "updated";
    return {
      prefix: `${actorName} updated the duration of the test`,
      highlighted: testTitle,
      textAfter: `to ${duration} minutes`,
      entityName: "",
    };
  }

  // 4. Question Creation
  if (
    action === "CREATE" &&
    (details.toLowerCase().includes("question") ||
      log.afterSnapshot?.includes("prompt"))
  ) {
    const qTitle =
      afterObj.title || afterObj.prompt?.slice(0, 30) || "New Question";
    return {
      prefix: `${actorName} created the question`,
      highlighted: qTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 5. User / Admin creation
  if (
    action === "CREATE" &&
    (details.toLowerCase().includes("user") ||
      details.toLowerCase().includes("admin"))
  ) {
    const userName = afterObj.name || afterObj.email || "a new user";
    return {
      prefix: `${actorName} created user account`,
      highlighted: userName,
      textAfter: "",
      entityName: "",
    };
  }

  // 6. Test Creation
  if (action === "CREATE" && details.toLowerCase().includes("test")) {
    const tTitle = afterObj.title || afterObj.name || "a new test";
    return {
      prefix: `${actorName} created the test`,
      highlighted: tTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 7. Test Activation / Deactivation
  if (
    action.includes("DEACTIVATE") ||
    details.toLowerCase().includes("deactivate")
  ) {
    const testTitle =
      afterObj.title || beforeObj.title || extractTestTitleFromDetails(details);
    return {
      prefix: `${actorName} deactivated the test`,
      highlighted: testTitle,
      textAfter: "",
      entityName: "",
    };
  }

  if (
    action.includes("ACTIVATE") ||
    details.toLowerCase().includes("activate")
  ) {
    const testTitle =
      afterObj.title || beforeObj.title || extractTestTitleFromDetails(details);
    return {
      prefix: `${actorName} activated the test`,
      highlighted: testTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 8. General fallback
  const rawAction = action.toLowerCase();
  const actionFormatted = rawAction === "patch" ? "updated" : rawAction;

  let cleanDetails = details
    .replace(/^(Performed|Executed)\s+/i, "")
    .replace(/\(ID:[^)]+\)/gi, "")
    .replace(/^patch\s+/i, "updated ")
    .trim();

  if (cleanDetails.toLowerCase().startsWith(actionFormatted)) {
    cleanDetails = cleanDetails.slice(actionFormatted.length).trim();
  } else if (cleanDetails.toLowerCase().startsWith(rawAction)) {
    cleanDetails = cleanDetails.slice(rawAction.length).trim();
  }

  return {
    prefix: `${actorName} ${actionFormatted} ${cleanDetails}`,
    highlighted: "",
    textAfter: "",
    entityName: "",
  };
}

function extractTestTitleFromDetails(details: string): string {
  const match = details.match(/Test\s+["']?([^"']+)["']?/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return "the test";
}
