/**
 * Export tests: verify every staff-table "Export CSV" button downloads a valid
 * .xlsx file whose header row matches the backend export schema and whose data
 * row count reflects the full seeded dataset.
 *
 * Each test:
 *  1. Navigates to the correct tab and waits for the table to be ready.
 *  2. Captures the download triggered by clicking the Export CSV button.
 *  3. Asserts the suggested filename ends with ".xlsx".
 *  4. Parses the workbook and asserts the header row matches the expected columns.
 *  5. Asserts the data row count (total rows minus 1 header) matches the seeded
 *     total reported by the table's results summary.
 *
 * NOTE: exports are unfiltered (global search / column filters cleared), so the
 * row count assertion uses the seed totals already validated in the exhaustive
 * specs.
 */
import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { AGGREGATE_ACCOUNTS } from "../../helpers/seed.helpers";
import { openStaffTab, waitForTableReady } from "../../helpers/table.helpers";
import { getHeaderRow, readDownloadedXlsx } from "../../helpers/xlsx.helpers";

// ---------------------------------------------------------------------------
// Seed totals (must match the exhaustive specs for consistency)
// ---------------------------------------------------------------------------

const SEED_PARTIES_TOTAL = 182;
const SEED_STUDENTS_TOTAL = 74;
const SEED_LOCATIONS_TOTAL = 68;
const SEED_INCIDENTS_TOTAL = 45;
// Aggregate accounts: SAML accounts + police accounts (no invited rows in seed)
const SEED_ACCOUNTS_TOTAL = AGGREGATE_ACCOUNTS.length; // 4

// ---------------------------------------------------------------------------
// Expected export column headers (derived from backend service field_map defs)
// ---------------------------------------------------------------------------

// account_service.py: export_aggregate_accounts_to_excel
const ACCOUNTS_HEADERS = [
  "Email",
  "First Name",
  "Last Name",
  "Onyen",
  "PID",
  "Role",
  "Status",
];

// student_service.py: export_students_to_excel
const STUDENTS_HEADERS = [
  "Onyen",
  "PID",
  "First Name",
  "Last Name",
  "Email",
  "Phone Number",
  "Contact Preference",
  "Is Registered",
  "Residence Address",
];

// location_service.py: export_locations_to_excel
const LOCATIONS_HEADERS = [
  "Address",
  "Remote Warning Count",
  "In-Person Warning Count",
  "Citation Count",
];

// incident_service.py: export_incidents_to_excel
const INCIDENTS_HEADERS = [
  "Severity",
  "Address",
  "Date",
  "Time",
  "Description",
  "Reference ID",
];

// party_service.py: export_parties_to_excel_staff (admin sees the staff export)
const PARTIES_HEADERS = [
  "Address",
  "Date of Party",
  "Time of Party",
  "Contact One First Name",
  "Contact One Last Name",
  "Contact One Email",
  "Contact One Phone Number",
  "Contact One Contact Preference",
  "Contact One Residence",
  "Contact Two First Name",
  "Contact Two Last Name",
  "Contact Two Email",
  "Contact Two Phone Number",
  "Contact Two Contact Preference",
];

// ===========================================================================

test.describe("Export — all tables", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  // -------------------------------------------------------------------------
  // Parties
  // -------------------------------------------------------------------------

  test("Parties export: .xlsx filename, correct headers, correct row count", async ({
    page,
  }) => {
    await page.goto("/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    const rows = await readDownloadedXlsx(download);
    expect(getHeaderRow(rows)).toEqual(PARTIES_HEADERS);
    // Data rows = total rows - 1 header
    expect(rows.length - 1).toBe(SEED_PARTIES_TOTAL);
  });

  // -------------------------------------------------------------------------
  // Students
  // -------------------------------------------------------------------------

  test("Students export: .xlsx filename, correct headers, correct row count", async ({
    page,
  }) => {
    await page.goto("/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    const rows = await readDownloadedXlsx(download);
    expect(getHeaderRow(rows)).toEqual(STUDENTS_HEADERS);
    expect(rows.length - 1).toBe(SEED_STUDENTS_TOTAL);
  });

  // -------------------------------------------------------------------------
  // Locations
  // -------------------------------------------------------------------------

  test("Locations export: .xlsx filename, correct headers, correct row count", async ({
    page,
  }) => {
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    const rows = await readDownloadedXlsx(download);
    expect(getHeaderRow(rows)).toEqual(LOCATIONS_HEADERS);
    expect(rows.length - 1).toBe(SEED_LOCATIONS_TOTAL);
  });

  // -------------------------------------------------------------------------
  // Incidents
  // -------------------------------------------------------------------------

  test("Incidents export: .xlsx filename, correct headers, correct row count", async ({
    page,
  }) => {
    await page.goto("/staff/incidents");
    await openStaffTab(page, "Incidents");
    await waitForTableReady(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    const rows = await readDownloadedXlsx(download);
    expect(getHeaderRow(rows)).toEqual(INCIDENTS_HEADERS);
    expect(rows.length - 1).toBe(SEED_INCIDENTS_TOTAL);
  });

  // -------------------------------------------------------------------------
  // Accounts (aggregate — the Accounts tab export includes SAML + police rows)
  // -------------------------------------------------------------------------

  test("Accounts export: .xlsx filename, correct headers, correct row count", async ({
    page,
  }) => {
    await page.goto("/staff/accounts");
    await openStaffTab(page, "Accounts");
    await waitForTableReady(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    const rows = await readDownloadedXlsx(download);
    expect(getHeaderRow(rows)).toEqual(ACCOUNTS_HEADERS);
    expect(rows.length - 1).toBe(SEED_ACCOUNTS_TOTAL);
  });
});
