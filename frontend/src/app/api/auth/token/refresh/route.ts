import {
  refreshToken as exchangeRefreshToken,
  refreshSessionCookie,
} from "@/lib/api/auth/auth.service";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Refreshes an expired access token. Called by the frontend's axios
 * interceptor when the current access token has expired but the
 * longer-lived refresh token is still valid.
 *
 * The refresh_token cookie is path-restricted to this route, so the
 * browser only sends it here and nowhere else. On success, a new
 * session JWT with the fresh access token is written back to the
 * session cookie.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  if (
    token.refreshTokenExpires &&
    Date.now() >= (token.refreshTokenExpires as number)
  ) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  try {
    const data = await exchangeRefreshToken({
      refresh_token: refreshToken,
    });

    const res = NextResponse.json({
      access_token: data.access_token,
      access_token_expires: data.access_token_expires,
    });

    await refreshSessionCookie(
      res,
      token as Record<string, unknown>,
      data.access_token,
      data.access_token_expires
    );

    return res;
  } catch {
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 401 }
    );
  }
}
