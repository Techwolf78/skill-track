/**
 * User role definitions and type exports
 * All user roles in the application
 */

export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  TRAINER: 'TRAINER',
  STUDENT: 'STUDENT',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Check if a user has a specific role
 */
export const hasRole = (userRole: string | undefined, requiredRole: UserRole): boolean => {
  return userRole === requiredRole;
};

/**
 * Check if a user has any of the specified roles
 */
export const hasAnyRole = (userRole: string | undefined, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole as UserRole);
};

/**
 * Role-based permission checks
 */
export const canAccessSuperAdmin = (userRole: string | undefined): boolean => {
  return hasRole(userRole, ROLES.SUPERADMIN);
};

export const canAccessAdmin = (userRole: string | undefined): boolean => {
  return hasRole(userRole, ROLES.ADMIN);
};

export const canAccessAdminOrSuperAdmin = (userRole: string | undefined): boolean => {
  return hasAnyRole(userRole, [ROLES.ADMIN, ROLES.SUPERADMIN]);
};
