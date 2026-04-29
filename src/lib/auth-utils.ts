/**
 * Authorization utilities
 * Helper functions for auth checks throughout the app
 */

import { UserData } from './auth-service';
import { hasAnyRole, UserRole } from './roles';

/**
 * Check if user can access a specific route
 */
export const canAccessRoute = (user: UserData | null, requiredRoles: UserRole[]): boolean => {
  if (!user) return false;
  return hasAnyRole(user.role, requiredRoles);
};

/**
 * Get redirect destination based on user role
 * Directs users to appropriate dashboard after login
 */
export const getRedirectPathForRole = (role: string): string => {
  switch (role) {
    case 'SUPERADMIN':
      return '/superadmin';
    case 'ADMIN':
      return '/admin';
    case 'TRAINER':
      return '/trainer'; // or '/dashboard' if trainer uses student dashboard
    case 'STUDENT':
    default:
      return '/dashboard';
  }
};
