import { AccountRole } from "@/lib/api/account/account.types";
import {
  decodeJwtPayload,
  exchangeToken,
  setAuthCookies,
} from "@/lib/api/auth/auth.service";
import { identityProvider, postAssert, serviceProvider } from "@/lib/saml";
import { AxiosError } from "axios";
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

const ACCOUNT_ROLES: AccountRole[] = ["student", "staff", "admin"];

function isAccountRole(value: unknown): value is AccountRole {
  return ACCOUNT_ROLES.includes(value as AccountRole);
}

function getSessionAccountIdFromAccessToken(accessToken: string): number {
  const payload = decodeJwtPayload(accessToken);
  const subject = payload.sub;

  if (typeof subject !== "string" && typeof subject !== "number") {
    throw new Error("Backend access token is missing a valid subject");
  }

  return Number(subject);
}

/**
 * Initiates the SAML login flow. Called by the frontend (e.g. a "Sign in"
 * link) to redirect the user to the Identity Provider (IdP) for
 * authentication.
 *
 * Query params:
 *  - callbackUrl: where to send the user after login completes
 *  - role: the account role to log in as ("student", "staff", "admin")
 *
 * Both values are round-tripped through the SAML RelayState so they
 * survive the redirect to the IdP and back.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;
  const role = searchParams.get("role") ?? undefined;

  const relayState: SamlRelayState = {};
  if (callbackUrl) relayState.callbackUrl = callbackUrl;
  if (isAccountRole(role)) relayState.role = role;

  const encodedRelayState =
    Object.keys(relayState).length > 0 ? JSON.stringify(relayState) : undefined;

  const loginUrl = await createLoginRequestUrl(encodedRelayState);
  return NextResponse.redirect(loginUrl);
}

/**
 * Assertion Consumer Service (ACS) endpoint. Called by the IdP — not by
 * our own frontend — after the user authenticates. The IdP POSTs a signed
 * SAML assertion containing the user's identity attributes.
 *
 * This handler:
 *  1. Validates the SAML assertion signature
 *  2. Extracts identity attributes (email, name, PID, Onyen)
 *  3. Exchanges them with the backend for access/refresh tokens
 *  4. Encodes a NextAuth session JWT and sets session + refresh cookies
 *  5. Redirects the user to the original callbackUrl
 */
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
  let role: AccountRole | undefined;
  const rawRelayState = body.RelayState as string | undefined;
  if (rawRelayState) {
    try {
      const relayState = JSON.parse(rawRelayState) as SamlRelayState;
      if (relayState.callbackUrl) callbackUrl = relayState.callbackUrl;
      if (isAccountRole(relayState.role)) role = relayState.role;
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
  let tokens;
  try {
    tokens = await exchangeToken({
      email,
      first_name: firstName,
      last_name: lastName,
      pid,
      onyen,
      role,
    });
  } catch (error) {
    const status = (error as AxiosError)?.response?.status;
    console.error("Backend token exchange failed:", error);
    return errorUrl(status === 403 ? "AccessDenied" : "ExchangeFailed");
  }

  const accountId = getSessionAccountIdFromAccessToken(tokens.access_token);
  const res = NextResponse.redirect(new URL(callbackUrl, origin));

  await setAuthCookies(res, tokens, {
    sub: accountId,
    id: accountId,
    email,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    onyen,
    pid,
    role,
  });

  return res;
}
