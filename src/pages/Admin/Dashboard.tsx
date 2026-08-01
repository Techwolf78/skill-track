import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Loader2, RefreshCw, ArrowRight, Clock, CheckCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { userService } from "@/lib/user-service";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { auditLogService, AuditLog } from "@/lib/audit-log-service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTestsQuery } from "@/hooks/use-query-hooks";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = user?.organisationData?.id;

    if (!orgId) {
      console.error("Error: Your account is not associated with any organization.");
      return;
    }

    if (!formData.name || !formData.email) {
      console.error("Validation Error: Full Name and Email are required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.createUser(
        {
          name: formData.name,
          email: formData.email,
          password: formData.password || "Temp@123", // default temp password
          phoneNumber: formData.phoneNumber,
          organisation_id: orgId,
        },
        "ADMIN", // role is always ADMIN on the admin side
      );

      toast({
        title: "User Created",
        description: `${formData.name} has been added as an Admin successfully.`,
      });

      setIsAddUserOpen(false);
      setFormData({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
      });
    } catch (error: unknown) {
      let errorMessage = "Failed to create user.";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      console.error("Failed to create user:", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of your recent assessments and candidate performances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-md"
            onClick={() => setIsAddUserOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
          <Button
            variant="hero"
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 group h-11 rounded-md"
            onClick={() => navigate("/admin/tests")}
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Create Test
          </Button>
        </div>
      </div>

      {/* Top 3 Recent Assessments */}
      <RecentAssessmentsCard />

      {/* DoSelect-Style Activity Feed */}
      <ActivityFeedCard />

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new administrator account for your organization.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Temporary Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Temp@123"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="hero"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Recent Assessments Component
 * Displays top 3 latest created assessments with quick access to edit/view details.
 */
function RecentAssessmentsCard() {
  const navigate = useNavigate();
  const { data: tests = [], isLoading } = useTestsQuery();

  // Get top 3 latest created tests
  const recentTests = useMemo(() => {
    return [...tests]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [tests]);

  return (
    <div className="border border-slate-200 rounded-md bg-white shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Recent Assessments
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick access to your most recently created test evaluations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/tests")}
          className="text-xs h-8 border-slate-200 text-slate-600 hover:text-slate-900"
        >
          View All Tests
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center items-center text-slate-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading recent assessments...
        </div>
      ) : recentTests.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">
          No assessments created yet. Click <strong>Create Test</strong> to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentTests.map((test) => (
            <div
              key={test.id}
              onClick={() => navigate(`/admin/tests/${test.id}`)}
              className="p-4 border border-slate-200 rounded-md bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                    {test.title}
                  </h4>
                  <Badge
                    variant={test.status === "ACTIVE" ? "default" : "secondary"}
                    className="text-[10px] px-2 py-0.5 shrink-0"
                  >
                    {test.status === "ACTIVE" ? "Active" : test.status === "DRAFT" ? "Draft" : "Updated"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                  {test.description || "No description provided."}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {test.durationMinutes || 60} mins
                  </span>
                </div>
                <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * DoSelect-Style Activity Feed Component
 * Renders real backend audit logs for Admin operations in natural humanized sentences.
 */
function ActivityFeedCard() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await auditLogService.getAuditLogs({ size: 50 });
      const rawContent = response.content || [];
      
      // Filter OUT candidate test submission / result calculation events
      const adminLogs = rawContent.filter((log) => {
        const details = (log.details || "").toLowerCase();
        const action = (log.action || "").toLowerCase();
        
        // Exclude candidate-driven test submissions & calculations
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
      }).slice(0, 10);

      setLogs(adminLogs);
    } catch (err: unknown) {
      console.warn("Could not fetch real audit logs, falling back gracefully:", err);
      setError("Unable to load activity feed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="border border-slate-200 rounded-md bg-white shadow-sm overflow-hidden">
      {/* Feed Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700">Activity feed</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLogs}
          disabled={isLoading}
          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Feed Content */}
      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 flex justify-center items-center text-slate-400 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading activities...
          </div>
        ) : error || logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No recent admin activity recorded yet.
          </div>
        ) : (
          logs.map((log) => (
            <ActivityFeedItem key={log.id} log={log} currentUserEmail={user?.email} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityFeedItem({ log }: { log: AuditLog; currentUserEmail?: string }) {
  // Always address the active Admin as "You"
  const actorName = "You";
  
  // Format relative time (e.g., "4 days ago", "2 hours ago")
  let timeAgo = "recently";
  try {
    if (log.timestamp) {
      timeAgo = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });
    }
  } catch (e) {
    // Fallback if parsing fails
  }

  const { prefix, highlighted, textAfter, entityName } = parseDoSelectSentence(log, actorName);

  return (
    <div className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
      <Avatar className="w-8 h-8 mt-0.5 border border-amber-200 bg-amber-50 text-amber-700 font-bold text-xs shrink-0">
        <AvatarFallback className="bg-amber-500 text-white font-semibold">
          Y
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 text-sm text-slate-600 leading-snug">
        <p>
          <span className="text-slate-800">{prefix} </span>
          {highlighted && <span className="font-semibold text-slate-900">{highlighted} </span>}
          {textAfter && <span className="text-slate-800">{textAfter} </span>}
          {entityName && <span className="font-bold text-slate-900">{entityName}</span>}
          .
        </p>
        <span className="text-xs text-slate-400 block mt-0.5">{timeAgo}</span>
      </div>
    </div>
  );
}

/**
 * Format audit log entries into DoSelect natural language sentences starting with "You".
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

  // 1. Candidate Invitations / Test Invites
  if (details.toLowerCase().includes("invited") || details.toLowerCase().includes("candidate")) {
    const emailMatches = details.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const testTitle = afterObj.testTitle || afterObj.title || beforeObj.testTitle || "the test";
    
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
  if (details.toLowerCase().includes("added") && details.toLowerCase().includes("problem")) {
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

  if (action === "DELETE" && (details.toLowerCase().includes("problem") || details.toLowerCase().includes("question"))) {
    const questionName = afterObj.title || beforeObj.title || afterObj.name || beforeObj.name || "the problem";
    const testTitle = afterObj.testTitle || beforeObj.testTitle || "the test";
    return {
      prefix: `${actorName} removed the problem`,
      highlighted: questionName,
      textAfter: "from the test",
      entityName: testTitle,
    };
  }

  // 3. Test Duration / Configuration Updates
  if (action === "UPDATE" && (details.toLowerCase().includes("duration") || afterObj.durationMinutes)) {
    const testTitle = afterObj.title || beforeObj.title || "the test";
    const duration = afterObj.durationMinutes || afterObj.timeLimit || "updated";
    return {
      prefix: `${actorName} updated the duration of the test`,
      highlighted: testTitle,
      textAfter: `to ${duration} minutes`,
      entityName: "",
    };
  }

  // 4. Question Creation
  if (action === "CREATE" && (details.toLowerCase().includes("question") || log.afterSnapshot?.includes("prompt"))) {
    const qTitle = afterObj.title || afterObj.prompt?.slice(0, 30) || "New Question";
    return {
      prefix: `${actorName} created the question`,
      highlighted: qTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 5. User / Admin creation
  if (action === "CREATE" && (details.toLowerCase().includes("user") || details.toLowerCase().includes("admin"))) {
    const userName = afterObj.name || afterObj.email || "a new user";
    return {
      prefix: `${actorName} created user account`,
      highlighted: userName,
      textAfter: "",
      entityName: "",
    };
  }

  // 6. Test Creation / Modification
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
  if (action.includes("DEACTIVATE") || details.toLowerCase().includes("deactivate")) {
    const testTitle = afterObj.title || beforeObj.title || extractTestTitleFromDetails(details);
    return {
      prefix: `${actorName} deactivated the test`,
      highlighted: testTitle,
      textAfter: "",
      entityName: "",
    };
  }

  if (action.includes("ACTIVATE") || details.toLowerCase().includes("activate")) {
    const testTitle = afterObj.title || beforeObj.title || extractTestTitleFromDetails(details);
    return {
      prefix: `${actorName} activated the test`,
      highlighted: testTitle,
      textAfter: "",
      entityName: "",
    };
  }

  // 8. Dynamic sentence formatter for any other Admin action
  // Replace technical HTTP verb 'patch' with user-friendly 'updated'
  const rawAction = action.toLowerCase();
  const actionFormatted = rawAction === "patch" ? "updated" : rawAction;
  
  let cleanDetails = details
    .replace(/^(Performed|Executed)\s+/i, "")
    .replace(/\(ID:[^)]+\)/gi, "")
    .replace(/^patch\s+/i, "updated ")
    .trim();
  
  // Deduplicate if cleanDetails starts with actionFormatted or rawAction
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
