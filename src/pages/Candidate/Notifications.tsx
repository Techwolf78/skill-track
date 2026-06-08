import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Mail,
  Trophy,
  Info,
  CheckCheck,
  Trash2,
  Calendar,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { candidateService } from "@/lib/candidate-service";
import { testService, TestSession, TestResult, Test } from "@/lib/test-service";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "invite" | "result" | "system";
  read: boolean;
  actionLink: string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const userId: string = storedUser?.id || "";

  const buildNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const candidate = await candidateService.getCandidateByUserId(userId);
      if (!candidate) return;

      const [allSessions, allTests] = await Promise.all([
        testService.getAllSessions(),
        testService.getAllTests(),
      ]);

      const mySessions = allSessions.filter((s) => s.candidateId === candidate.id);
      const notifs: Notification[] = [];

      await Promise.all(
        mySessions.map(async (session) => {
          const test = allTests.find((t) => t.id === session.testId);
          const testTitle = test?.title || "Assessment";

          // Session started → treat as invitation/active test
          if (session.status === "STARTED") {
            notifs.push({
              id: `invite-${session.id}`,
              title: "Active Test Session",
              message: `You have an active session for '${testTitle}'. Continue before it expires.`,
              time: timeAgo(session.startedAt),
              type: "invite",
              read: false,
              actionLink: `/candidate/assessments`,
            });
          }

          // Submitted → check for result
          if (session.status === "SUBMITTED" || session.status === "EVALUATED") {
            try {
              const res = await testService.pollResultBySessionId(session.id);
              const statusCode = res.statusCode || res.status;
              if (statusCode === 200 && res.data) {
                const result = res.data;
                notifs.push({
                  id: `result-${session.id}`,
                  title: result.passed ? "Assessment Passed! 🎉" : "Assessment Result Available",
                  message: result.passed
                    ? `Congratulations! You passed '${testTitle}' with ${result.percentage.toFixed(1)}% (${result.totalScore}/${result.maxScore} marks). Your certificate is ready.`
                    : `Your result for '${testTitle}' is available. Score: ${result.percentage.toFixed(1)}% (${result.totalScore}/${result.maxScore} marks). Keep practicing!`,
                  time: timeAgo(result.evaluatedAt || session.submittedAt),
                  type: "result",
                  read: false,
                  actionLink: result.passed ? "/candidate/certificates" : "/candidate/results",
                });
              } else {
                // Submitted but not yet graded
                notifs.push({
                  id: `grading-${session.id}`,
                  title: "Grading In Progress",
                  message: `Your submission for '${testTitle}' is being evaluated. Results will appear here shortly.`,
                  time: timeAgo(session.submittedAt),
                  type: "system",
                  read: true,
                  actionLink: "/candidate/results",
                });
              }
            } catch {
              notifs.push({
                id: `grading-${session.id}`,
                title: "Grading In Progress",
                message: `Your submission for '${testTitle}' is being evaluated.`,
                time: timeAgo(session.submittedAt),
                type: "system",
                read: true,
                actionLink: "/candidate/results",
              });
            }
          }

          // Expired
          if (session.status === "EXPIRED") {
            notifs.push({
              id: `expired-${session.id}`,
              title: "Session Expired",
              message: `Your session for '${testTitle}' has expired without submission. Contact your trainer if you need to reschedule.`,
              time: timeAgo(session.expiresAt),
              type: "system",
              read: true,
              actionLink: "/candidate/assessments",
            });
          }
        })
      );

      // Sort: unread first, then by recency (we use id order as proxy)
      notifs.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
      setNotifications(notifs);
    } catch (err: unknown) {
      toast.error("Failed to load notifications: " + ((err as Error).message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { buildNotifications(); }, [userId]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read!");
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.info("All notifications cleared.");
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "invite":
        return { icon: Mail, bg: "bg-amber-100 text-amber-800", ring: "border-amber-200" };
      case "result":
        return { icon: Trophy, bg: "bg-emerald-100 text-emerald-800", ring: "border-emerald-200" };
      case "system":
      default:
        return { icon: Info, bg: "bg-blue-100 text-blue-800", ring: "border-blue-200" };
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full animate-bounce">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time updates on your test sessions, results, and grading status.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-xs gap-1 hover:bg-muted"
            onClick={buildNotifications}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {notifications.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-xs gap-1 hover:bg-muted"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                onClick={handleClearAll}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Notifications feed */}
      <Card className="border border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 flex items-start gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const config = getTypeStyle(notif.type);
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    className={`p-6 flex items-start gap-4 transition-colors hover:bg-muted/10 cursor-pointer ${!notif.read ? "bg-primary/5" : ""}`}
                    onClick={() => handleMarkRead(notif.id)}
                  >
                    {/* Icon Circle */}
                    <div className={`p-3 rounded-xl border flex-shrink-0 ${config.bg} ${config.ring}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                          {notif.title}
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </h4>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                        {notif.message}
                      </p>
                      <div className="pt-2">
                        <Button
                          variant="link"
                          asChild
                          className="p-0 h-auto text-primary hover:text-primary-hover text-xs font-semibold gap-0.5"
                        >
                          <Link to={notif.actionLink}>
                            View details <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto text-muted-foreground">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">You are all caught up!</p>
                <p className="text-xs text-muted-foreground">No active sessions or pending results at the moment.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
