/**
 * Cross-tab chain tests: actions on one staff tab are reflected on another.
 *
 * Three chains are covered:
 *  1. Create incident from Locations incident sidebar → appears in Incidents tab;
 *     Locations chip count increments.
 *  2. Create incident from Incidents tab → reflected in Locations chip count.
 *  3. Edit party contact two from Parties tab → chip shows updated value.
 */
import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import { openIncidentSidebar } from "../../helpers/exhaustive.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  LOCATIONS,
  PARTIES,
  formatDateInput,
} from "../../helpers/seed.helpers";
import { Steps } from "../../helpers/steps.helpers";
import {
  clickRowAction,
  getPaginationTotal,
  openStaffTab,
  selectAddressSuggestion,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// ---------------------------------------------------------------------------
// Seed constants
// ---------------------------------------------------------------------------

// Location 1 has seeded incidents so the chip exists and its count is known.
const LOCATION_WITH_INCIDENTS = LOCATIONS.find((l) => l.incidents.length > 0)!;
const INITIAL_INCIDENT_COUNT = LOCATION_WITH_INCIDENTS.incidents.length;

// A party whose contact two we can safely edit.
const PARTY_TO_EDIT = PARTIES[0];

// ===========================================================================

test.describe("Cross-tab chains", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  // Cached Steps don't re-run their navigation on later tests, and each test
  // gets a fresh page — so ensure every test starts on a loaded staff page.
  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/parties");
    await waitForTableReady(page);
  });

  // =========================================================================
  // Chain 1: incident created in Locations sidebar → visible in Incidents tab
  //          and Locations chip count increments.
  // =========================================================================

  test.describe("chain 1: create incident via Locations sidebar", () => {
    const ctx = {
      sidebarRef: null as string | null,
    };
    const steps = new Steps(ctx);

    const ensureSidebarIncidentCreated = steps.step(async (page) => {
      const ref = `PW-XTAB1-${Date.now()}`;
      await page.goto("/staff/locations");
      await openStaffTab(page, "Locations");
      await waitForTableReady(page);

      await setGlobalSearch(page, LOCATION_WITH_INCIDENTS.formatted_address);
      await openIncidentSidebar(
        page,
        LOCATION_WITH_INCIDENTS.formatted_address
      );

      // "Add new incident" button is rendered via portal into the sidebar header
      await page.getByRole("button", { name: "Add new incident" }).click();

      // IncidentDialog fields
      await page.getByLabel("Date").fill(formatDateInput(new Date()));
      await page.getByLabel("Incident Time").fill("15:00");
      await page.getByLabel("Reference ID").fill(ref);
      await page
        .locator('[data-slot="dialog-content"]')
        .getByRole("combobox")
        .first()
        .click();
      await page.getByRole("option", { name: "Citation", exact: true }).click();

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden();

      await page.keyboard.press("Escape");
      await waitForTableReady(page);

      ctx.sidebarRef = ref;
      return ["sidebarRef"] as const;
    });

    test("incident appears in the Incidents tab", async ({ page }) => {
      const { sidebarRef } = await ensureSidebarIncidentCreated(page);

      await openStaffTab(page, "Incidents");
      await waitForTableReady(page);
      await setGlobalSearch(page, sidebarRef);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("Locations chip count incremented", async ({ page }) => {
      await ensureSidebarIncidentCreated(page);

      await openStaffTab(page, "Locations");
      await waitForTableReady(page);
      await setGlobalSearch(page, LOCATION_WITH_INCIDENTS.formatted_address);

      const expectedCount = INITIAL_INCIDENT_COUNT + 1;
      const chipText = new RegExp(
        `${expectedCount}\\s+incident${expectedCount === 1 ? "" : "s"}`
      );
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: LOCATION_WITH_INCIDENTS.formatted_address })
          .first()
          .getByRole("button", { name: chipText })
      ).toBeVisible();
    });
  });

  // =========================================================================
  // Chain 2: incident created from Incidents tab → Locations chip count updates
  // =========================================================================

  test.describe("chain 2: create incident via Incidents tab", () => {
    const ctx = {
      incidentRef: null as string | null,
    };
    const steps = new Steps(ctx);

    const ensureIncidentCreated = steps.step(async (page) => {
      const ref = `PW-XTAB2-${Date.now()}`;
      await page.goto("/staff/incidents");
      await openStaffTab(page, "Incidents");
      await waitForTableReady(page);

      await page.getByRole("button", { name: /New Incident/i }).click();
      await selectAddressSuggestion(
        page,
        "",
        LOCATION_WITH_INCIDENTS.formatted_address
      );
      await page.getByLabel("Incident Date").fill(formatDateInput(new Date()));
      await page.getByLabel("Incident Time").fill("16:30");
      await selectSidebarCombobox(page, 0, "Citation");
      await page.getByLabel("Reference ID").fill(ref);
      await page.getByRole("button", { name: "Save" }).click();
      await waitForTableReady(page);

      ctx.incidentRef = ref;
      return ["incidentRef"] as const;
    });

    test("incident appears in Incidents tab", async ({ page }) => {
      const { incidentRef } = await ensureIncidentCreated(page);
      await setGlobalSearch(page, incidentRef);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("Locations chip count incremented after incident tab create", async ({
      page,
    }) => {
      await ensureIncidentCreated(page);

      await page.goto("/staff/locations");
      await openStaffTab(page, "Locations");
      await waitForTableReady(page);
      await setGlobalSearch(page, LOCATION_WITH_INCIDENTS.formatted_address);

      // At least INITIAL_INCIDENT_COUNT + 1 (chain 1 may have already added one;
      // use ≥ initial+1 so chain ordering doesn't matter)
      const row = page
        .getByRole("row")
        .filter({ hasText: LOCATION_WITH_INCIDENTS.formatted_address })
        .first();
      const chipButton = row.getByRole("button", { name: /\d+ incident/ });
      const chipText = (await chipButton.textContent()) ?? "";
      const countMatch = chipText.match(/(\d+)/);
      expect(Number(countMatch?.[1] ?? 0)).toBeGreaterThanOrEqual(
        INITIAL_INCIDENT_COUNT + 1
      );
    });
  });

  // =========================================================================
  // Chain 3: edit party contact two → Contact Two chip reflects updated value
  // =========================================================================

  test.describe("chain 3: edit party contact two", () => {
    const ctx = {
      updatedLastName: null as string | null,
      partyContactOneName: null as string | null,
    };
    const steps = new Steps(ctx);

    const ensureContactTwoEdited = steps.step(async (page) => {
      const newLastName = `PwEdit${Date.now()}`;

      await page.goto("/staff/parties");
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);

      // Search for the party by contact one name so we can locate the right row
      const contactOneName = `${PARTY_TO_EDIT.contact_one.first_name} ${PARTY_TO_EDIT.contact_one.last_name}`;
      await setGlobalSearch(page, PARTY_TO_EDIT.contact_one.email);
      await waitForTableReady(page);
      await clickRowAction(page, contactOneName, "Edit");

      // Fill only the Last Name field of contact two
      const lastNameInput = page.getByLabel("Last Name");
      await lastNameInput.fill(newLastName);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);

      ctx.updatedLastName = newLastName;
      ctx.partyContactOneName = contactOneName;
      return ["updatedLastName", "partyContactOneName"] as const;
    });

    test("Contact Two chip shows updated last name", async ({ page }) => {
      const { updatedLastName, partyContactOneName } =
        await ensureContactTwoEdited(page);

      await setGlobalSearch(page, PARTY_TO_EDIT.contact_one.email);
      await waitForTableReady(page);

      // The Contact Two cell in the row should show the new name
      const row = page
        .getByRole("row")
        .filter({ hasText: partyContactOneName })
        .first();

      await expect(
        row.getByRole("button", {
          name: new RegExp(updatedLastName, "i"),
        })
      ).toBeVisible();
    });
  });
});
