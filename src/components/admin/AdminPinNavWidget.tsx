import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { organisationPinService } from "@/lib/organisation-pin-service";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/date-utils";
import { Coins, HelpCircle, ArrowUpRight, Loader2, Calendar } from "lucide-react";

export function AdminPinNavWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const orgId = user?.organisationData?.id;

  const { data: pinSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["admin-nav-pin-summary", orgId],
    queryFn: () => organisationPinService.getPinSummary(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: fySummaryList } = useQuery({
    queryKey: ["admin-nav-pin-fy", orgId],
    queryFn: () => organisationPinService.getPinSummaryByFinancialYear(orgId!),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  if (!orgId) {
    return null;
  }

  const pinBalance = pinSummary?.pinBalance ?? 0;
  const totalAllocated = pinSummary?.totalAllocatedPins ?? 0;
  const totalUsed = pinSummary?.totalUsedPins ?? 0;
  const activeFy = fySummaryList && fySummaryList.length > 0 ? fySummaryList[0] : null;

  // Percentage remaining for the balance bar
  const percentRemaining =
    totalAllocated > 0
      ? Math.min(100, Math.max(0, Math.round((pinBalance / totalAllocated) * 100)))
      : pinBalance > 0
      ? 100
      : 0;

  // Percentage utilised: 0% (unused) up to 100% (fully utilised)
  const utilisationPercent =
    totalAllocated > 0
      ? Math.min(100, Math.max(0, Math.round((totalUsed / totalAllocated) * 100)))
      : 0;

  // Dynamic color spectrum from Green (low utilisation / 0%) to Orange (high utilisation / 100%)
  // Hue: 145 (Fresh Emerald Green) -> 85 (Lime/Yellow) -> 55 (Amber) -> 25 (Vivid Orange)
  const hue = Math.round(145 - (utilisationPercent / 100) * 120);
  const dynamicColor = `hsl(${hue}, 86%, 50%)`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View PIN Balance and Quota Details"
          className="flex flex-col justify-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50 group shrink-0 min-w-[170px] sm:min-w-[205px]"
        >
          {/* Progress Bar Track */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentRemaining}%`,
                backgroundColor: dynamicColor,
              }}
            />
          </div>

          {/* Metrics Row */}
          <div className="flex items-center justify-between w-full text-xs leading-none gap-2">
            <div className="flex items-center gap-1 font-mono">
              {isSummaryLoading ? (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading PINs...</span>
                </div>
              ) : (
                <>
                  <span className="font-bold text-slate-100">
                    {pinBalance.toLocaleString()}
                  </span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-400 font-medium">
                    {totalAllocated.toLocaleString()}
                  </span>
                  <span className="text-[10.5px] font-sans text-slate-400 ml-0.5 whitespace-nowrap">
                    user pins left
                  </span>
                </>
              )}
            </div>
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
          </div>
        </button>
      </PopoverTrigger>

      {/* Light Mode Popover with Violet/Indigo Scheme */}
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 bg-white text-slate-800 border border-slate-200/90 p-0 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Assessment PINs
                </h4>
                <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                  {user?.organisationData?.name || "Organisation Balance"}
                </p>
              </div>
            </div>
            {activeFy && (
              <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                {activeFy.financialYear}
              </span>
            )}
          </div>

          {activeFy && (
            <p className="text-[10.5px] text-slate-500 mt-2 font-mono flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <span>
                {formatDate(activeFy.startDate)} – {formatDate(activeFy.endDate)}
              </span>
            </p>
          )}
        </div>

        {/* Quota Metric Breakdown */}
        <div className="p-3.5 grid grid-cols-3 gap-2">
          <div className="bg-indigo-50/40 border border-indigo-100/80 rounded-lg p-2 text-center">
            <span className="text-[10px] uppercase font-semibold text-indigo-700 block tracking-wider">
              Available
            </span>
            <span className="font-mono font-bold text-sm text-indigo-950 block mt-0.5">
              {isSummaryLoading ? "..." : pinBalance.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block tracking-wider">
              Credited
            </span>
            <span className="font-mono font-bold text-sm text-slate-800 block mt-0.5">
              {isSummaryLoading ? "..." : totalAllocated.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Debited
            </span>
            <span className="font-mono font-bold text-sm text-slate-600 block mt-0.5">
              {isSummaryLoading ? "..." : totalUsed.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Dynamic Utilisation Bar */}
        <div className="px-3.5 pb-3">
          <div className="flex items-center justify-between text-[10.5px] font-medium text-slate-500 mb-1">
            <span>Quota Utilisation</span>
            <span className="font-mono font-bold text-slate-700">
              {utilisationPercent}% debited
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${utilisationPercent}%`,
                backgroundColor: dynamicColor,
              }}
            />
          </div>
        </div>

        {/* Deduction Logic Policy */}
        <div className="px-3.5 py-2.5 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
          <div className="text-[10.5px] font-semibold text-slate-700">
            PIN Policy:
          </div>
          <ul className="space-y-1 text-slate-500 text-[10.5px]">
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold">•</span>
              <span><strong>1 PIN</strong> reserved per invited candidate at invite time.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Unstarted no-shows are automatically refunded after the schedule ends (+3h grace period).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold">•</span>
              <span>Revoking an unstarted invitation refunds 1 PIN immediately.</span>
            </li>
          </ul>
        </div>

        {/* Footer Action Button */}
        <div className="p-2.5 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate("/admin/settings?tab=billing");
            }}
            className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-indigo-200/80 bg-white cursor-pointer shadow-2xs"
          >
            <span>View Statement & Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
