 import { cn } from "@/lib/utils";
 import { LucideIcon } from "lucide-react";
 
 interface StatsCardProps {
   title: string;
   value: string | number;
   subtitle?: string;
   icon: LucideIcon;
   variant?: "default" | "accent" | "success" | "warning";
   trend?: {
     value: number;
     positive: boolean;
   };
 }
 
 export function StatsCard({ 
   title, 
   value, 
   subtitle, 
   icon: Icon, 
   variant = "default",
   trend 
 }: StatsCardProps) {
   return (
     <div className={cn("stat-card card-hover", variant)}>
       <div className="flex items-start justify-between">
         <div>
           <p className="text-sm font-medium text-muted-foreground">{title}</p>
           <p className="text-3xl font-bold font-heading mt-2">{value}</p>
           {subtitle && (
             <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
           )}
           {trend && (
             <p className={cn(
               "text-sm font-medium mt-2",
               trend.positive ? "text-success" : "text-destructive"
             )}>
               {trend.positive ? "+" : "-"}{Math.abs(trend.value)}% from last month
             </p>
           )}
         </div>
         <div className={cn(
           "w-12 h-12 rounded-xl flex items-center justify-center",
           variant === "default" && "bg-primary/10 text-primary",
           variant === "accent" && "bg-accent/10 text-accent",
           variant === "success" && "bg-success/10 text-success",
           variant === "warning" && "bg-warning/10 text-warning"
         )}>
           <Icon className="w-6 h-6" />
         </div>
       </div>
     </div>
   );
 }