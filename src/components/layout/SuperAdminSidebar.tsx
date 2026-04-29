import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileQuestion,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/superadmin", end: true },
  { icon: Building2, label: "Organisations", path: "/superadmin/organisations" },
  { icon: UserRound, label: "Users", path: "/superadmin/users" },
  { icon: Users, label: "Students", path: "/superadmin/students" },
  { icon: FileQuestion, label: "Question Bank", path: "/superadmin/questions" },
  { icon: ClipboardList, label: "Tests", path: "/superadmin/tests" },
  { icon: BarChart3, label: "Reports", path: "/superadmin/reports" },
  { icon: Settings, label: "Settings", path: "/superadmin/settings" },
];

export function SuperAdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar sticky top-0 flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary">
          <span className="text-xl font-bold text-primary-foreground">R</span>
        </div>
        {!collapsed && (
          <span className="font-heading font-bold text-xl text-sidebar-foreground">
            RxOne
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>
    </aside>
  );
}
