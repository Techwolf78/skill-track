import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { hasAnyRole, UserRole } from '@/lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallbackTo?: string;
}

/**
 * ProtectedRoute Component
 * Protects routes based on user authentication and role.
 *
 * @param children - The component to render if authorized
 * @param requiredRoles - Array of roles allowed to access this route
 * @param fallbackTo - Where to redirect if not authorized (default: '/login')
 *
 * @example
 * <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  fallbackTo = '/login',
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Wait for auth to initialize before making decisions
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackTo} replace />;
  }

  if (!hasAnyRole(user.role, requiredRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
