import React, { useState, useMemo } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  ClipboardList,
  BookOpen,
  ChevronRight,
  LogOut,
  User as UserIcon,
  CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-context";
import { GryphonLogo } from "@/components/ui/GryphonLogo";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { organisationService } from "@/lib/organisation-service";

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "Nov 14, 2025 - Aug 26, 2027";
  const formatSingle = (d: string) => {
    try {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return d;
      return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };
  return `${formatSingle(startDate)} - ${formatSingle(endDate)}`;
}

export default function NewAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pinPopoverOpen, setPinPopoverOpen] = useState(false);

  const userOrgId = user?.organisationData?.id || (user as any)?.organisation?.id || "default";

  // Dynamic subscription config from SuperAdmin
  const subConfig = useMemo(() => {
    return organisationService.getSubscriptionConfig(userOrgId);
  }, [userOrgId]);

  // Fetch real invitations to calculate live remaining PINs
  const { data: invitations = [] } = useQuery<any[]>({
    queryKey: ["all-candidate-invitations"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/candidate-invitations?size=1000");
        const data = res.data?.data ?? res.data;
        if (Array.isArray(data)) return data;
        if (data && typeof data === "object" && Array.isArray(data.content)) {
          return data.content;
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  const totalAllocatedPins = subConfig.allocatedPins || 10911;
  const initialBaseUsed = 8120;

  // Real dynamic live consumption:
  // 1. Upfront PIN reservation: 1 pin per candidate invitation
  // 2. Automatic PIN refund: 1 pin refunded per unattended/expired candidate
  const { liveDeductedCount, liveRefundedCount } = useMemo(() => {
    let deducted = 0;
    let refunded = 0;
    invitations.forEach((i) => {
      const weight = 1; // General assessment: strictly 1 pin per candidate
      if (i.status === "CANCELLED" || i.status === "REFUNDED" || i.status === "EXPIRED") {
        refunded += weight;
      } else {
        deducted += weight;
      }
    });
    return { liveDeductedCount: deducted, liveRefundedCount: refunded };
  }, [invitations]);

  const netLiveUsed = Math.max(0, liveDeductedCount - liveRefundedCount);
  const totalInvitesUsed = Math.min(totalAllocatedPins, initialBaseUsed + netLiveUsed);
  const pinsRemaining = Math.max(0, totalAllocatedPins - totalInvitesUsed);
  const remainingPercentage = Math.round((pinsRemaining / totalAllocatedPins) * 100);

  // Determine current section for breadcrumb
  const getCurrentBreadcrumb = () => {
    if (location.pathname.includes("/admin/billing") || location.pathname.includes("/billing")) return "Billing";
    if (location.pathname.includes("/admin/settings") || location.pathname.includes("/admin/profile")) return "Account Settings";
    if (location.pathname.includes("/admin/tests")) return "Tests";
    if (location.pathname.includes("/admin/library")) return "Library";
    if (location.pathname.includes("/admin/home")) return "Home";
    return "Home";
  };

  const navItems = [
    {
      label: "Home",
      path: "/admin/home",
      icon: GraduationCap,
    },
    {
      label: "Tests",
      path: "/admin/tests",
      icon: ClipboardList,
    },
    {
      label: "Library",
      path: "/admin/library",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* ── STICKY TOP NAVIGATION BAR (Top Bar + Second Bar combined) ── */}
      <div className="sticky top-0 z-30 shadow-md">
        {/* 1. TOP NAVBAR (Dark Navy / Black sleek bar) */}
        <header className="h-16 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between">
          {/* Left Side: Logo + Divider + Route Breadcrumb */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <div 
              onClick={() => navigate("/admin/home")}
              className="flex items-center gap-2 cursor-pointer group"
            >
              {/* Gryphon360 Brand Logo */}
              <GryphonLogo variant="dark" size="md" />
            </div>

            {/* Vertical Divider Line */}
            <div className="h-5 w-[1px] bg-slate-700 mx-1"></div>

            {/* Route of the pages */}
            <div className="flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5">
              <span onClick={() => navigate("/admin/home")} className="hover:text-slate-200 cursor-pointer transition-colors">
                Learn
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-200 font-semibold">{getCurrentBreadcrumb()}</span>
            </div>
          </div>

          {/* Right Side: PIN quota widget + Action icons + Profile */}
          <div className="flex items-center space-x-4">
            {/* ── DoSelect Header PIN Progress Widget & Popover ── */}
            <Popover open={pinPopoverOpen} onOpenChange={setPinPopoverOpen}>
              <PopoverTrigger asChild>
                <div 
                  className="flex flex-col items-end cursor-pointer group px-2 py-1 hover:bg-white/5 rounded transition-colors"
                >
                  <span className="text-[11px] font-medium text-slate-200 group-hover:text-white transition-colors">
                    {pinsRemaining.toLocaleString()}/{totalAllocatedPins.toLocaleString()} invite pins left ({remainingPercentage}%)
                  </span>
                  <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
                    <div 
                      className="h-full bg-[#EF4444] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, 100 - remainingPercentage))}%` }}
                    />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent 
                align="end" 
                className="w-72 p-3 bg-[#171b26] border border-slate-700 text-slate-200 shadow-2xl rounded-none text-xs space-y-2"
              >
                {/* Billing Period */}
                <div className="text-[10.5px] text-slate-300 border-b border-slate-800 pb-1.5 leading-tight">
                  <span className="text-slate-400">Billing Period:</span> {formatDateRange(subConfig.billingCycleStartDate, subConfig.billingCycleEndDate)}.
                </div>

                {/* Deduction Logic */}
                <div className="text-[10.5px] space-y-0.5">
                  <span className="font-semibold text-white">Invite Deduction logic:</span>
                  <ul className="list-disc pl-3.5 space-y-0.5 text-slate-300 text-[10px]">
                    <li>1 PIN per candidate invite</li>
                  </ul>
                </div>

                {/* Historic Consumption & Know More Row */}
                <div className="text-[10px] pt-1.5 border-t border-slate-800 flex items-center justify-between text-slate-300">
                  <div>
                    <span>Consumption Before Jul 24, 2025 : </span>
                    <button 
                      onClick={() => {
                        setPinPopoverOpen(false);
                        navigate("/admin/billing");
                      }} 
                      className="underline text-slate-100 hover:text-orange-400 font-medium cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setPinPopoverOpen(false);
                      navigate("/admin/billing");
                    }}
                    className="text-[11px] font-bold text-white hover:text-orange-400 hover:underline cursor-pointer transition-colors shrink-0 ml-2"
                  >
                    Know More
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Profile Avatar & Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-white/10 transition-colors focus:outline-none cursor-pointer rounded">
                  <div className="w-7 h-7 rounded-full bg-[#4d62b5] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                    {user?.name
                      ? user.name
                          .trim()
                          .split(/\s+/)
                          .map((p) => p[0]?.toUpperCase())
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                      : "DE"}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 whitespace-nowrap">
                    {user?.name || "Dev admin GA"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-2xl p-1 text-xs">
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || "Dev admin GA"}</p>
                    <p className="text-xs text-slate-500 leading-none truncate mt-1">{user?.email || "devadmin@gryphon360.com"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  onClick={() => navigate("/admin/billing")}
                  className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2 font-medium"
                >
                  <CreditCard className="w-4 h-4 text-[#4353a4]" />
                  Billing & Subscription
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/admin/settings")}
                  className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  onClick={() => logout && logout()}
                  className="cursor-pointer text-red-600 hover:bg-red-50 px-3 py-2 text-xs flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 2. SECOND NAVBAR (Centered, Prominent: Only Home, Tests, Library) */}
        <nav className="bg-white border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-center space-x-10 md:space-x-20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === "/admin/home" && (location.pathname === "/admin" || location.pathname === "/admin/"));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center py-3.5 px-4 md:px-6 group transition-all duration-150 ${
                    isActive ? "text-[#1E40AF]" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {/* Icon */}
                  <Icon
                    className={`w-6 h-6 mb-1.5 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#1D4ED8]" : "text-slate-500 group-hover:text-slate-800"
                    }`}
                  />
                  {/* Text Label */}
                  <span
                    className={`text-sm tracking-normal transition-colors ${
                      isActive ? "font-semibold text-[#1E40AF]" : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Bottom Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1D4ED8] rounded-t-full shadow-sm" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
