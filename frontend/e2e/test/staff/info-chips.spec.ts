/**
 * info-chips.spec.ts
 *
 * Read-only tests that open each info-chip sidebar and assert the detail
 * fields render with expected labels and values from seeded data.
 *
 * Seeded rows used:
 *  - Location 1  — "408 Pittsboro St, Chapel Hill, NC 27516, USA"
 *                  No hold, 3 incidents (2 remote_warning, 1 citation).
 *  - Location 11 — "204 Spring Ln, Chapel Hill, NC 27514, USA"
 *                  Active hold (NOW+90d), 2 incidents.
 *  - Party 2     — at Location 1.
 *                  Contact One: Student 5 (Laura Gonzales, lauragonzales@unc.edu).
 *                  Contact Two: Daniel Johnson, daniel.johnson@unc.edu, call.
 *  - Incident 1  — at Location 29 "107 Fraternity Ct, Chapel Hill, NC 27516, USA"
 *                  description "Guests blocking driveway."
 *
 * NOTE: "Completed Party Smart" for Laura Gonzales shows "Not Registered"
 * because her last_registered is NOW-700d (prior academic year → expired).
 */
import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  openStaffTab,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// Known seeded values (verified against mock_data.json + source components).
const LOCATION_1_ADDRESS = "408 Pittsboro St, Chapel Hill, NC 27516, USA";
const LOCATION_11_ADDRESS = "204 Spring Ln, Chapel Hill, NC 27514, USA";

// Party 2 — at Location 1
const PARTY_LOCATION_ADDRESS = LOCATION_1_ADDRESS;
// Contact One for party 2 is Laura Gonzales (student id=5)
const CONTACT_ONE_FULL_NAME = "Laura Gonzales";
const CONTACT_ONE_EMAIL = "lauragonzales@unc.edu";
const CONTACT_ONE_ONYEN = "lauragonzales";
const CONTACT_ONE_PID = "730925227";
const CONTACT_ONE_PHONE_FORMATTED = "(856) 575-3194"; // 8565753194
// Residence: location 2 "306 Henderson St" chosen NOW-180d (this school year → shown)
const CONTACT_ONE_RESIDENCE = "306 Henderson St, Chapel Hill, NC 27514, USA";

// Contact Two for party 2
const CONTACT_TWO_FULL_NAME = "Daniel Johnson";
const CONTACT_TWO_EMAIL = "daniel.johnson@unc.edu";
const CONTACT_TWO_PHONE_FORMATTED = "(913) 222-9878"; // 9132229878

// Incident 1 — at Location 29
const INCIDENT_LOCATION_ADDRESS =
  "107 Fraternity Ct, Chapel Hill, NC 27516, USA";
const INCIDENT_DESCRIPTION = "Guests blocking driveway.";

// ==============================================================================

test.describe("Info chips — read-only detail panels", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  // ---------------------------------------------------------------------------
  // Location info chip — from the Locations tab

  test.describe("Location chip (Locations tab)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/staff/locations");
      await openStaffTab(page, "Locations");
      await waitForTableReady(page);
    });

    test("location chip: shows address, no-hold, incident counts for loc 1", async ({
      page,
    }) => {
      // Location 1 has no hold and 3 incidents: 2 remote_warning, 1 citation.
      await setGlobalSearch(page, LOCATION_1_ADDRESS);
      const row = page
        .getByRole("row")
        .filter({ has: page.getByText(LOCATION_1_ADDRESS, { exact: false }) })
        .first();
      // The Incidents column shows a chip like "3 incidents"; click it.
      await row
        .getByRole("button", { name: /\d+ incident/ })
        .first()
        .click();
      // The sidebar for this chip is IncidentInfoChipDetails; the location chip
      // is on the Address column — open it instead.
      await page.keyboard.press("Escape");

      // Open the Address info chip (LocationInfoChipDetails).
      // The address column renders plain text for the Locations table, not a chip.
      // The info chip for location is on the Incidents column chip sidebar header.
      // Actually, the LocationTable renders plain text for the address column
      // (no InfoChip), and the Incidents column is an InfoChip.
      // The sidebar opened by the Incidents chip renders IncidentInfoChipDetails,
      // NOT LocationInfoChipDetails.
      // LocationInfoChipDetails IS rendered in PartyTable (address column chip)
      // and StudentTable (residence column chip).
      // => Switch to the Parties tab for the Location chip test.
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);
      await setGlobalSearch(page, LOCATION_1_ADDRESS);
      const partyRow = page
        .getByRole("row")
        .filter({ has: page.getByText(LOCATION_1_ADDRESS, { exact: false }) })
        .first();
      await partyRow.getByRole("button", { name: LOCATION_1_ADDRESS }).click();
      await expect(
        page.getByRole("heading", { name: "Info about the Location" })
      ).toBeVisible();
      const locationSidebar = page
        .locator('[data-slot="sheet-content"]')
        .last();
      // Address field
      await expect(locationSidebar.getByText("Address")).toBeVisible();
      await expect(
        locationSidebar.getByText(LOCATION_1_ADDRESS, { exact: false })
      ).toBeVisible();
      // Active Hold = "No" for loc 1 (no hold_expiration)
      await expect(locationSidebar.getByText("Active Hold")).toBeVisible();
      await expect(locationSidebar.getByText("No")).toBeVisible();
      // Incident counts (3 incidents: 2 remote_warning, 1 citation)
      await expect(page.getByText("In-Person Warning Count")).toBeVisible();
      await expect(page.getByText("Remote Warning Count")).toBeVisible();
      await expect(page.getByText("Citation Count")).toBeVisible();
    });

    test("location chip (Locations tab incident sidebar): shows active hold for loc 11", async ({
      page,
    }) => {
      // Location 11 "204 Spring Ln" has an active hold (NOW+90d).
      // The Locations table renders plain text address; the incident chip leads
      // to IncidentInfoChipDetails.  To verify LocationInfoChipDetails for loc 11,
      // we need to find a party at loc 11 or check from Parties tab.
      // There are 2 parties at loc 11 — search Parties tab.
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);
      await setGlobalSearch(page, LOCATION_11_ADDRESS);
      const partyRow = page
        .getByRole("row")
        .filter({ has: page.getByText(LOCATION_11_ADDRESS, { exact: false }) })
        .first();
      await partyRow.getByRole("button", { name: LOCATION_11_ADDRESS }).click();
      await expect(
        page.getByRole("heading", { name: "Info about the Location" })
      ).toBeVisible();
      await expect(page.getByText("Active Hold")).toBeVisible();
      // The hold is active: value starts with "Active: Expires "
      await expect(page.getByText(/Active: Expires/)).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Contact One / Student chip — from the Parties tab

  test.describe("Contact One (Student) chip (Parties tab)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/staff/parties");
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);
      // Party 2 is at 408 Pittsboro St; search and open the contact one chip.
      await setGlobalSearch(page, PARTY_LOCATION_ADDRESS);
      const partyRow = page
        .getByRole("row")
        .filter({
          has: page.getByText(PARTY_LOCATION_ADDRESS, { exact: false }),
        })
        .first();
      // Contact One column chip shows the student's full name.
      await partyRow
        .getByRole("button", { name: CONTACT_ONE_FULL_NAME })
        .click();
      await expect(
        page.getByRole("heading", { name: "Info about the Student" })
      ).toBeVisible();
    });

    test("contact one chip: shows First Name", async ({ page }) => {
      const sidebar = page.locator('[data-slot="sheet-content"]').last();
      await expect(sidebar.getByText("First Name")).toBeVisible();
      await expect(sidebar.getByText("Laura", { exact: true })).toBeVisible();
    });

    test("contact one chip: shows Last Name", async ({ page }) => {
      const sidebar = page.locator('[data-slot="sheet-content"]').last();
      await expect(sidebar.getByText("Last Name")).toBeVisible();
      await expect(
        sidebar.getByText("Gonzales", { exact: true })
      ).toBeVisible();
    });

    test("contact one chip: shows formatted phone number", async ({ page }) => {
      await expect(page.getByText("Phone Number")).toBeVisible();
      await expect(page.getByText(CONTACT_ONE_PHONE_FORMATTED)).toBeVisible();
    });

    test("contact one chip: shows PID", async ({ page }) => {
      await expect(page.getByText("PID")).toBeVisible();
      await expect(page.getByText(CONTACT_ONE_PID)).toBeVisible();
    });

    test("contact one chip: shows Onyen", async ({ page }) => {
      const sidebar = page.locator('[data-slot="sheet-content"]').last();
      await expect(sidebar.getByText("Onyen")).toBeVisible();
      await expect(
        sidebar.getByText(CONTACT_ONE_ONYEN, { exact: true })
      ).toBeVisible();
    });

    test("contact one chip: shows Email", async ({ page }) => {
      await expect(page.getByText("Email")).toBeVisible();
      await expect(page.getByText(CONTACT_ONE_EMAIL)).toBeVisible();
    });

    test("contact one chip: shows Residence address", async ({ page }) => {
      await expect(page.getByText("Residence")).toBeVisible();
      // Laura's residence is loc 2 — chosen NOW-180d (within this school year).
      await expect(
        page.getByText(CONTACT_ONE_RESIDENCE, { exact: false })
      ).toBeVisible();
    });

    test("contact one chip: shows Party Smart status as Not Registered", async ({
      page,
    }) => {
      // Laura's last_registered is NOW-700d (prior academic year → expired → Not Registered)
      await expect(page.getByText("Completed Party Smart")).toBeVisible();
      await expect(page.getByText("Not Registered")).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Contact Two chip — from the Parties tab

  test.describe("Contact Two chip (Parties tab)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/staff/parties");
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);
      await setGlobalSearch(page, PARTY_LOCATION_ADDRESS);
      const partyRow = page
        .getByRole("row")
        .filter({
          has: page.getByText(PARTY_LOCATION_ADDRESS, { exact: false }),
        })
        .first();
      // Contact Two column chip shows Daniel Johnson.
      await partyRow
        .getByRole("button", { name: CONTACT_TWO_FULL_NAME })
        .click();
      await expect(
        page.getByRole("heading", { name: "Info about the Contact" })
      ).toBeVisible();
    });

    test("contact two chip: shows First Name", async ({ page }) => {
      const sidebar = page.locator('[data-slot="sheet-content"]').last();
      await expect(sidebar.getByText("First Name")).toBeVisible();
      await expect(sidebar.getByText("Daniel", { exact: true })).toBeVisible();
    });

    test("contact two chip: shows Last Name", async ({ page }) => {
      const sidebar = page.locator('[data-slot="sheet-content"]').last();
      await expect(sidebar.getByText("Last Name")).toBeVisible();
      await expect(sidebar.getByText("Johnson", { exact: true })).toBeVisible();
    });

    test("contact two chip: shows Email", async ({ page }) => {
      await expect(page.getByText("Email")).toBeVisible();
      await expect(page.getByText(CONTACT_TWO_EMAIL)).toBeVisible();
    });

    test("contact two chip: shows formatted phone number", async ({ page }) => {
      await expect(page.getByText("Phone Number")).toBeVisible();
      await expect(page.getByText(CONTACT_TWO_PHONE_FORMATTED)).toBeVisible();
    });

    test("contact two chip: shows Contact Preference as Call", async ({
      page,
    }) => {
      await expect(page.getByText("Contact Preference")).toBeVisible();
      await expect(page.getByText("Call")).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Incident Description chip — from the Incidents tab

  test.describe("Incident Description chip (Incidents tab)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/staff/incidents");
      await openStaffTab(page, "Incidents");
      await waitForTableReady(page);
      // Incident 1 is at "107 Fraternity Ct" — search by that address.
      await setGlobalSearch(page, INCIDENT_LOCATION_ADDRESS);
      const incidentRow = page
        .getByRole("row")
        .filter({
          has: page.getByText(INCIDENT_LOCATION_ADDRESS, { exact: false }),
        })
        .first();
      // The description chip shortName = truncated description (25 chars, no truncation).
      await incidentRow
        .getByRole("button", { name: INCIDENT_DESCRIPTION })
        .click();
      await expect(
        page.getByRole("heading", { name: "Incident Description" })
      ).toBeVisible();
    });

    test("description chip: shows full Description label and value", async ({
      page,
    }) => {
      const sidebar = page.locator('[data-slot="sheet-content"]').last();
      await expect(
        sidebar.getByText("Description", { exact: true })
      ).toBeVisible();
      await expect(sidebar.getByText(INCIDENT_DESCRIPTION)).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Location chip from the Incidents tab (Address column chip)

  test.describe("Location chip (Incidents tab)", () => {
    test("location chip in incidents tab shows address and incident metadata", async ({
      page,
    }) => {
      await page.goto("/staff/incidents");
      await openStaffTab(page, "Incidents");
      await waitForTableReady(page);
      await setGlobalSearch(page, INCIDENT_LOCATION_ADDRESS);
      const incidentRow = page
        .getByRole("row")
        .filter({
          has: page.getByText(INCIDENT_LOCATION_ADDRESS, { exact: false }),
        })
        .first();
      // Address column chip button shows the address text.
      await incidentRow
        .getByRole("button", { name: INCIDENT_LOCATION_ADDRESS })
        .click();
      await expect(
        page.getByRole("heading", { name: "Info about the Location" })
      ).toBeVisible();
      const incidentLocationSidebar = page
        .locator('[data-slot="sheet-content"]')
        .last();
      await expect(incidentLocationSidebar.getByText("Address")).toBeVisible();
      await expect(
        incidentLocationSidebar.getByText(INCIDENT_LOCATION_ADDRESS, {
          exact: false,
        })
      ).toBeVisible();
      // Active Hold = "No" for loc 29
      await expect(
        incidentLocationSidebar.getByText("Active Hold")
      ).toBeVisible();
      await expect(incidentLocationSidebar.getByText("No")).toBeVisible();
    });
  });
});
