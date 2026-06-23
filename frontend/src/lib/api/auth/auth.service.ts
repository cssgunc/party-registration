import apiClient from "@/lib/api/apiClient";
import { clientEnv } from "@/lib/config/env.client";
import { serverEnv } from "@/lib/config/env.server";
import axios from "axios";
import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type {
  AccessTokenPayload,
  CurrentPrincipal,
  ExchangeTokenRequest,
  ForgotPolicePasswordRequest,
  PoliceLoginRequest,
  PoliceLoginResponse,
  PoliceSignupRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPolicePasswordRequest,
  RetryPoliceVerificationRequest,
  TokenPair,
  VerifyPoliceEmailRequest,
} from "./auth.types";
import { accessTokenPayloadSchema } from "./auth.types";

const publicApiBase = clientEnv.NEXT_PUBLIC_API_BASE_URL;

/**
 * Decodes the payload of a JWT without verifying its signature.
 * Only use on tokens already validated by the backend.
 */
export function decodeAccessTokenPayload(token: string): AccessTokenPayload {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return accessTokenPayloadSchema.parse(
    JSON.parse(Buffer.from(base64, "base64").toString())
  );
}

/** Returns the `X-Internal-Secret` header used for server-to-server auth calls. */
function internalHeaders() {
  return { "X-Internal-Secret": serverEnv.INTERNAL_API_SECRET };
}

/**
 * Returns the correct NextAuth session cookie name for the current environment.
 *
 * Uses the `__Secure-` prefix on HTTPS (production) and the plain name on HTTP
 * (local dev), matching NextAuth's own cookie-naming convention.
 */
function getSessionCookieName() {
  return serverEnv.NEXTAUTH_URL.startsWith("https://")
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
  const isSecure = serverEnv.NEXTAUTH_URL.startsWith("https://");

  const sessionToken = await encode({
    token: {
      ...jwtClaims,
      accessToken: tokens.access_token,
      accessTokenExpires,
      refreshTokenExpires,
    },
    secret: serverEnv.NEXTAUTH_SECRET,
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
  const isSecure = serverEnv.NEXTAUTH_URL.startsWith("https://");

  const sessionToken = await encode({
    token: {
      ...existingToken,
      accessToken: newAccessToken,
      accessTokenExpires,
    },
    secret: serverEnv.NEXTAUTH_SECRET,
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

/**
 * Exchanges a SAML-derived identity payload for a backend token pair
 * (`POST /auth/exchange`). Called server-side after IdP callback.
 */
export async function exchangeToken(
  data: ExchangeTokenRequest
): Promise<TokenPair> {
  const resp = await axios.post<TokenPair>(
    `${serverEnv.API_BASE_URL}/auth/exchange`,
    data,
    { headers: internalHeaders() }
  );
  return resp.data;
}

/**
 * Exchanges a refresh token for a new access token (`POST /auth/refresh`).
 * Called server-side; uses the internal secret header.
 */
export async function refreshToken(
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  const resp = await axios.post<RefreshTokenResponse>(
    `${serverEnv.API_BASE_URL}/auth/refresh`,
    data,
    { headers: internalHeaders() }
  );
  return resp.data;
}

/**
 * Authenticates a police account with email/password (`POST /auth/police/login`).
 * Called server-side via the Next.js API route; returns a full token pair on success.
 */
export async function policeLogin(
  data: PoliceLoginRequest
): Promise<PoliceLoginResponse> {
  const resp = await axios.post<PoliceLoginResponse>(
    `${serverEnv.API_BASE_URL}/auth/police/login`,
    data,
    { headers: internalHeaders() }
  );
  return resp.data;
}

/**
 * Submits police login credentials to the Next.js API route (`POST /api/auth/police/login`).
 * Client-side counterpart to `policeLogin` — the route handler calls the backend and sets cookies.
 */
export async function policeLoginViaRoute(
  data: PoliceLoginRequest
): Promise<void> {
  await axios.post("/api/auth/police/login", data);
}

/** Registers a new police account (`POST /auth/police/signup`). Sends a verification email. */
export async function signupPolice(data: PoliceSignupRequest): Promise<void> {
  await axios.post(`${publicApiBase}/auth/police/signup`, data);
}

/** Re-sends the verification email for a police account (`POST /auth/police/retry-verification`). */
export async function retryPoliceVerification(
  data: RetryPoliceVerificationRequest
): Promise<void> {
  await axios.post(`${publicApiBase}/auth/police/retry-verification`, data);
}

/** Verifies a police account email using the token from the verification link (`POST /auth/police/verify`). */
export async function verifyPoliceEmail(
  data: VerifyPoliceEmailRequest
): Promise<void> {
  await axios.post(`${publicApiBase}/auth/police/verify`, data);
}

/**
 * Revokes the given refresh token via `POST /auth/logout`, ending the session server-side.
 *
 * @param refreshTokenValue - The refresh token to invalidate.
 * @param accessToken - Bearer token used to authenticate the logout request.
 */
export async function revokeRefreshToken(
  refreshTokenValue: string,
  accessToken: string
): Promise<void> {
  await axios.post(
    `${publicApiBase}/auth/logout`,
    { refresh_token: refreshTokenValue },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

/** Fetches the currently authenticated principal from `GET /auth/me`. */
export async function getCurrentPrincipal(): Promise<CurrentPrincipal> {
  const response = await apiClient.get<CurrentPrincipal>("/auth/me");
  return response.data;
}

/** Initiates the password-reset flow by emailing a reset link (`POST /auth/police/forgot-password`). */
export async function forgotPolicePassword(
  data: ForgotPolicePasswordRequest
): Promise<void> {
  await axios.post(`${publicApiBase}/auth/police/forgot-password`, data);
}

/** Sets a new password for a police account using the token from the reset email (`POST /auth/police/reset-password`). */
export async function resetPolicePassword(
  data: ResetPolicePasswordRequest
): Promise<void> {
  await axios.post(`${publicApiBase}/auth/police/reset-password`, data);
}
