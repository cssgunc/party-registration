import { serverEnv } from "@/lib/config/env.server";
import fs from "fs";
import path from "path";
import * as saml2 from "saml2-js";

const certsDir = path.join(process.cwd(), "certs");

function loadCerts(): { privateKey: string; certificate: string } {
  try {
    return {
      privateKey: fs.readFileSync(path.join(certsDir, "key.pem"), "utf-8"),
      certificate: fs.readFileSync(path.join(certsDir, "cert.pem"), "utf-8"),
    };
  } catch (error) {
    throw new Error(
      [
        "Failed to load SAML Service Provider certificates from `frontend/certs`.",
        "If you're running in the Dev Container, the post-create script should generate `certs/key.pem` and `certs/cert.pem` automatically.",
        "If not, rebuild the Dev Container or manually create the certs as described in the README under 'SAML Dev Setup'.",
        `Original error: ${(error as Error).message}`,
      ].join(" ")
    );
  }
}

// SP and IDP are initialized lazily (on first request) rather than at module
// load time. Next.js executes module-level code during `npm run build` to
// collect page metadata — at that point, server env vars and cert files are
// not yet available (they're injected at container runtime, not build time).
// Deferring construction to the first actual request avoids a build-time crash.
let _sp: saml2.ServiceProvider | undefined;
let _idp: saml2.IdentityProvider | undefined;

function getServiceProvider(): saml2.ServiceProvider {
  if (!_sp) {
    const { privateKey, certificate } = loadCerts();
    _sp = new saml2.ServiceProvider({
      entity_id: serverEnv.SAML_SP_ENTITY_ID,
      private_key: privateKey,
      certificate,
      assert_endpoint: serverEnv.SAML_ASSERT_ENDPOINT,
    });
  }
  return _sp;
}

function getIdentityProvider(): saml2.IdentityProvider {
  if (!_idp) {
    _idp = new saml2.IdentityProvider({
      sso_login_url: serverEnv.SAML_IDP_SSO_LOGIN_URL,
      sso_logout_url: serverEnv.SAML_IDP_SSO_LOGOUT_URL,
      allow_unencrypted_assertion: serverEnv.SAML_ALLOW_UNENCRYPTED_ASSERTION,
      certificates: [serverEnv.SAML_IDP_CERT],
    });
  }
  return _idp;
}

/** Generate a redirect URL to send the user to the IdP for authentication. */
export function createLoginRequestUrl(relayState?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    getServiceProvider().create_login_request_url(
      getIdentityProvider(),
      { force_authn: true, relay_state: relayState },
      (error: Error | null, loginUrl: string) => {
        if (error) reject(error);
        else resolve(loginUrl);
      }
    );
  });
}

/** Parse and validate an incoming SAML POST assertion. */
export function postAssert(samlBody: Record<string, unknown>): Promise<{
  user: { name_id: string; attributes?: Record<string, string | string[]> };
}> {
  return new Promise((resolve, reject) => {
    getServiceProvider().post_assert(
      getIdentityProvider(),
      { request_body: samlBody },
      (
        error: Error | null,
        response: {
          user: {
            name_id: string;
            attributes?: Record<string, string | string[]>;
          };
        }
      ) => {
        if (error) reject(error);
        else resolve(response);
      }
    );
  });
}
