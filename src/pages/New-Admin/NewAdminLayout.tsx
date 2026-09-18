import React from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  ClipboardList,
  BookOpen,
  ChevronRight,
  LogOut,
  User as UserIcon,
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
import { useAuth } from "@/lib/auth-context";
import { GryphonLogo } from "@/components/ui/GryphonLogo";

export default function NewAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Determine current section for breadcrumb
  const getCurrentBreadcrumb = () => {
    if (location.pathname.includes("/admin/settings") || location.pathname.includes("/admin/profile")) return "Account Settings";
    if (location.pathname.includes("/admin/tests")) return "Tests";
    if (location.pathname.includes("/admin/library")) return "Library";
    if (location.pathname.includes("/admin/home") || location.pathname === "/admin" || location.pathname === "/admin/") return "Home";
    return "Tests";
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
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* ── UNIFIED SLEEK TOP HEADER ── */}
      <header className="h-14 bg-[#0f172a] border-b border-slate-800/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left Side: Brand Logo + Divider + Breadcrumbs */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div 
            onClick={() => navigate("/admin/home")}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <GryphonLogo variant="dark" size="sm" />
          </div>

          {/* Vertical Divider */}
          <div className="h-5 w-[1px] bg-slate-700 hidden sm:block"></div>

          {/* Breadcrumb Navigation */}
          <div className="hidden sm:flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5">
            <span 
              onClick={() => navigate("/admin/home")}
              className="hover:text-slate-200 cursor-pointer transition-colors"
            >
              Dashboard
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-semibold">{getCurrentBreadcrumb()}</span>
          </div>
        </div>

        {/* Right Side: Profile Dropdown */}
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-slate-800/70 transition-colors focus:outline-none cursor-pointer rounded-md">
                <Avatar className="w-7 h-7 border border-slate-700 bg-slate-800 text-slate-200">
                  <AvatarFallback className="bg-indigo-600 text-white text-[11px] font-bold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex items-center">
                  <span className="text-xs font-medium text-slate-200">
                    {user?.name || "Admin User"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-2xl p-1 text-xs">
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || "Admin User"}</p>
                  <p className="text-xs text-slate-500 leading-none truncate mt-1">{user?.email || "admin@gryphon360.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => navigate("/admin/settings")}
                className="cursor-pointer text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                Profile Settings
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

      {/* ── SECONDARY SUB-NAVBAR (Home, Tests, Library) ── */}
      <nav className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-center gap-6 md:gap-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === "/admin/home" && (location.pathname === "/admin" || location.pathname === "/admin/"));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 py-3 px-3 text-xs md:text-sm font-bold tracking-tight border-b-2 -mb-[1px] transition-all cursor-pointer ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-3.5 md:py-4">
        <Outlet />
      </main>
    </div>
  );
}

