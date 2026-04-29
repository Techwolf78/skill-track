 import { Outlet } from "react-router-dom";
 import { SuperAdminSidebar } from "./SuperAdminSidebar";
 import { AdminSidebar } from "./AdminSidebarNew";
 import { useAuth } from "@/lib/auth-context";
 import { ROLES } from "@/lib/roles";
 
 export function AdminLayout() {
   const { user } = useAuth();
   const isSuperAdmin = user?.role === ROLES.SUPERADMIN;

   return (
     <div className="flex min-h-screen bg-background">
       {isSuperAdmin ? <SuperAdminSidebar /> : <AdminSidebar />}
       <main className="flex-1 overflow-auto">
         <Outlet />
       </main>
     </div>
   );
 }