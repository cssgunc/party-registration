import fs from "fs";
import path from "path";
import * as saml2 from "saml2-js";

const certsDir = path.join(process.cwd(), "certs");

export const serviceProvider = new saml2.ServiceProvider({
  entity_id: process.env.SAML_SP_ENTITY_ID!,
  private_key: fs.readFileSync(path.join(certsDir, "key.pem"), "utf-8"),
  certificate: fs.readFileSync(path.join(certsDir, "cert.pem"), "utf-8"),
  assert_endpoint: process.env.SAML_ASSERT_ENDPOINT!,
});

export const identityProvider = new saml2.IdentityProvider({
  sso_login_url: process.env.SAML_IDP_SSO_LOGIN_URL!,
  sso_logout_url: process.env.SAML_IDP_SSO_LOGOUT_URL!,
  allow_unencrypted_assertion:
    process.env.SAML_ALLOW_UNENCRYPTED_ASSERTION !== "false",
  certificates: [process.env.SAML_IDP_CERT!],
});
