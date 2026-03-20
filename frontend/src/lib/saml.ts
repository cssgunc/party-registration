import fs from "fs";
import path from "path";
import * as saml2 from "saml2-js";

const certsDir = path.join(process.cwd(), "certs");

let spPrivateKey: string;
let spCertificate: string;

try {
  spPrivateKey = fs.readFileSync(path.join(certsDir, "key.pem"), "utf-8");
  spCertificate = fs.readFileSync(path.join(certsDir, "cert.pem"), "utf-8");
} catch (error) {
  const messageLines = [
    "Failed to load SAML Service Provider certificates from `frontend/certs`.",
    "If you're running in the Dev Container, the post-create script should generate `certs/key.pem` and `certs/cert.pem` automatically.",
    "If not, rebuild the Dev Container or manually create the certs as described in the README under 'SAML Dev Setup'.",
    `Original error: ${(error as Error).message}`,
  ];
  throw new Error(messageLines.join(" "));
}

export const serviceProvider = new saml2.ServiceProvider({
  entity_id: process.env.SAML_SP_ENTITY_ID!,
  private_key: spPrivateKey,
  certificate: spCertificate,
  assert_endpoint: process.env.SAML_ASSERT_ENDPOINT!,
});

export const identityProvider = new saml2.IdentityProvider({
  sso_login_url: process.env.SAML_IDP_SSO_LOGIN_URL!,
  sso_logout_url: process.env.SAML_IDP_SSO_LOGOUT_URL!,
  allow_unencrypted_assertion:
    process.env.SAML_ALLOW_UNENCRYPTED_ASSERTION !== "false",
  certificates: [process.env.SAML_IDP_CERT!],
});
