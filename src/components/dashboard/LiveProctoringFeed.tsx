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
    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden font-mono">
      <div className="h-0.5 w-full bg-emerald-500 animate-pulse" />
      <CardHeader className="py-3 px-4 bg-slate-950/60 border-b border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <CardTitle className="text-sm font-bold tracking-wider text-slate-200">
            LIVE SYSTEM & AUDIT TELEMETRY
          </CardTitle>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          LIVE BACKEND STREAM
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {loading && logs.length === 0 ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-500 text-xs font-sans">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Connecting to live audit log stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-sans">
            No recent audit telemetry events recorded.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/50">
            {logs.map((log) => {
              const timeStr = log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString()
                : "Just now";

              const isSuccess = log.status === "SUCCESS";
              const isWarning = log.action?.includes("WARN") || log.status === "FAILED";
              const isViolation = log.action?.includes("VIOLATION") || log.action?.includes("FLAG");

              return (
                <div key={log.id} className="p-3 text-xs flex items-center gap-3 hover:bg-slate-800/40 transition-colors">
                  <span className="text-slate-500 text-[11px] shrink-0 font-mono">{timeStr}</span>

                  {/* Event Badge */}
                  {isViolation ? (
                    <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 flex items-center gap-1 shrink-0 text-[10px]">
                      <ShieldAlert className="w-2.5 h-2.5" /> ALERT
                    </span>
                  ) : isWarning ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0 text-[10px]">
                      <AlertTriangle className="w-2.5 h-2.5" /> WARN
                    </span>
                  ) : isSuccess ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0 text-[10px]">
                      <CheckCircle className="w-2.5 h-2.5" /> OK
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 shrink-0 text-[10px]">
                      <Play className="w-2.5 h-2.5" /> EVENT
                    </span>
                  )}

                  {/* Action & Details */}
                  <span className="text-slate-300 font-sans truncate">
                    <strong className="text-slate-200 font-mono mr-1.5">{log.action || "EVENT"}:</strong>
                    {log.details || `Executed by ${log.actor || "system"}`}
                  </span>

                  {/* Actor */}
                  {log.actor && (
                    <span className="ml-auto text-[10px] text-slate-500 font-mono shrink-0 hidden sm:inline-block">
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
