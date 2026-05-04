import { AppRole } from "@/lib/api/account/account.types";
import { serverEnv } from "@/lib/config/env.server";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROLES_FOR_PATH: Record<string, AppRole[]> = {
  "/about-party-registration": ["student"],
  "/about-party-smart": ["student"],
  "/new-party": ["student"],
  "/profile": ["student"],
  "/staff": ["staff", "admin"],
  "/police/admin": ["police_admin"],
  "/police": ["officer", "police_admin", "admin"],
};

const PUBLIC_PATHS = new Set(["/police/login"]);
const PUBLIC_POLICE_PATHS = new Set(["/police/signup", "/police/verify"]);

function getRequiredRolesForPath(pathname: string): AppRole[] | null {
  if (pathname === "/") return ["student"];
  for (const [prefix, roles] of Object.entries(ALLOWED_ROLES_FOR_PATH)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return roles;
  }
  return null;
}

function getDefaultRoleForPath(pathname: string): AppRole | null {
  if (
    pathname === "/" ||
    pathname.startsWith("/about-party") ||
    pathname.startsWith("/new-party") ||
    pathname.startsWith("/profile")
  )
    return "student";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/police/admin")) return "police_admin";
  if (pathname.startsWith("/police")) return "officer";
  return null;
}

function getDashboardPath(role: AppRole | undefined): string {
  switch (role) {
    case "student":
      return "/";
    case "staff":
    case "admin":
      return "/staff";
    case "officer":
      return "/police";
    case "police_admin":
      return "/police/admin";
    default:
      return "/police/login";
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: serverEnv.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;
  const userRole = token?.role as AppRole | undefined;

  if (PUBLIC_POLICE_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(getDashboardPath(userRole), req.url)
      );
    }
    return NextResponse.next();
  }

  const allowedRoles = getRequiredRolesForPath(pathname);
  if (!allowedRoles) return NextResponse.next();

  if (isAuthenticated) {
    if (userRole && allowedRoles.includes(userRole)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(getDashboardPath(userRole), req.url));
  }

  const defaultRole = getDefaultRoleForPath(pathname);

  if (defaultRole === "officer" || defaultRole === "police_admin") {
    const loginUrl = new URL("/police/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const samlUrl = new URL("/api/auth/login/saml", req.url);
  samlUrl.searchParams.set("role", defaultRole!);
  samlUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(samlUrl);
}

export const config = {
  matcher: [
    "/",
    "/about-party-registration/:path*",
    "/about-party-smart/:path*",
    "/new-party/:path*",
    "/profile/:path*",
    "/staff/:path*",
    "/police/:path*",
  ],
};
