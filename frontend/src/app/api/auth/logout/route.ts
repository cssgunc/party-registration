import { revokeRefreshToken } from "@/lib/api/auth/auth.service";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side logout route that revokes the refresh token on the backend
 * and clears the refresh_token cookie. NextAuth session cookies are cleared
 * by the subsequent signOut() call on the client.
 */
export async function POST(req: NextRequest) {
  const refreshTokenValue = req.cookies.get("refresh_token")?.value;
  const token = await getToken({ req });
  const accessToken = token?.accessToken as string | undefined;

  if (refreshTokenValue && accessToken) {
    try {
      await revokeRefreshToken(refreshTokenValue, accessToken);
    } catch {
      // Best-effort: even if revocation fails we still clear the cookie
    }
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("refresh_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
