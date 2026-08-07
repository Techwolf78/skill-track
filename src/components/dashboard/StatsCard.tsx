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
}: StatsCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors shadow-xs group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-background transition-colors border border-border/40">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold text-foreground font-mono tracking-tight">{value}</span>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">{subtitle}</p>
        )}
      </div>
    </div>
  );
}