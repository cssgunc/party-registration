import { AppRole } from "@/lib/api/account/account.types";
import { getAllowedRoles, getDashboardPath } from "@/lib/auth/route-access";
import { serverEnv } from "@/lib/config/env.server";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/police/login"]);
const PUBLIC_POLICE_PATHS = new Set(["/police/signup", "/police/verify"]);

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

  const allowedRoles = getAllowedRoles(pathname);
  if (allowedRoles.length === 0) return NextResponse.next();

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
