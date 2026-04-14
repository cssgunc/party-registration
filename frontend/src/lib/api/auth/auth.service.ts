import axios from "axios";
import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  PoliceLoginRequest,
  PoliceLoginResponse,
  PoliceSignupRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RetryPoliceVerificationRequest,
  TokenPair,
  VerifyPoliceEmailRequest,
} from "./auth.types";

const base =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

/**
 * Decodes the payload of a JWT without verifying its signature.
 * Only use on tokens already validated by the backend.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString());
}

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
 * refresh token cookie on the given response.
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
    path: "/",
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
  const resp = await axios.post<ExchangeTokenResponse>(
    `${base}/auth/exchange`,
    data,
    { headers: internalHeaders() }
  );
  return resp.data;
}

export async function refreshToken(
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  const resp = await axios.post<RefreshTokenResponse>(
    `${base}/auth/refresh`,
    data,
    { headers: internalHeaders() }
  );
  return resp.data;
}

export async function policeLogin(
  data: PoliceLoginRequest
): Promise<PoliceLoginResponse> {
  const resp = await axios.post<PoliceLoginResponse>(
    `${base}/auth/police/login`,
    data,
    { headers: internalHeaders() }
  );
  return resp.data;
}

export async function policeLoginViaRoute(
  data: PoliceLoginRequest
): Promise<void> {
  await axios.post("/api/auth/police/login", data);
}

export async function signupPolice(data: PoliceSignupRequest): Promise<void> {
  await axios.post(`${base}/auth/police/signup`, data);
}

export async function retryPoliceVerification(
  data: RetryPoliceVerificationRequest
): Promise<void> {
  await axios.post(`${base}/auth/police/retry-verification`, data);
}

export async function verifyPoliceEmail(
  data: VerifyPoliceEmailRequest
): Promise<void> {
  await axios.post(`${base}/auth/police/verify`, data);
}

/**
 * Calls the backend's /auth/logout route to revoke the refresh token.
 * @param refreshTokenValue The refresh token to revoke
 * @param accessToken The access token to use for authentication
 * @returns void
 */
export async function revokeRefreshToken(
  refreshTokenValue: string,
  accessToken: string
): Promise<void> {
  await axios.post(
    `${base}/auth/logout`,
    { refresh_token: refreshTokenValue },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
