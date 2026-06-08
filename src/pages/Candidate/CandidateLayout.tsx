import { NavLink, useNavigate, useLocation, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Award,
  User,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/candidate", end: true },
  { icon: ClipboardList, label: "My Assessments", path: "/candidate/assessments" },
  { icon: BarChart3, label: "Results & Reports", path: "/candidate/results" },
  { icon: Award, label: "Certificates", path: "/candidate/certificates" },
  { icon: User, label: "Profile", path: "/candidate/profile" },
  { icon: Bell, label: "Notifications", path: "/candidate/notifications" },
  { icon: HelpCircle, label: "Support", path: "/candidate/support" },
  { icon: Settings, label: "Settings", path: "/candidate/settings" },
];

export function CandidateLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isItemActive = (item: { path: string; end?: boolean }) => {
    return item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
  };

  // Read real user from localStorage (set on login)
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const candidateName: string = storedUser?.name || "Candidate";
  const candidateEmail: string = storedUser?.email || "";
  const candidateAvatar: string = candidateName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "h-screen bg-sidebar sticky top-0 flex flex-col transition-all duration-300 z-20 shadow-xl",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary flex-shrink-0 animate-pulse">
            <span className="text-xl font-bold text-primary-foreground">R</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xl text-sidebar-foreground">
                RxOne
              </span>
              <span className="text-[10px] text-primary font-semibold tracking-wider uppercase">
                Candidate
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
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
                {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                {active && !collapsed && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile section */}
        {!collapsed && (
          <div className="p-4 mx-3 mb-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold shadow-sm">
              {candidateAvatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{candidateName}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{candidateEmail}</p>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
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
          <Outlet />
        </div>
      </main>
    </div>
  );
}
