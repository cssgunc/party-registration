import { AppRole } from "@/lib/api/account/account.types";

const STUDENT_AREA_ROLES: AppRole[] = ["student", "staff", "admin"];

export const ALLOWED_ROLES_FOR_PATH: Record<string, AppRole[]> = {
  "/about-party-registration": STUDENT_AREA_ROLES,
  "/about-party-smart": STUDENT_AREA_ROLES,
  "/new-party": STUDENT_AREA_ROLES,
  "/profile": STUDENT_AREA_ROLES,
  "/staff": ["staff", "admin"],
  "/police/admin": ["police_admin", "admin"],
  "/police": ["officer", "police_admin", "admin"],
};

/**
 * Return the roles that are permitted to access a given pathname.
 *
 * Matches by exact path or by prefix (e.g. `/police` covers `/police/admin`).
 * Returns an empty array for paths that have no access configuration (typically
 * fully public or non-existent routes).
 */
export function getAllowedRoles(pathname: string): AppRole[] {
  if (pathname === "/") return STUDENT_AREA_ROLES;
  for (const [prefix, roles] of Object.entries(ALLOWED_ROLES_FOR_PATH)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return roles;
  }
  return [];
}

/** Return `true` if the student role is allowed to access the given pathname. */
export function isStudentAreaPath(pathname: string): boolean {
  return getAllowedRoles(pathname).includes("student");
}

/**
 * Return the dashboard path for a given role.
 *
 * Falls back to `/police/login` for unauthenticated or unrecognised roles.
 */
export function getDashboardPath(role: AppRole | undefined): string {
  switch (role) {
    case "student":
      return "/";
    case "staff":
    case "admin":
      return "/staff";
    case "officer":
    case "police_admin":
      return "/police";
    default:
      return "/police/login";
  }
}
