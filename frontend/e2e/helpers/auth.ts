import { Page } from "@playwright/test";

type SamlRole = "student" | "staff" | "admin";

/**
 * Performs a full SAML login through the mock SimpleSAMLphp IdP.
 *
 * Flow:
 *  1. Navigate to /api/auth/login/saml  →  Next.js redirects to IdP
 *  2. Fill credentials on the SimpleSAMLphp form
 *  3. IdP POSTs assertion back to /api/auth/login/saml via browser form
 *  4. Next.js sets NextAuth + backend JWT cookies, redirects to callbackUrl
 */
export async function loginViaSaml(
  page: Page,
  username: string,
  password: string,
  role: SamlRole,
  callbackUrl = "/"
) {
  await page.goto(
    `/api/auth/login/saml?role=${role}&callbackUrl=${encodeURIComponent(callbackUrl)}`
  );

  // Wait for redirect to the SimpleSAMLphp login page.
  const idpOrigin = new URL(
    process.env.SAML_IDP_SSO_LOGIN_URL ?? "http://localhost:8080"
  ).origin;
  await page.waitForURL(`${idpOrigin}/**`);

  await page.locator('[name="username"]').fill(username);
  await page.locator('[name="password"]').fill(password);
  await page.locator('[name="password"]').press("Enter");

  // After the IdP POST assertion, Next.js redirects back to the app.
  await page.waitForURL(`**${callbackUrl}`, { timeout: 15_000 });

  // The staff area is tab-driven and settles more reliably when opened on its
  // default route; the specs switch tabs explicitly after login.
  if (callbackUrl.startsWith("/staff/")) {
    await page.goto("/staff/parties");
  } else {
    await page.goto(callbackUrl);
  }
}

/** Logs in as the seeded admin account (johndoe / admin1 / admin role). */
export async function loginAsAdmin(
  page: Page,
  callbackUrl = "/staff/accounts"
) {
  await loginViaSaml(page, "admin1", "admin1pass", "admin", callbackUrl);
}

/** Logs in as the seeded staff account (janesmith / staff1 / staff role). */
export async function loginAsStaff(page: Page, callbackUrl = "/staff/parties") {
  await loginViaSaml(page, "staff1", "staff1pass", "staff", callbackUrl);
}
