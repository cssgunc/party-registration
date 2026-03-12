import { identityProvider, postAssert, serviceProvider } from "@/lib/saml";
import axios, { AxiosError } from "axios";
import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

interface SamlRelayState {
  callbackUrl?: string;
  role?: string;
}

function createLoginRequestUrl(relayState?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    serviceProvider.create_login_request_url(
      identityProvider,
      {
        force_authn: process.env.NODE_ENV === "production" ? false : true, // Forces users to re-authenticate on every login in development
        relay_state: relayState,
      },
      (error: Error | null, loginUrl: string) => {
        if (error) reject(error);
        else resolve(loginUrl);
      }
    );
  });
}

const SAML_ROLES = ["student", "staff", "admin"] as const;
type SamlRole = (typeof SAML_ROLES)[number];

function isSamlRole(value: unknown): value is SamlRole {
  return SAML_ROLES.includes(value as SamlRole);
}

function getSessionCookieName() {
  return process.env.NEXTAUTH_URL?.startsWith("https://")
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;
  const role = searchParams.get("role") ?? undefined;

  const relayState: SamlRelayState = {};
  if (callbackUrl) relayState.callbackUrl = callbackUrl;
  if (isSamlRole(role)) relayState.role = role;

  const encodedRelayState =
    Object.keys(relayState).length > 0 ? JSON.stringify(relayState) : undefined;

  const loginUrl = await createLoginRequestUrl(encodedRelayState);
  return NextResponse.redirect(loginUrl);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const body = Object.fromEntries(formData) as Record<string, unknown>;

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const errorUrl = (msg: string) =>
    NextResponse.redirect(
      new URL(`/api/auth/error?error=${encodeURIComponent(msg)}`, origin),
      { status: 303 }
    );

  // Parse relay state passed back by the IdP unchanged
  let callbackUrl = "/";
  let role: SamlRole | undefined;
  const rawRelayState = body.RelayState as string | undefined;
  if (rawRelayState) {
    try {
      const relayState = JSON.parse(rawRelayState) as SamlRelayState;
      if (relayState.callbackUrl) callbackUrl = relayState.callbackUrl;
      if (isSamlRole(relayState.role)) role = relayState.role;
    } catch {
      console.error("Failed to parse SAML RelayState:", rawRelayState);
    }
  }

  if (!role) {
    return errorUrl("MissingRole");
  }

  // Validate the SAML assertion
  let samlUser: {
    name_id: string;
    attributes?: Record<string, string | string[]>;
  };
  try {
    const result = await postAssert(body);
    samlUser = result.user;
  } catch (error) {
    console.error("SAML assertion failed:", error);
    return errorUrl("SAMLAssertionFailed");
  }

  const attrs = samlUser.attributes ?? {};
  // SAML attribute values can be a single string or an array of strings
  const attr = (key: string) => {
    const val = attrs[key];
    return Array.isArray(val) ? val[0] : val;
  };
  const email = attr("mail");
  const firstName = attr("givenName") ?? "";
  const lastName = attr("sn") ?? "";
  const onyen = attr("uid") ?? "";
  const pid = attr("pid") ?? "";

  if (!email) {
    return errorUrl("MissingEmail");
  }

  // Exchange the verified identity for backend tokens
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

  let tokens: {
    access_token: string;
    access_token_expires: string;
    refresh_token: string;
    refresh_token_expires: string;
  };
  try {
    const resp = await axios.post(
      `${base}/auth/exchange`,
      { email, first_name: firstName, last_name: lastName, pid, onyen, role },
      { headers: { "X-Internal-Secret": process.env.INTERNAL_API_SECRET } }
    );
    tokens = resp.data as typeof tokens;
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    console.error("Backend token exchange failed:", error);
    return errorUrl(status === 403 ? "AccessDenied" : "ExchangeFailed");
  }

  const accessTokenExpires = new Date(tokens.access_token_expires).getTime();
  const refreshTokenExpires = new Date(tokens.refresh_token_expires).getTime();
  const refreshMaxAge = Math.floor((refreshTokenExpires - Date.now()) / 1000);
  const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");

  // Encode the NextAuth session JWT — identity + access token, no refresh token
  const sessionToken = await encode({
    token: {
      sub: samlUser.name_id,
      id: samlUser.name_id,
      email,
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      onyen,
      pid,
      role,
      accessToken: tokens.access_token,
      accessTokenExpires,
      refreshTokenExpires,
    },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: refreshMaxAge,
  });

  const res = NextResponse.redirect(new URL(callbackUrl, origin));

  // Session cookie — carries identity and the short-lived access token
  res.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
    secure: !!isSecure,
  });

  // Refresh token cookie — path-restricted so the browser can only send it
  // to /api/auth/token/refresh and no other endpoint
  res.cookies.set("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/token/refresh",
    maxAge: refreshMaxAge,
    secure: !!isSecure,
  });

  return res;
}
