import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import {
  FilterCase,
  SortCase,
  filterAndExpect,
  filterTestTitle,
  openIncidentSidebar,
  sortAndVerify,
} from "../../helpers/exhaustive.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  LOCATIONS,
  countWhere,
  firstUniqueToken,
  formatDateInput,
} from "../../helpers/seed.helpers";
import { Steps } from "../../helpers/steps.helpers";
import {
  clickRowAction,
  confirmDialog,
  getColumnCellTexts,
  getPaginationTotal,
  getResultsSummary,
  getVisibleRowCount,
  goToPage,
  openStaffTab,
  selectAddressSuggestion,
  setGlobalSearch,
  setPageSize,
  waitForTableReady,
} from "../../helpers/table.helpers";

// --- Seed data constants -------------------------------------------------------

const TOTAL = 68;
const ACTIVE_HOLD_COUNT = countWhere(
  LOCATIONS,
  (l) => l.hold_expiration !== null
);
const INACTIVE_HOLD_COUNT = countWhere(
  LOCATIONS,
  (l) => l.hold_expiration === null
);
const WITH_INCIDENTS_COUNT = countWhere(LOCATIONS, (l) => l.incident_count > 0);
const WITHOUT_INCIDENTS_COUNT = countWhere(
  LOCATIONS,
  (l) => l.incident_count === 0
);
// Incidents filter uses gte/lte semantics ("Less than 2" = incident_count <= 1)
const LTE_1_INCIDENT_COUNT = countWhere(
  LOCATIONS,
  (l) => l.incident_count <= 1
);

const ADDRESS_TOKEN = firstUniqueToken(
  LOCATIONS.map((l) => l.formatted_address)
);
const TOKEN_COUNT = countWhere(LOCATIONS, (l) =>
  l.formatted_address.toLowerCase().includes(ADDRESS_TOKEN.toLowerCase())
);
const EXACT_ADDRESS = LOCATIONS[0].formatted_address;

// Address not in seed data — used for all modify tests
const CREATE_ADDRESS = "100 E Franklin St, Chapel Hill, NC 27514, USA";

// --- Sort and filter definitions -----------------------------------------------

const SORT_CASES: SortCase[] = [
  { header: "Address", kind: "text" },
  { header: "Incidents", kind: "number" },
];

const FILTER_CASES: FilterCase[] = [
  // Address — text operators
  {
    kind: "text",
    column: "Address",
    operator: "Contains",
    value: ADDRESS_TOKEN,
    expectedCount: TOKEN_COUNT,
  },
  {
    kind: "text",
    column: "Address",
    operator: "Equals",
    value: EXACT_ADDRESS,
    expectedCount: 1,
  },
  {
    kind: "text",
    column: "Address",
    operator: "Not equals",
    value: EXACT_ADDRESS,
    expectedCount: TOTAL - 1,
  },
  // Incidents — number operators (gte/lte semantics from backend)
  {
    kind: "number",
    column: "Incidents",
    operator: "Equals",
    value: 0,
    expectedCount: WITHOUT_INCIDENTS_COUNT,
  },
  {
    kind: "number",
    column: "Incidents",
    operator: "Greater than",
    value: 0,
    expectedCount: WITH_INCIDENTS_COUNT,
  },
  {
    kind: "number",
    column: "Incidents",
    operator: "Less than",
    value: 2,
    expectedCount: LTE_1_INCIDENT_COUNT,
  },
  {
    kind: "number",
    column: "Incidents",
    operator: "Not equals",
    value: 0,
    expectedCount: WITH_INCIDENTS_COUNT,
  },
  // Active Hold — nullable date operators
  {
    kind: "date",
    column: "Active Hold",
    operator: "Active",
    expectedCount: ACTIVE_HOLD_COUNT,
  },
  {
    kind: "date",
    column: "Active Hold",
    operator: "Inactive",
    expectedCount: INACTIVE_HOLD_COUNT,
  },
  // Active Hold — After/Before (all active holds are ~90 days in the future)
  {
    kind: "date",
    column: "Active Hold",
    operator: "After",
    value: formatDateInput(new Date(Date.now() - 86400000)),
    expectedCount: ACTIVE_HOLD_COUNT,
  },
  {
    kind: "date",
    column: "Active Hold",
    operator: "Before",
    value: formatDateInput(new Date(Date.now() + 365 * 86400000)),
    expectedCount: ACTIVE_HOLD_COUNT,
  },
];

// ==============================================================================

test.describe("Locations — exhaustive", () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(async () => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
  });

  // --- Read ---------------------------------------------------------------------

  test.describe("read", () => {
    test("view data: address cells are populated", async ({ page }) => {
      const addresses = await getColumnCellTexts(page, "Address");
      expect(addresses.length).toBeGreaterThan(0);
      expect(addresses[0]).not.toBe("");
    });

    test("view data: total row count matches seed", async ({ page }) => {
      const { total } = await getResultsSummary(page);
      expect(total).toBe(TOTAL);
    });

    for (const { header, kind } of SORT_CASES) {
      test(`sort ${header} ascending`, async ({ page }) => {
        await sortAndVerify(page, header, kind, "asc");
      });
      test(`sort ${header} descending`, async ({ page }) => {
        await sortAndVerify(page, header, kind, "desc");
      });
    }

    for (const tc of FILTER_CASES) {
      test(filterTestTitle(tc), async ({ page }) => {
        await filterAndExpect(page, tc);
      });
    }

    test("pagination: change page size to 10", async ({ page }) => {
      await setPageSize(page, 10);
      expect(await getVisibleRowCount(page)).toBeLessThanOrEqual(10);
    });

    test("pagination: navigate to page 2", async ({ page }) => {
      await setPageSize(page, 10);
      const { end } = await getResultsSummary(page);
      await goToPage(page, 2);
      const { start } = await getResultsSummary(page);
      expect(start).toBe(end + 1);
    });

    test("global search: finds matching rows", async ({ page }) => {
      await setGlobalSearch(page, ADDRESS_TOKEN);
      expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    });

    test("global search: no results for nonsense input", async ({ page }) => {
      await setGlobalSearch(page, "zzz-no-match-xyz-playwright-000");
      expect(await getPaginationTotal(page)).toBe(0);
    });

    test("incident sidebar: shows incident list", async ({ page }) => {
      // Location 1 (408 Pittsboro St) has seeded incidents
      const address = "408 Pittsboro St, Chapel Hill, NC 27516, USA";
      await setGlobalSearch(page, address);
      await openIncidentSidebar(page, address);
      // Location 1 has 3 seeded incidents
      await expect(
        page
          .locator('[data-slot="sheet-content"]')
          .last()
          .locator("div")
          .filter({ hasText: /\d{2}\/\d{2}/ })
          .first()
      ).toBeVisible();
    });
  });

  // --- Modify -------------------------------------------------------------------

  test.describe("modify", () => {
    const ctx = {
      address: null as string | null,
      sidebarRef: null as string | null,
    };
    const steps = new Steps(ctx);

    const ensureLocationCreated = steps.step(async (page) => {
      await page.getByRole("button", { name: /New Location/i }).click();
      await selectAddressSuggestion(page, "", CREATE_ADDRESS);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      ctx.address = CREATE_ADDRESS;
      return ["address"] as const;
    });

    const ensureLocationEdited = steps.step(async (page) => {
      const { address } = await ensureLocationCreated(page);
      await setGlobalSearch(page, address);
      await clickRowAction(page, address, "Edit");
      await page
        .getByLabel(/Hold Expiration/)
        .fill(formatDateInput(new Date(Date.now() + 86400000 * 5)));
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      return ["address"] as const;
    });

    // Adds an incident to the same location created by ensureLocationCreated.
    // The location starts with zero incidents, so the first card is always ours.
    const ensureSidebarIncidentAdded = steps.step(async (page) => {
      const { address } = await ensureLocationCreated(page);
      const ref = `PW-SIDEBAR-${Date.now()}`;
      await setGlobalSearch(page, address);
      await openIncidentSidebar(page, address);
      await page.getByRole("button", { name: "Add new incident" }).click();
      await page.getByLabel("Date").fill(formatDateInput(new Date()));
      await page.getByLabel("Incident Time").fill("14:30");
      await page.getByLabel("Reference ID").fill(ref);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden({
        timeout: 5_000,
      });
      await page.keyboard.press("Escape");
      ctx.sidebarRef = ref;
      return ["address", "sidebarRef"] as const;
    });

    test("create new location", async ({ page }) => {
      const { address } = await ensureLocationCreated(page);
      await setGlobalSearch(page, address);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("edit location: set hold expiration", async ({ page }) => {
      await ensureLocationEdited(page);
      await expect(page.getByText("Expires:").first()).toBeVisible();
    });

    test("incident sidebar: create incident", async ({ page }) => {
      const { address, sidebarRef } = await ensureSidebarIncidentAdded(page);
      await setGlobalSearch(page, address);
      await openIncidentSidebar(page, address);
      await page
        .locator('[data-slot="sheet-content"]')
        .last()
        .locator('[data-slot="collapsible-trigger"]')
        .first()
        .click();
      await expect(page.getByText(sidebarRef)).toBeVisible();
    });

    test("incident sidebar: edit incident", async ({ page }) => {
      const { address } = await ensureSidebarIncidentAdded(page);
      await setGlobalSearch(page, address);
      await openIncidentSidebar(page, address);
      await page
        .locator('[data-slot="sheet-content"]')
        .last()
        .getByRole("button", { name: "Incident options" })
        .first()
        .click();
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await page.getByLabel("Incident Time").fill("09:00");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden({
        timeout: 5_000,
      });
    });

    test("incident sidebar: delete incident", async ({ page }) => {
      const { address, sidebarRef } = await ensureSidebarIncidentAdded(page);
      await setGlobalSearch(page, address);
      await openIncidentSidebar(page, address);
      await page
        .locator('[data-slot="sheet-content"]')
        .last()
        .getByRole("button", { name: "Incident options" })
        .first()
        .click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(sidebarRef)).toBeHidden({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    });

    // Runs last — cleans up the location used by all modify tests above.
    test("delete location", async ({ page }) => {
      const { address } = await ensureLocationEdited(page);
      await setGlobalSearch(page, address);
      await clickRowAction(page, address, "Delete");
      await confirmDialog(page, "Delete");
      await waitForTableReady(page);
      expect(await getPaginationTotal(page)).toBe(0);
    });
  });
});
