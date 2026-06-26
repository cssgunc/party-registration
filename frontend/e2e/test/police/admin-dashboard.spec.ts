/**
 * admin-dashboard.spec.ts
 *
 * Tests for the police admin dashboard at /police/admin.
 * Uses POLICE_AUTH_FILE (dreyes) for admin tests and OFFICER_AUTH_FILE (jcarter)
 * for the officer-redirect test.
 *
 * Coverage (gaps beyond existing admin.spec.ts):
 *  - Delete a non-self police account: row Delete → ConfirmDialog → confirm → row removed
 *  - Incidents tab visible for police_admin + basic incident table renders
 *  - Tab navigation Accounts ↔ Incidents
 *  - Officer redirected from /police/admin → /police
 *  - Export police accounts: waitForEvent("download") → .xlsx; parse header (Email, Role cols)
 *
 * NOTE: The existing admin.spec.ts covers:
 *   - Total row count, sort/filter, pagination
 *   - Self-delete restriction (no Delete action for own account)
 *   - Edit account: change role
 * Those are NOT duplicated here.
 */
import { OFFICER_AUTH_FILE, POLICE_AUTH_FILE } from "../../global-setup";
import { signupPoliceViaApi } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  clickRowAction,
  confirmDialog,
  waitForTableReady,
} from "../../helpers/table.helpers";
import { getHeaderRow, readDownloadedXlsx } from "../../helpers/xlsx.helpers";

// ---------------------------------------------------------------------------
// Seed-derived constants
// ---------------------------------------------------------------------------

// The police_admin (dreyes) is the logged-in user — self-delete is blocked.
// The officer (jcarter) is the only other seeded account — we can delete it,
// but we must restore it afterward or use a freshly-created account instead
// to avoid breaking auth state for subsequent tests.
//
// Strategy: create a throwaway officer account via API in beforeAll, delete it
// in the test, then the remaining seeded accounts stay intact.
const THROWAWAY_EMAIL = `playwright-del-${Date.now()}@chapelhillnc.gov`;
const THROWAWAY_PASSWORD = "PlaywrightDelete1!";

// ---------------------------------------------------------------------------

test.describe("Police Admin Dashboard — Accounts tab", () => {
  test.use({ storageState: POLICE_AUTH_FILE });

  test.beforeAll(async ({ request }) => {
    resetDatabase();
    // Create throwaway account so the delete test has a non-self target
    await signupPoliceViaApi(request, THROWAWAY_EMAIL, THROWAWAY_PASSWORD);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/police/admin");
    await waitForTableReady(page);
  });

  // -------------------------------------------------------------------------
  // Delete another (non-self) police account
  // -------------------------------------------------------------------------

  test("delete non-self police account: row removed from table (durable)", async ({
    page,
  }) => {
    // The throwaway account is unverified, but should appear in the table
    await clickRowAction(page, THROWAWAY_EMAIL, "Delete");

    // ConfirmDialog appears — dialog title is "Delete Police Account",
    // confirm button label is "Delete"
    await expect(
      page.getByRole("heading", { name: "Delete Police Account" })
    ).toBeVisible();
    await confirmDialog(page, "Delete");

    // After deletion the table reloads; the row must be gone
    await waitForTableReady(page);
    await expect(page.getByText(THROWAWAY_EMAIL)).toHaveCount(0);

    // Durable: reload and re-check
    await page.reload();
    await waitForTableReady(page);
    await expect(page.getByText(THROWAWAY_EMAIL)).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // Tab navigation
  // -------------------------------------------------------------------------

  test("tab navigation: clicking Incidents tab navigates to /police/admin/incidents", async ({
    page,
  }) => {
    await page.getByRole("tab", { name: "Incidents", exact: true }).click();
    await expect(page).toHaveURL(/\/police\/admin\/incidents/);
    await expect(
      page.getByRole("tab", { name: "Incidents", exact: true })
    ).toHaveAttribute("aria-selected", "true");
  });

  test("tab navigation: clicking Accounts tab navigates back to /police/admin/accounts", async ({
    page,
  }) => {
    // Start on incidents
    await page.goto("/police/admin/incidents");
    await waitForTableReady(page);

    await page.getByRole("tab", { name: "Accounts", exact: true }).click();
    await expect(page).toHaveURL(/\/police\/admin\/accounts/);
    await waitForTableReady(page);
    await expect(
      page.getByRole("tab", { name: "Accounts", exact: true })
    ).toHaveAttribute("aria-selected", "true");
  });

  // -------------------------------------------------------------------------
  // Export police accounts
  // -------------------------------------------------------------------------

  test("export police accounts: downloads .xlsx with Email and Role columns", async ({
    page,
  }) => {
    // The TableTemplate renders an export button with aria-label "Export CSV"
    const exportBtn = page.getByRole("button", { name: "Export CSV" });
    await expect(exportBtn).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportBtn.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);

    const rows = await readDownloadedXlsx(download);
    const headers = getHeaderRow(rows);

    const headerLower = headers.map((h) => h.toLowerCase());
    expect(headerLower.some((h) => h.includes("email"))).toBe(true);
    expect(headerLower.some((h) => h.includes("role"))).toBe(true);
  });
});

// ===========================================================================

test.describe("Police Admin Dashboard — Incidents tab", () => {
  test.use({ storageState: POLICE_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/police/admin/incidents");
    await waitForTableReady(page);
  });

  test("incidents tab is accessible for police_admin and table renders", async ({
    page,
  }) => {
    await expect(page.getByRole("table")).toBeVisible();
    // Incidents tab is active
    await expect(
      page.getByRole("tab", { name: "Incidents", exact: true })
    ).toHaveAttribute("aria-selected", "true");
  });
});

// ===========================================================================

test.describe("Officer redirected from /police/admin", () => {
  test.use({ storageState: OFFICER_AUTH_FILE });

  test("officer navigating to /police/admin is redirected to /police", async ({
    page,
  }) => {
    await page.goto("/police/admin");
    // The middleware / route guard should redirect an officer away from the admin area
    await expect(page).toHaveURL(/\/police(?!\/admin)/);
    // And the police officer page content is visible
    await expect(
      page.getByRole("heading", { name: "Registered Parties" })
    ).toBeVisible();
  });
});

// ===========================================================================
// Ensure Admin Dashboard link IS present for police_admin on /police
// ===========================================================================

test.describe("Admin Dashboard link visible for police_admin", () => {
  test.use({ storageState: POLICE_AUTH_FILE });

  test("Admin Dashboard link shown for police_admin on /police", async ({
    page,
  }) => {
    await page.goto("/police");
    await expect(
      page.getByRole("link", { name: /Admin Dashboard/i })
    ).toBeVisible();
  });
});
