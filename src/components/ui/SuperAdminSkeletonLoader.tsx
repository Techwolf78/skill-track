import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const SuperAdminSkeletonLoader = () => {
  return (
    <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto w-full">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-800/60 rounded-lg" />
          <Skeleton className="h-4 w-72 bg-slate-800/40 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 bg-slate-800/60 rounded-lg" />
          <Skeleton className="h-9 w-32 bg-primary/20 rounded-lg" />
        </div>
      </div>

      {/* KPI Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-slate-800/50 rounded" />
              <Skeleton className="h-7 w-7 rounded-lg bg-slate-800/60" />
            </div>
            <Skeleton className="h-8 w-20 bg-slate-800/70 rounded-md" />
            <Skeleton className="h-3 w-32 bg-slate-800/40 rounded" />
          </div>
        ))}
      </div>

      {/* Filter / Search controls skeleton */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
        <Skeleton className="h-10 w-72 bg-slate-800/50 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 bg-slate-800/50 rounded-lg" />
          <Skeleton className="h-10 w-24 bg-slate-800/50 rounded-lg" />
        </div>
      </div>

      {/* Table / Main panel skeleton */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <Skeleton className="h-6 w-36 bg-slate-800/60 rounded" />
          <Skeleton className="h-6 w-24 bg-slate-800/40 rounded" />
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center justify-between py-3 border-b border-slate-800/40">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full bg-slate-800/60" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 bg-slate-800/60 rounded" />
                <Skeleton className="h-3 w-28 bg-slate-800/40 rounded" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 bg-slate-800/50 rounded-full" />
            <Skeleton className="h-4 w-32 bg-slate-800/40 rounded" />
            <Skeleton className="h-8 w-24 bg-slate-800/50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
};
