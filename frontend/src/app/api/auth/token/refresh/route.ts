import {
  refreshToken as exchangeRefreshToken,
  getSessionCookieName,
} from "@/lib/api/auth/auth.service";
import { encode } from "next-auth/jwt";
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

    const accessTokenExpires = new Date(data.access_token_expires).getTime();
    const refreshTokenExpires = token.refreshTokenExpires as number;
    const remainingMaxAge = Math.floor(
      (refreshTokenExpires - Date.now()) / 1000
    );
    const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");

    // Re-encode the session JWT with the updated access token
    const newSessionToken = await encode({
      token: { ...token, accessToken: data.access_token, accessTokenExpires },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: remainingMaxAge,
    });

    const res = NextResponse.json({
      access_token: data.access_token,
      access_token_expires: data.access_token_expires,
    });

    res.cookies.set(getSessionCookieName(), newSessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: remainingMaxAge,
      secure: !!isSecure,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 401 }
    );
  }
}
