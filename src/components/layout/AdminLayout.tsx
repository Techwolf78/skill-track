import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { AdminSidebar } from "./AdminSidebarNew";
import { useAuth } from "@/lib/auth-context";
import { ROLES } from "@/lib/roles";
import { getDedicatedSkeleton } from "@/components/ui/DedicatedSkeletons";

function AdminContentWrapper() {
  const location = useLocation();
  const skeleton = getDedicatedSkeleton(location.pathname);

  return (
    <Suspense fallback={skeleton}>
      <Outlet />
    </Suspense>
  );
}

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN;
  const isDocsPage = location.pathname.endsWith("/docs") || location.pathname.includes("/docs/");

  return (
    <div className="flex min-h-screen bg-background">
      {!isDocsPage && (isSuperAdmin ? <SuperAdminSidebar /> : <AdminSidebar />)}
      <main className="flex-1 overflow-auto">
        <AdminContentWrapper />
      </main>
    </div>
  );
}