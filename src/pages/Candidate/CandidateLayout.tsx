import { Suspense, useState } from "react";
import { NavLink, useNavigate, useLocation, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  User,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth-service";
import { getDedicatedSkeleton } from "@/components/ui/DedicatedSkeletons";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/candidate", end: true },
  { icon: ClipboardList, label: "My Assessments", path: "/candidate/assessments" },
  { icon: BarChart3, label: "Results & Reports", path: "/candidate/results" },
  { icon: User, label: "Profile", path: "/candidate/profile" },
];

export function CandidateLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    authService.logout();
  };

  const isItemActive = (item: { path: string; end?: boolean }) => {
    return item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "h-screen bg-sidebar sticky top-0 flex flex-col transition-all duration-300 z-20 shadow-xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo / Header */}
        <div className={cn(
          "flex px-6 py-6 border-b border-sidebar-border",
          collapsed ? "flex-col items-center gap-4" : "items-center justify-between"
        )}>
          {collapsed ? (
            <span className="font-heading font-extrabold text-2xl text-sidebar-foreground select-none">
              Rx
            </span>
          ) : (
            <span className="font-heading font-extrabold text-2xl text-sidebar-foreground select-none">
              RxOne
            </span>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-8 w-8 text-sidebar-foreground border border-sidebar-border rounded-md flex items-center justify-center hover:opacity-80 transition-opacity bg-transparent focus:outline-none",
              collapsed ? "mt-1" : ""
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const active = isItemActive(item);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110", collapsed && "mx-auto")} />
                {!collapsed ? <span className="font-medium text-sm">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed ? <span className="ml-3 text-sm font-medium">Logout</span> : null}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-10 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Candidate Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-muted-foreground block font-medium">Assessment Session</span>
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                System Online
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1 p-8 animate-fade-in">
          <Suspense fallback={getDedicatedSkeleton(location.pathname)}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
