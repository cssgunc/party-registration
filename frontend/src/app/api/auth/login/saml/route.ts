import { identityProvider, serviceProvider } from "@/lib/saml";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

function createLoginRequestUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    serviceProvider.create_login_request_url(
      identityProvider,
      {},
      (error: Error | null, loginUrl: string) => {
        if (error) reject(error);
        else resolve(loginUrl);
      }
    );
  });
}

export async function GET() {
  const loginUrl = await createLoginRequestUrl();
  return NextResponse.redirect(loginUrl);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const body = Object.fromEntries(formData);
  const appBaseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;

  const { data, headers } = await axios.get(`${appBaseUrl}/api/auth/csrf`);
  const { csrfToken } = data;
  const encodedSAMLBody = encodeURIComponent(JSON.stringify(body));

  // Create a form that instantly submits to the SAML IdP so that the CSRF token is included in the request.
  // This is required by Next-Auth. Method derived from https://github.com/Jenyus-Org/next-auth-saml?tab=readme-ov-file#customizing
  const setCookie = headers["set-cookie"];
  const res = new NextResponse(
    `<html>
      <body>
        <form action="/api/auth/callback/saml" method="POST">
          <input type="hidden" name="csrfToken" value="${csrfToken}"/>
          <input type="hidden" name="samlBody" value="${encodedSAMLBody}"/>
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
