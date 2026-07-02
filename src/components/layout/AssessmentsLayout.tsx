import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ClipboardList, CalendarDays, UserPlus } from "lucide-react";

export function AssessmentsLayout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const prefix = isAdmin ? "/admin" : "/superadmin";
  const schedulePath = isAdmin ? `${prefix}/schedules` : `${prefix}/test-schedules`;

  const tabs = [
    {
      label: "Tests",
      path: `${prefix}/tests`,
      icon: ClipboardList,
    },
    {
      label: "Test Schedules",
      path: schedulePath,
      icon: CalendarDays,
    },
    {
      label: "Invite Candidates",
      path: `${prefix}/invitations`,
      icon: UserPlus,
    },
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Tabs */}
      {!isAdmin && (
        <div className="flex border-b border-border/60 space-x-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all duration-200 -mb-[2px]",
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* Content wrapper */}
      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}
