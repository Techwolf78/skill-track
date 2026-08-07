import { Suspense, useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { AdminSidebar } from "./AdminSidebarNew";
import { useAuth } from "@/lib/auth-context";
import { ROLES } from "@/lib/roles";
import { getDedicatedSkeleton } from "@/components/ui/DedicatedSkeletons";

function AdminContentWrapper() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const skeleton = getDedicatedSkeleton(location.pathname);

  if (loading) {
    return skeleton;
  }

  return (
    <Suspense fallback={skeleton}>
      <Outlet />
    </Suspense>
  );
}

export function AdminLayout() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN;

  return (
    <div className="flex min-h-screen bg-background">
      {isSuperAdmin ? <SuperAdminSidebar /> : <AdminSidebar />}
      <main className="flex-1 overflow-auto">
        <AdminContentWrapper />
      </main>
    </div>
  );
}