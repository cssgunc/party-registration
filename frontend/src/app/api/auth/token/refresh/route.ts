import axios from "axios";
import { encode } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

function getSessionCookieName() {
  return process.env.NEXTAUTH_URL?.startsWith("https://")
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

// The refresh_token cookie is path-restricted to this route, so the browser
// only sends it here and nowhere else.
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

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

  try {
    const resp = await axios.post(
      `${base}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "X-Internal-Secret": process.env.INTERNAL_API_SECRET } }
    );

    const data = resp.data as {
      access_token: string;
      access_token_expires: string;
    };

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
