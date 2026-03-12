import { identityProvider, serviceProvider } from "@/lib/saml";
import axios from "axios";
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
  const body = Object.fromEntries(formData);

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

  // Grab the CSRF token from the API endpoint
  let headers, csrfToken, encodedSAMLBody;
  try {
    const appBaseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    const res = await axios.get(`${appBaseUrl}/api/auth/csrf`);
    headers = res.headers;
    csrfToken = res.data?.csrfToken;
    encodedSAMLBody = encodeURIComponent(JSON.stringify(body));
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch CSRF token. Please check that NEXTAUTH_URL is set correctly and points to this app (e.g. http://localhost:3000 in development).",
      },
      { status: 500 }
    );
  }

  // Create a form that instantly submits to the SAML IdP so that the CSRF token is included in the request.
  // This is required by Next-Auth. Method derived from https://github.com/Jenyus-Org/next-auth-saml?tab=readme-ov-file#customizing
  const setCookie = headers["set-cookie"];
  const res = new NextResponse(
    `<html>
      <body>
        <form action="/api/auth/callback/saml" method="POST">
          <input type="hidden" name="csrfToken" value="${csrfToken}"/>
          <input type="hidden" name="samlBody" value="${encodedSAMLBody}"/>
          <input type="hidden" name="callbackUrl" value="${callbackUrl}"/>
          ${role ? `<input type="hidden" name="role" value="${role}"/>` : ""}
        </form>
        <script>document.forms[0].submit();</script>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );

  if (setCookie) {
    for (const cookie of Array.isArray(setCookie) ? setCookie : [setCookie]) {
      res.headers.append("set-cookie", cookie);
    }
  }

  return res;
}
