import { AppRole } from "@/lib/api/account/account.types";
import { getAllowedRoles, getDashboardPath } from "@/lib/auth/route-access";
import { serverEnv } from "@/lib/config/env.server";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/police/login"]);
const PUBLIC_POLICE_PATHS = new Set([
  "/police/signup",
  "/police/verify",
  "/police/forgot-password",
  "/police/reset-password",
]);

/**
 * Infer which role a path is intended for when the user is unauthenticated, so
 * the request can be routed to the correct login (police login vs. SAML SSO).
 */
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

/**
 * Route-access middleware run on every matched request.
 *
 * Lets public police auth paths through, redirects authenticated users to their
 * dashboard when they lack the required role (or hit the login page), and sends
 * unauthenticated users to police login or SAML SSO based on the target path.
 */
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
