import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Cpu, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExecutiveHeaderProps {
  timeframe: string;
  setTimeframe: (tf: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ExecutiveHeader({
  timeframe,
  setTimeframe,
  onRefresh,
  isRefreshing = false,
}: ExecutiveHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-slate-100">
            SUPERADMIN COMMAND CENTER
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
            LIVE TELEMETRY
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-1 font-sans">
          Real-time candidate assessment velocity, proctoring security metrics, and subject performance insights.
        </p>
      </div>

      {/* Action Controls & Health Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* System Health Indicators */}
        <div className="hidden xl:flex items-center gap-4 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>API: <strong className="text-emerald-400">99.98%</strong></span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PROCTORING: <strong className="text-emerald-400">ONLINE</strong></span>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 font-mono text-xs">
          {["24H", "7D", "30D", "YTD"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-md transition-all font-semibold ${
                timeframe === tf
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-mono text-xs h-9 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
          REFRESH
        </Button>

        {/* Create Test Primary CTA */}
        <Button
          onClick={() => navigate("/superadmin/tests/create")}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:text-slate-950 font-bold tracking-wider font-mono text-xs h-9 px-4 shadow-lg shadow-emerald-950/40 transition-all"
        >
          <Plus className="w-4 h-4 mr-1" />
          CREATE TEST
        </Button>
      </div>
    </div>
  );
}
