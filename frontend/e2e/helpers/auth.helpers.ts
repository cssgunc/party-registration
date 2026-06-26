import { type APIRequestContext, type Page } from "@playwright/test";

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
  // The SAML flow redirects the browser to localhost:8080. The socat proxy
  // started in global-setup.ts forwards that to saml-idp:8080 (bridging the
  // container's IPv4→IPv6 gap), so no in-browser URL rewriting is needed here.
  await page.goto(
    `/api/auth/login/saml?role=${role}&callbackUrl=${encodeURIComponent(callbackUrl)}`
  );

  await page.locator('[name="username"]').waitFor();
  await page.locator('[name="username"]').fill(username);
  await page.locator('[name="password"]').fill(password);
  await page.locator('[name="password"]').press("Enter");

  // After the IdP POST assertion, Next.js redirects back to the app.
  await page.waitForURL(`**${callbackUrl}`, { timeout: 30_000 });

  // The staff area is tab-driven and settles more reliably when opened on its
  // default route; the specs switch tabs explicitly after login.
  if (callbackUrl.startsWith("/staff/")) {
    await page.goto("/staff/parties");
  } else {
    await page.goto(callbackUrl);
  }
}

/** Logs in as the seeded admin account (johndoe / admin1 / admin role). */
export async function loginAsAdmin(page: Page, callbackUrl = "/staff/parties") {
  await loginViaSaml(page, "admin1", "admin1pass", "admin", callbackUrl);
}

/** Logs in as the seeded student account (stevenmorrison / student1 / student role). */
export async function loginAsStudent(page: Page, callbackUrl = "/") {
  await loginViaSaml(page, "student1", "student1pass", "student", callbackUrl);
}

/** Logs in as the seeded staff account (janesmith / staff1 / staff role). */
export async function loginAsStaff(page: Page, callbackUrl = "/staff/parties") {
  await loginViaSaml(page, "staff1", "staff1pass", "staff", callbackUrl);
}

/**
 * Logs in as a police account via the /police/login form (not SAML).
 *
 * Police accounts are stored in the app's own database, not the SAML IdP.
 */
async function loginAsPolice(
  page: Page,
  email: string,
  callbackUrl: string
): Promise<void> {
  await page.goto(
    `/police/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
  );
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill("securepassword");
  await page.locator('[name="password"]').press("Enter");
  // Wait until we've actually left the login page. Police login redirects to
  // callbackUrl, which may itself redirect further (e.g. /police/admin →
  // /police/admin/accounts). Matching `**${callbackUrl}**` is unsafe because a
  // callbackUrl like "/police" also matches the "/police/login" page we start
  // on, resolving the wait before authentication completes.
  await page.waitForURL((url) => !url.pathname.startsWith("/police/login"));
}

/** Logs in as the seeded officer account (jcarter@chapelhillnc.gov). */
export async function loginAsOfficer(page: Page, callbackUrl = "/police") {
  await loginAsPolice(page, "jcarter@chapelhillnc.gov", callbackUrl);
}

/** Logs in as the seeded police admin account (dreyes@chapelhillnc.gov). */
export async function loginAsPoliceAdmin(page: Page, callbackUrl = "/police") {
  await loginAsPolice(page, "dreyes@chapelhillnc.gov", callbackUrl);
}

/**
 * Drives the /police/signup page to create a new, unverified police account.
 *
 * Fills email, password, and confirm_password, submits the form, and waits
 * for the success state ("Check your email to verify your account…").
 *
 * The email must end in the CHPD domain (chapelhillnc.gov by default).
 * Password must be ≥ 8 characters.
 */
export async function signupPolice(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/police/signup");
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('[name="confirm_password"]').fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page
    .getByText("Check your email to verify your account before logging in.")
    .waitFor();
}

/**
 * Fast-path API seeding: POSTs directly to the backend signup endpoint to
 * create an unverified police account without driving the browser UI.
 *
 * Use this in beforeAll/beforeEach blocks when you only need the account to
 * exist (e.g. to test login failures or the verification flow itself).
 */
export async function signupPoliceViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<void> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  const res = await request.post(`${apiBase}/auth/police/signup`, {
    data: { email, password, confirm_password: password },
  });
  if (!res.ok()) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(
      `signupPoliceViaApi: POST ${apiBase}/auth/police/signup failed with ${res.status()} — ${body}`
    );
  }
}
