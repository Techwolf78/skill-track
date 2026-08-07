import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "accent" | "success" | "warning" | "danger";
  trend?: {
    value: number;
    positive: boolean;
  };
  sparklineData?: number[];
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  trend,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl border bg-slate-900/80 backdrop-blur-md transition-all duration-200 hover:border-slate-700 hover:shadow-lg relative overflow-hidden group font-sans",
        variant === "default" && "border-slate-800 hover:border-emerald-500/40",
        variant === "accent" && "border-slate-800 hover:border-cyan-500/40",
        variant === "success" && "border-slate-800 hover:border-emerald-500/40",
        variant === "warning" && "border-slate-800 hover:border-amber-500/40",
        variant === "danger" && "border-slate-800 hover:border-red-500/40"
      )}
    >
      {/* Top accent border strip */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px]",
          variant === "default" && "bg-emerald-500",
          variant === "accent" && "bg-cyan-500",
          variant === "success" && "bg-emerald-500",
          variant === "warning" && "bg-amber-500",
          variant === "danger" && "bg-red-500"
        )}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider font-mono font-medium text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold font-mono text-slate-100 mt-2 tracking-tight">
            {value}
          </p>
          
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 font-mono">{subtitle}</p>
          )}

          {trend && (
            <div className="flex items-center gap-1 mt-2.5 text-xs font-mono">
              <span
                className={cn(
                  "font-bold px-1.5 py-0.5 rounded text-[11px]",
                  trend.positive
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-950/80 text-red-400 border border-red-500/30"
                )}
              >
                {trend.positive ? "▲ +" : "▼ -"}{Math.abs(trend.value)}%
              </span>
              <span className="text-slate-500">vs last cycle</span>
            </div>
          )}
        </div>

        {/* Icon box with glowing gradient background */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105",
            variant === "default" && "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40",
            variant === "accent" && "bg-cyan-950/40 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-950/40",
            variant === "success" && "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40",
            variant === "warning" && "bg-amber-950/40 border-amber-500/30 text-amber-400 shadow-md shadow-amber-950/40",
            variant === "danger" && "bg-red-950/40 border-red-500/30 text-red-400 shadow-md shadow-red-950/40"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}