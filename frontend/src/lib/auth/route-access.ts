import { AppRole } from "@/lib/api/account/account.types";

const STUDENT_AREA_ROLES: AppRole[] = ["student", "staff", "admin"];

export const ALLOWED_ROLES_FOR_PATH: Record<string, AppRole[]> = {
  "/about-party-registration": STUDENT_AREA_ROLES,
  "/about-party-smart": STUDENT_AREA_ROLES,
  "/new-party": STUDENT_AREA_ROLES,
  "/profile": STUDENT_AREA_ROLES,
  "/staff": ["staff", "admin"],
  "/police/admin": ["police_admin"],
  "/police": ["officer", "police_admin", "admin"],
};

export function getRequiredRolesForPath(pathname: string): AppRole[] | null {
  if (pathname === "/") return STUDENT_AREA_ROLES;
  for (const [prefix, roles] of Object.entries(ALLOWED_ROLES_FOR_PATH)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return roles;
  }
  return null;
}

export function isStudentAreaPath(pathname: string): boolean {
  return getRequiredRolesForPath(pathname)?.includes("student") ?? false;
}

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
