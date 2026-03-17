import { getSessionCookieName, policeLogin } from "@/lib/api/auth/auth.service";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const data = await policeLogin({ email, password });

    const accessTokenExpires = new Date(data.access_token_expires).getTime();
    const refreshTokenExpires = new Date(data.refresh_token_expires).getTime();
    const refreshMaxAge = Math.floor((refreshTokenExpires - Date.now()) / 1000);
    const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");

    // Encode the NextAuth session JWT — identity + access token only.
    // The refresh token is intentionally excluded and stored separately below.
    const sessionToken = await encode({
      token: {
        sub: "police",
        id: "police",
        email,
        name: email,
        role: "police",
        accessToken: data.access_token,
        accessTokenExpires,
        refreshTokenExpires,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: refreshMaxAge,
    });

    const res = NextResponse.json({ ok: true });

    // Session cookie — carries identity and the short-lived access token.
    res.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: refreshMaxAge,
      secure: !!isSecure,
    });

    // Refresh token cookie — path-restricted so the browser can only send it
    // to /api/auth/token/refresh and no other endpoint.
    res.cookies.set("refresh_token", data.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth/token/refresh",
      maxAge: refreshMaxAge,
      secure: !!isSecure,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
