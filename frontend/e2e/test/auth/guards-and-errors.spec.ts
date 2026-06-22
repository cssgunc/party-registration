import {
  ADMIN_AUTH_FILE,
  OFFICER_AUTH_FILE,
  POLICE_AUTH_FILE,
  STAFF_AUTH_FILE,
  STUDENT_AUTH_FILE,
} from "../../global-setup";
import { loginViaSaml } from "../../helpers/auth.helpers";
import { createExpiredInvite, resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { ADMIN2, STUDENT2 } from "../../helpers/seed-state.helpers";
import {
  openStaffTab,
  selectSidebarCombobox,
  waitForTableReady,
} from "../../helpers/table.helpers";

// ==============================================================================
// Route Guards and Error Pages
// ==============================================================================

test.describe("Route Guards and Errors", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  // --- Unauthenticated redirect -------------------------------------------------

  test("unauthenticated access to /police redirects to /police/login with callbackUrl", async ({
    page,
  }) => {
    await page.goto("/police");
    await expect(page).toHaveURL(/\/police\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("callbackUrl")).toBe("/police");
  });

  // --- Cross-role redirects (authenticated) ------------------------------------

  test.describe("student role", () => {
    test.use({ storageState: STUDENT_AUTH_FILE });

    test("student visiting /police is redirected to /", async ({ page }) => {
      await page.goto("/police");
      // getDashboardPath("student") → "/"
      await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
    });
  });

  test.describe("officer role", () => {
    test.use({ storageState: OFFICER_AUTH_FILE });

    test("officer visiting /staff is redirected to /police", async ({
      page,
    }) => {
      await page.goto("/staff");
      // getDashboardPath("officer") → "/police"
      await expect(page).toHaveURL(/\/police/);
    });
  });

  test.describe("police role (admin)", () => {
    test.use({ storageState: POLICE_AUTH_FILE });

    test("police admin visiting / is redirected to /police", async ({
      page,
    }) => {
      await page.goto("/");
      // getDashboardPath("police_admin") → "/police"
      await expect(page).toHaveURL(/\/police/);
    });
  });

  // --- SAML AccessDenied -------------------------------------------------------

  test("SAML: uninvited user logging in as staff gets student tokens and is redirected to /", async ({
    page,
  }) => {
    // ADMIN2 (priyapatel) has a valid SAML identity but is NOT provisioned in
    // the database and has no invite. The exchange succeeds with student-role
    // tokens, so the staff-area middleware bounces them back to /.
    await page.goto(
      `/api/auth/login/saml?role=staff&callbackUrl=${encodeURIComponent("/staff/parties")}`
    );
    await page.locator('[name="username"]').waitFor();
    await page.locator('[name="username"]').fill(ADMIN2.username);
    await page.locator('[name="password"]').fill(ADMIN2.password);
    await page.locator('[name="password"]').press("Enter");

    await page.waitForURL(/^http:\/\/localhost:3000\/$/, { timeout: 30_000 });
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
  });

  // --- Logout ------------------------------------------------------------------

  test.describe("police logout", () => {
    test.use({ storageState: OFFICER_AUTH_FILE });

    test("officer logout redirects to /police/login", async ({ page }) => {
      await page.goto("/police");

      // Open the header user-menu and click Logout
      await page.getByRole("button", { name: "Open user menu" }).click();
      await page.getByRole("menuitem", { name: "Logout" }).click();

      // Police accounts redirect to /police/login on sign-out
      await expect(page).toHaveURL(/\/police\/login/);
    });
  });

  test.describe("SAML (staff) logout", () => {
    test.use({ storageState: STAFF_AUTH_FILE });

    test("staff logout redirects to IdP login", async ({ page }) => {
      await page.goto("/staff");

      // Open the header user-menu and click Logout
      await page.getByRole("button", { name: "Open user menu" }).click();
      await page.getByRole("menuitem", { name: "Logout" }).click();

      // SAML sign-out clears the session; the middleware then redirects the
      // unauthenticated request for "/" to the SAML IdP login page.
      await expect(page).toHaveURL(/localhost:8080/);
    });
  });

  // --- Expired-invite scenarios (regression) ------------------------------------

  test("expired staff invite for a student email does NOT block their student login", async ({
    page,
  }) => {
    // An admin invited an existing student to staff but the invite expired
    // before they accepted. Their next student login should be unaffected.
    createExpiredInvite(STUDENT2.email, "staff");

    await loginViaSaml(
      page,
      STUDENT2.username,
      STUDENT2.password,
      "student",
      "/"
    );

    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
    await expect(page).not.toHaveURL(/auth-error/);
  });

  test("expired staff invite during a staff login attempt shows AccessDenied", async ({
    page,
  }) => {
    // When the user actively tries to log in as staff with an expired invite,
    // they should still get an error — the invite is too late to claim.
    createExpiredInvite(STUDENT2.email, "staff");

    await page.goto(
      `/api/auth/login/saml?role=staff&callbackUrl=${encodeURIComponent("/staff/parties")}`
    );
    await page.locator('[name="username"]').waitFor();
    await page.locator('[name="username"]').fill(STUDENT2.username);
    await page.locator('[name="password"]').fill(STUDENT2.password);
    await page.locator('[name="password"]').press("Enter");

    await page.waitForURL(/auth-error/, { timeout: 30_000 });
    await expect(page).toHaveURL(/auth-error/);
  });

  test.describe("admin re-invite after expiry", () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    test("admin sending a new invite after expiry allows staff login", async ({
      page,
      browser,
    }) => {
      // Seed expired invite then have admin issue a fresh one through the UI.
      // create_invite detects the expired row, deletes it, and creates a new valid token.
      createExpiredInvite(STUDENT2.email, "staff");

      await page.goto("/staff/accounts");
      await openStaffTab(page, "Accounts");
      await waitForTableReady(page);
      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill(STUDENT2.email);
      await selectSidebarCombobox(page, 0, "Staff");
      await page.getByRole("button", { name: "Send Invite" }).click();
      await waitForTableReady(page);

      // Log in as student2 in a fresh context (no pre-existing admin cookies).
      const freshCtx = await browser.newContext();
      const freshPage = await freshCtx.newPage();
      try {
        await loginViaSaml(
          freshPage,
          STUDENT2.username,
          STUDENT2.password,
          "staff",
          "/staff/parties"
        );
        await expect(freshPage).toHaveURL(/\/staff/);
        await expect(freshPage).not.toHaveURL(/auth-error/);
      } finally {
        await freshCtx.close();
      }
    });
  });
});
