import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  GraduationCap,
  ClipboardList,
  Library,
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
      icon: Library,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-800 font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* 1. TOP NAVBAR (Dark Navy / Black sleek bar) */}
      <header className="h-14 bg-[#081225] border-b border-[#142340] px-4 md:px-6 flex items-center justify-between z-30 sticky top-0 shadow-md">
        {/* Left Side: Logo + Divider + Route Breadcrumb */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div 
            onClick={() => navigate("/new-admin/home")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* Green Check Icon Badge */}
            <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg md:text-xl tracking-tight">
              RxOne
            </span>
          </div>

          {/* Vertical Divider Line */}
          <div className="h-5 w-[1px] bg-slate-700 mx-1"></div>

          {/* Route of the pages */}
          <div className="flex items-center text-xs md:text-sm text-slate-400 font-medium space-x-1.5">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">RxOne</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-semibold">{getCurrentBreadcrumb()}</span>
          </div>
        </div>

        {/* Right Side: ONLY Search and Profile */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Search */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 md:w-56 bg-[#111C33] border border-slate-700/80 rounded-full py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          </div>

          {/* Profile Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center focus:outline-none ring-2 ring-transparent hover:ring-blue-500 rounded-full transition-all">
                <Avatar className="w-8 h-8 border border-slate-700 cursor-pointer">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt={user?.name || "Admin"}
                  />
                  <AvatarFallback className="bg-amber-600 text-white text-xs font-semibold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border border-slate-200 shadow-xl rounded-lg mt-1 p-1">
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900 leading-none">{user?.name || "Admin User"}</p>
                  <p className="text-xs text-slate-500 leading-none truncate mt-1">{user?.email || "admin@rxone.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => navigate("/admin/profile")}
                className="cursor-pointer text-slate-700 hover:bg-slate-50 rounded-md px-3 py-2 text-xs flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => logout && logout()}
                className="cursor-pointer text-red-600 hover:bg-red-50 rounded-md px-3 py-2 text-xs flex items-center gap-2"
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
