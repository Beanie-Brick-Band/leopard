/**
 * Role-based routing utilities
 */

export type UserRole = "student" | "teacher" | null;

/**
 * Get the dashboard route for a given role
 */
export function getDashboardRoute(role: UserRole): string {
  if (role === "teacher") {
    return "/teacher";
  }
  if (role === "student") {
    return "/student";
  }
  return "/";
}

/**
 * Get the classroom route for a given role
 */
export function getClassroomRoute(role: UserRole, classroomId: string): string {
  if (role === "teacher") {
    return `/teacher/classroom/${classroomId}`;
  }
  if (role === "student") {
    return `/student/classroom/${classroomId}`;
  }
  return "/";
}

/**
 * Get the assignment route for a given role
 */
export function getAssignmentRoute(
  role: UserRole,
  classroomId: string,
  assignmentId: string,
): string {
  if (role === "teacher") {
    return `/teacher/classroom/${classroomId}/assignment/${assignmentId}`;
  }
  if (role === "student") {
    return `/student/classroom/${classroomId}/assignment/${assignmentId}`;
  }
  return "/";
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return userRole === requiredRole;
}
