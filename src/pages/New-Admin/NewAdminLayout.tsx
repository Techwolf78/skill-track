import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  GraduationCap,
  ClipboardList,
  BookOpen,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

export default function NewAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Determine current section for breadcrumb
  const getCurrentBreadcrumb = () => {
    if (location.pathname.includes("/new-admin/tests")) return "Tests";
    if (location.pathname.includes("/new-admin/library")) return "Library";
    if (location.pathname.includes("/new-admin/home")) return "Home";
    return "Tests";
  };

  const navItems = [
    {
      label: "Home",
      path: "/new-admin/home",
      icon: GraduationCap,
    },
    {
      label: "Tests",
      path: "/new-admin/tests",
      icon: ClipboardList,
    },
    {
      label: "Library",
      path: "/new-admin/library",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* 1. TOP NAVBAR (Dark Navy / Black sleek bar) */}
      <header className="h-20 bg-[#081225] border-b border-[#142340] px-4 md:px-8 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Route Breadcrumb */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div 
            onClick={() => navigate("/new-admin/home")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* Gryphon360 Brand Logo */}
            <img
              src="/Gryphon360logo.png"
              alt="Gryphon 360"
              className="h-12 md:h-14 w-auto object-contain shrink-0 hover:opacity-95 transition-opacity"
            />
          </div>

          {/* Vertical Divider Line */}
          <div className="h-5 w-[1px] bg-slate-700 mx-1"></div>

          {/* Route of the pages */}
          <div className="flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Gryphon360</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-semibold">{getCurrentBreadcrumb()}</span>
          </div>
        </div>

        {/* Right Side: Profile Section */}
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2 py-1 hover:bg-white/5 transition-colors focus:outline-none cursor-pointer">
                <Avatar className="w-8 h-8 border border-slate-700 bg-slate-800 text-slate-200">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80"
                    alt={user?.name || "Admin"}
                  />
                  <AvatarFallback className="bg-[#4353a4] text-white text-xs font-bold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex items-center">
                  <span className="text-xs font-semibold text-slate-200">
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
                onClick={() => navigate("/admin/profile")}
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

      {/* 2. SECOND NAVBAR (Centered, Prominent: Only Home, Tests, Library) */}
      <nav className="bg-white border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-center sticky top-14 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-center space-x-10 md:space-x-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === "/new-admin/home" && (location.pathname === "/new-admin" || location.pathname === "/new-admin/"));

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

      {/* 3. MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
