import { STAFF_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import { openIncidentSidebar } from "../../helpers/exhaustive.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { STUDENTS } from "../../helpers/seed.helpers";
import {
  openStaffTab,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// Pick a known student with a defined registration state so the checkbox
// toggle is deterministic.
const STUDENT = STUDENTS.find((s) => s.email === "stevenmorrison@unc.edu")!;

// ==============================================================================

test.describe("Staff role restrictions", () => {
  test.use({ storageState: STAFF_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  // ---------------------------------------------------------------------------
  // Accounts tab

  test("Accounts tab is absent from the tab list for staff", async ({
    page,
  }) => {
    await page.goto("/staff/parties");
    await waitForTableReady(page);
    await expect(page.getByRole("tab", { name: "Accounts" })).toHaveCount(0);
  });

  test("Direct nav to /staff/accounts redirects to /staff/parties", async ({
    page,
  }) => {
    await page.goto("/staff/accounts");
    await page.waitForURL(/\/staff\/parties/);
    expect(page.url()).toContain("/staff/parties");
  });

  // ---------------------------------------------------------------------------
  // Parties tab — no create button, no row action menus

  test("Parties tab: no New Party button visible for staff", async ({
    page,
  }) => {
    await page.goto("/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);
    await expect(page.getByRole("button", { name: /New Party/i })).toHaveCount(
      0
    );
  });

  test("Parties tab: no Open menu action button on rows for staff", async ({
    page,
  }) => {
    await page.goto("/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(
      0
    );
  });

  // ---------------------------------------------------------------------------
  // Locations tab — no create button, no row action menus

  test("Locations tab: no New Location button visible for staff", async ({
    page,
  }) => {
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
    await expect(
      page.getByRole("button", { name: /New Location/i })
    ).toHaveCount(0);
  });

  test("Locations tab: no Open menu action button on rows for staff", async ({
    page,
  }) => {
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(
      0
    );
  });

  // ---------------------------------------------------------------------------
  // Incidents tab — no create button, no row action menus

  test("Incidents tab: no New Incident button visible for staff", async ({
    page,
  }) => {
    await page.goto("/staff/incidents");
    await openStaffTab(page, "Incidents");
    await waitForTableReady(page);
    await expect(
      page.getByRole("button", { name: /New Incident/i })
    ).toHaveCount(0);
  });

  test("Incidents tab: no Open menu action button on rows for staff", async ({
    page,
  }) => {
    await page.goto("/staff/incidents");
    await openStaffTab(page, "Incidents");
    await waitForTableReady(page);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(
      0
    );
  });

  // ---------------------------------------------------------------------------
  // Students tab — no create button, no row actions; BUT checkbox is present

  test("Students tab: no New Student button visible for staff", async ({
    page,
  }) => {
    await page.goto("/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
    // No create action is wired up for StudentTable regardless of role,
    // so this asserts zero count.
    await expect(
      page.getByRole("button", { name: /New Student/i })
    ).toHaveCount(0);
  });

  test("Students tab: no Open menu action button on rows for staff", async ({
    page,
  }) => {
    await page.goto("/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(
      0
    );
  });

  test("Students tab: Is Registered checkbox is present and interactive for staff", async ({
    page,
  }) => {
    await page.goto("/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
    await setGlobalSearch(page, STUDENT.email);
    const row = page
      .getByRole("row")
      .filter({ has: page.getByText(STUDENT.email, { exact: false }) })
      .first();
    const checkbox = row.getByRole("checkbox");
    await expect(checkbox).toBeVisible();
    // The checkbox must not be disabled for staff.
    await expect(checkbox).not.toBeDisabled();
  });

  test("Students tab: toggling Is Registered checkbox persists after reload", async ({
    page,
  }) => {
    await page.goto("/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
    await setGlobalSearch(page, STUDENT.email);

    const row = () =>
      page
        .getByRole("row")
        .filter({ has: page.getByText(STUDENT.email, { exact: false }) })
        .first();

    const checkbox = row().getByRole("checkbox");
    const wasChecked = await checkbox.isChecked();

    // Toggle the checkbox.
    await checkbox.click();
    // Wait for table to settle (mutation fires; no reload needed yet).
    await waitForTableReady(page);

    // Reload and re-query to confirm the state persisted.
    await page.reload();
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
    await setGlobalSearch(page, STUDENT.email);

    await expect(row().getByRole("checkbox")).toBeChecked({
      checked: !wasChecked,
    });
  });

  // ---------------------------------------------------------------------------
  // Export button is NOT role-gated

  test("Parties tab: Export CSV button is visible for staff", async ({
    page,
  }) => {
    await page.goto("/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);
    await expect(
      page.getByRole("button", { name: /Export CSV/i })
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Locations incident sidebar — read-only for staff

  test("Locations incident sidebar: opens and shows incidents list for staff", async ({
    page,
  }) => {
    // Location 1 — "408 Pittsboro St, Chapel Hill, NC 27516, USA" has 3 incidents.
    const locationAddress = "408 Pittsboro St, Chapel Hill, NC 27516, USA";
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
    await setGlobalSearch(page, locationAddress);
    await openIncidentSidebar(page, locationAddress);
    await expect(
      page.getByRole("heading", { name: "Incidents" })
    ).toBeVisible();
  });

  test("Locations incident sidebar: no Add new incident button for staff", async ({
    page,
  }) => {
    const locationAddress = "408 Pittsboro St, Chapel Hill, NC 27516, USA";
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
    await setGlobalSearch(page, locationAddress);
    await openIncidentSidebar(page, locationAddress);
    await expect(
      page.getByRole("button", { name: "Add new incident" })
    ).toHaveCount(0);
  });

  test("Locations incident sidebar: no Incident options dropdown for staff", async ({
    page,
  }) => {
    const locationAddress = "408 Pittsboro St, Chapel Hill, NC 27516, USA";
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
    await setGlobalSearch(page, locationAddress);
    await openIncidentSidebar(page, locationAddress);
    // All per-card option menus are absent for non-admin roles.
    await expect(
      page.getByRole("button", { name: "Incident options" })
    ).toHaveCount(0);
  });
});
