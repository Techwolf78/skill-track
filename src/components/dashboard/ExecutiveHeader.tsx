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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            SuperAdmin Overview
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live System
          </span>
        </div>
        <p className="text-muted-foreground text-xs mt-1">
          Monitor active schedules, candidate enrolments, question repository, and test performance.
        </p>
      </div>

      {/* Action Controls & Health Bar */}
      <div className="flex items-center gap-2.5">
        {/* Timeframe Selector */}
        <div className="flex items-center bg-muted/60 border border-border rounded-lg p-0.5 text-xs">
          {["24H", "7D", "30D", "YTD"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs ${
                timeframe === tf
                  ? "bg-background text-foreground shadow-sm font-semibold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
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
          className="h-8 border-border bg-background hover:bg-muted text-foreground text-xs px-3 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          Refresh
        </Button>

        {/* Create Test Primary CTA */}
        <Button
          size="sm"
          onClick={() => navigate("/superadmin/tests/create")}
          className="h-8 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs px-3.5 shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Test
        </Button>
      </div>
    </div>
  );
}
