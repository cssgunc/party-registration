import axios from "axios";
import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  PoliceLoginRequest,
  PoliceLoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TokenPair,
} from "./auth.types";

const base =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

function internalHeaders() {
  return { "X-Internal-Secret": process.env.INTERNAL_API_SECRET };
}

function getSessionCookieName() {
  return process.env.NEXTAUTH_URL?.startsWith("https://")
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

/**
 * Encodes a NextAuth session JWT and sets both the session cookie and the
 * path-restricted refresh token cookie on the given response.
 *
 * @param res       The NextResponse to attach cookies to.
 * @param tokens    The token pair returned by the backend.
 * @param jwtClaims Identity claims for the session JWT (e.g. email, role).
 *                  `accessToken`, `accessTokenExpires`, and `refreshTokenExpires`
 *                  are added automatically from `tokens`.
 */
export async function setAuthCookies(
  res: NextResponse,
  tokens: TokenPair,
  jwtClaims: Record<string, unknown>
): Promise<void> {
  const accessTokenExpires = new Date(tokens.access_token_expires).getTime();
  const refreshTokenExpires = new Date(tokens.refresh_token_expires).getTime();
  const refreshMaxAge = Math.floor((refreshTokenExpires - Date.now()) / 1000);
  const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");

  const sessionToken = await encode({
    token: {
      ...jwtClaims,
      accessToken: tokens.access_token,
      accessTokenExpires,
      refreshTokenExpires,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: refreshMaxAge,
  });

  res.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
    secure: !!isSecure,
  });

  res.cookies.set("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/token/refresh",
    maxAge: refreshMaxAge,
    secure: !!isSecure,
  });
}

/**
 * Re-encodes the existing session JWT with a fresh access token and
 * updates only the session cookie. Used during token refresh — the
 * refresh token cookie is untouched since it hasn't changed.
 */
export async function refreshSessionCookie(
  res: NextResponse,
  existingToken: Record<string, unknown>,
  newAccessToken: string,
  newAccessTokenExpires: string
): Promise<void> {
  const accessTokenExpires = new Date(newAccessTokenExpires).getTime();
  const refreshTokenExpires = existingToken.refreshTokenExpires as number;
  const remainingMaxAge = Math.floor((refreshTokenExpires - Date.now()) / 1000);
  const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");

  const sessionToken = await encode({
    token: {
      ...existingToken,
      accessToken: newAccessToken,
      accessTokenExpires,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: remainingMaxAge,
  });

  res.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: remainingMaxAge,
    secure: !!isSecure,
  });
}

export async function exchangeToken(
  data: ExchangeTokenRequest
): Promise<ExchangeTokenResponse> {
  const resp = await axios.post(`${base}/auth/exchange`, data, {
    headers: internalHeaders(),
  });
  return resp.data as ExchangeTokenResponse;
}

export async function refreshToken(
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  const resp = await axios.post(`${base}/auth/refresh`, data, {
    headers: internalHeaders(),
  });
  return resp.data as RefreshTokenResponse;
}

export async function policeLogin(
  data: PoliceLoginRequest
): Promise<PoliceLoginResponse> {
  const resp = await axios.post(`${base}/auth/police/login`, data, {
    headers: internalHeaders(),
  });
  return resp.data as PoliceLoginResponse;
}
