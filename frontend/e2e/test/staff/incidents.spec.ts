import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import {
  FilterCase,
  SortCase,
  filterAndExpect,
  filterTestTitle,
  sortAndVerify,
} from "../../helpers/exhaustive.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  INCIDENTS,
  LOCATIONS,
  countWhere,
  formatDateInput,
  toTimeString,
} from "../../helpers/seed.helpers";
import { Steps } from "../../helpers/steps.helpers";
import {
  clickRowAction,
  confirmDialog,
  getPaginationTotal,
  getResultsSummary,
  openStaffTab,
  selectAddressSuggestion,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// --- Seed data constants -------------------------------------------------------

const TOTAL = 45;
const REMOTE_WARNING_COUNT = countWhere(
  INCIDENTS,
  (i) => i.severity === "remote_warning"
);
const CITATION_COUNT = countWhere(INCIDENTS, (i) => i.severity === "citation");
const WITH_REF_COUNT = countWhere(INCIDENTS, (i) => i.reference_id !== null);
const WITHOUT_REF_COUNT = countWhere(INCIDENTS, (i) => i.reference_id === null);

const INCIDENT_ADDRESS_TOKEN = INCIDENTS[0].location_address;
const INCIDENTS_AT_TOKEN = countWhere(
  INCIDENTS,
  (i) => i.location_address === INCIDENT_ADDRESS_TOKEN
);

// A time shared by at least one incident for the "Equals" time filter
const SAMPLE_TIME = toTimeString(INCIDENTS[0].incident_datetime);

const CREATE_LOCATION = LOCATIONS[0];
const UNIQUE_REF_PREFIX = `PW-INC`;

// --- Sort and filter definitions -----------------------------------------------

const SORT_CASES: SortCase[] = [
  { header: "Date", kind: "date" },
  { header: "Time", kind: "time" },
];

const FILTER_CASES: FilterCase[] = [
  // Address — text
  {
    kind: "text",
    column: "Address",
    operator: "Contains",
    value: INCIDENT_ADDRESS_TOKEN,
    expectedCount: INCIDENTS_AT_TOKEN,
  },
  {
    kind: "text",
    column: "Address",
    operator: "Equals",
    value: INCIDENT_ADDRESS_TOKEN,
    expectedCount: INCIDENTS_AT_TOKEN,
  },
  {
    kind: "text",
    column: "Address",
    operator: "Not equals",
    value: INCIDENT_ADDRESS_TOKEN,
    expectedCount: TOTAL - INCIDENTS_AT_TOKEN,
  },
  // Date — After/Before (all incidents are in the past, within 363 days)
  {
    kind: "date",
    column: "Date",
    operator: "After",
    value: formatDateInput(new Date(Date.now() - 2 * 365 * 86400000)),
    expectedCount: TOTAL,
  },
  {
    kind: "date",
    column: "Date",
    operator: "Before",
    value: formatDateInput(new Date(Date.now() + 86400000)),
    expectedCount: TOTAL,
  },
  // Time — Equals/After/Before/Between
  {
    kind: "time",
    column: "Time",
    operator: "Equals",
    value: SAMPLE_TIME,
    expectedCount: countWhere(
      INCIDENTS,
      (i) => toTimeString(i.incident_datetime) === SAMPLE_TIME
    ),
  },
  {
    kind: "time",
    column: "Time",
    operator: "After",
    value: "00:00",
    expectedCount: TOTAL,
  },
  {
    kind: "time",
    column: "Time",
    operator: "Before",
    value: "23:59",
    expectedCount: TOTAL,
  },
  {
    kind: "time",
    column: "Time",
    operator: "Between",
    value: { from: "00:00", to: "23:59" },
    expectedCount: TOTAL,
  },
  // Severity — select operators
  {
    kind: "select",
    column: "Severity",
    operator: "Equals",
    value: "Citation",
    expectedCount: CITATION_COUNT,
  },
  {
    kind: "select",
    column: "Severity",
    operator: "Not equals",
    value: "Citation",
    expectedCount: TOTAL - CITATION_COUNT,
  },
  {
    kind: "select",
    column: "Severity",
    operator: "Is one of",
    value: ["Citation", "Remote Warning"],
    expectedCount: CITATION_COUNT + REMOTE_WARNING_COUNT,
  },
  {
    kind: "select",
    column: "Severity",
    operator: "Is not one of",
    value: ["Citation"],
    expectedCount: TOTAL - CITATION_COUNT,
  },
  // Reference ID — nullable text
  {
    kind: "text",
    column: "Reference ID",
    operator: "Is not empty",
    expectedCount: WITH_REF_COUNT,
  },
  {
    kind: "text",
    column: "Reference ID",
    operator: "Is empty",
    expectedCount: WITHOUT_REF_COUNT,
  },
  // Description — nullable text
  {
    kind: "text",
    column: "Description",
    operator: "Is not empty",
    expectedCount: countWhere(INCIDENTS, (i) => !!i.description),
  },
];

// ==============================================================================

test.describe("Incidents — exhaustive", () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/incidents");
    await openStaffTab(page, "Incidents");
    await waitForTableReady(page);
  });

  // --- Read ---------------------------------------------------------------------

  test.describe("read", () => {
    test("view data: cells are populated", async ({ page }) => {
      await expect(
        page.getByRole("cell", { name: /Warning|Citation/ }).first()
      ).toBeVisible();
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

    test("pagination: total matches seed", async ({ page }) => {
      expect(await getPaginationTotal(page)).toBe(TOTAL);
    });

    test("global search: finds matching rows", async ({ page }) => {
      const refWithValue = INCIDENTS.find((i) => i.reference_id);
      if (!refWithValue)
        throw new Error("No seeded incident with reference_id");
      await setGlobalSearch(page, refWithValue.reference_id!);
      expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    });

    test("global search: no results for nonsense input", async ({ page }) => {
      await setGlobalSearch(page, "zzz-no-match-xyz-playwright-000");
      expect(await getPaginationTotal(page)).toBe(0);
    });
  });

  // --- Modify -------------------------------------------------------------------

  test.describe("modify", () => {
    const ctx = { ref: null as string | null };
    const steps = new Steps(ctx);

    const ensureIncidentCreated = steps.step(async (page) => {
      const ref = `${UNIQUE_REF_PREFIX}-${Date.now()}`;
      await page.getByRole("button", { name: /New Incident/i }).click();
      await selectAddressSuggestion(
        page,
        "",
        CREATE_LOCATION.formatted_address
      );
      await page.getByLabel("Incident Date").fill(formatDateInput(new Date()));
      await page.getByLabel("Incident Time").fill("20:45");
      await selectSidebarCombobox(page, 0, "Citation");
      await page.getByLabel("Reference ID").fill(ref);
      await page
        .getByLabel("Description")
        .fill(`Playwright test incident ${ref}`);
      await page.getByRole("button", { name: "Save" }).click();
      await waitForTableReady(page);
      ctx.ref = ref;
      return ["ref"] as const;
    });

    const ensureIncidentEdited = steps.step(async (page) => {
      const { ref } = await ensureIncidentCreated(page);
      await setGlobalSearch(page, ref);
      await clickRowAction(page, ref, "Edit");
      await selectSidebarCombobox(page, 0, "Remote Warning");
      await page.getByRole("button", { name: "Save" }).click();
      await waitForTableReady(page);
      return ["ref"] as const;
    });

    test("create new incident", async ({ page }) => {
      const { ref } = await ensureIncidentCreated(page);
      await setGlobalSearch(page, ref);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("edit incident: change severity", async ({ page }) => {
      await ensureIncidentEdited(page);
      await expect(
        page.getByRole("cell", { name: "Remote Warning" }).first()
      ).toBeVisible();
    });

    test("delete incident", async ({ page }) => {
      const { ref } = await ensureIncidentCreated(page);
      await setGlobalSearch(page, ref);
      await clickRowAction(page, ref, "Delete");
      await confirmDialog(page, "Delete");
      expect(await getPaginationTotal(page)).toBe(0);
    });
  });
});
