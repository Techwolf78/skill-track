import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  ClipboardList,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { authService } from "@/lib/auth-service";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", end: true },
  { 
    icon: ClipboardList, 
    label: "Tests", 
    path: "/admin/tests",
    matchPaths: ["/admin/tests", "/admin/schedules", "/admin/invitations"]
  },
  { icon: Users, label: "Candidates", path: "/admin/candidates" },
  { icon: FileQuestion, label: "Question Bank", path: "/admin/questions" },
  { icon: ShieldAlert, label: "Proctoring", path: "/admin/proctoring" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    authService.logout();
  };

  const isItemActive = (item: { path: string; end?: boolean; matchPaths?: string[] }) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => location.pathname.startsWith(p));
    }
    return item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar sticky top-0 flex flex-col transition-all duration-300",
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
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
              {!collapsed ? <span className="font-medium">{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 rounded-md",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed ? <span className="ml-3">Logout</span> : null}
        </Button>
      </div>
    </aside>
  );
}
