import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, ShieldAlert, CheckCircle, AlertTriangle, Play, Loader2 } from "lucide-react";
import { auditLogService, AuditLog } from "@/lib/audit-log-service";

export function LiveProctoringFeed() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogService.getAuditLogs({ page: 0, size: 8 });
      setLogs(res.content || []);
    } catch (err) {
      console.error("Failed to fetch live audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLogs();
    const interval = setInterval(fetchLiveLogs, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            System & Audit Telemetry
          </CardTitle>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Stream
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {loading && logs.length === 0 ? (
          <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground text-xs font-sans">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            Connecting to live audit log stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs font-sans">
            No recent audit telemetry events recorded.
          </div>
        ) : (
          <div className="divide-y divide-border/50 max-h-[220px] overflow-y-auto font-mono">
            {logs.map((log) => {
              const timeStr = log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString()
                : "Just now";

              const isSuccess = log.status === "SUCCESS";
              const isWarning = log.action?.includes("WARN") || log.status === "FAILED";
              const isViolation = log.action?.includes("VIOLATION") || log.action?.includes("FLAG");

              return (
                <div key={log.id} className="p-2.5 text-xs flex items-center gap-2.5 hover:bg-muted/40 transition-colors">
                  <span className="text-muted-foreground text-[10px] shrink-0">{timeStr}</span>

                  {/* Event Badge */}
                  {isViolation ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1 shrink-0 text-[10px]">
                      <ShieldAlert className="w-2.5 h-2.5" /> ALERT
                    </span>
                  ) : isWarning ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0 text-[10px]">
                      <AlertTriangle className="w-2.5 h-2.5" /> WARN
                    </span>
                  ) : isSuccess ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0 text-[10px]">
                      <CheckCircle className="w-2.5 h-2.5" /> OK
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1 shrink-0 text-[10px]">
                      <Play className="w-2.5 h-2.5" /> EVENT
                    </span>
                  )}

                  {/* Action & Details */}
                  <span className="text-foreground font-sans text-xs truncate">
                    <strong className="font-mono text-muted-foreground mr-1.5">{log.action || "EVENT"}:</strong>
                    {log.details || `Executed by ${log.actor || "system"}`}
                  </span>

                  {/* Actor */}
                  {log.actor && (
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0 hidden sm:inline-block">
                      [{log.actor}]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
