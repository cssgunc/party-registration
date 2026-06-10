import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db";
import {
  FilterCase,
  SortCase,
  filterAndExpect,
  filterTestTitle,
  sortAndVerify,
} from "../../helpers/exhaustive";
import { expect, suiteTest as test } from "../../helpers/fixtures";
import {
  LOCATIONS,
  PARTIES,
  STUDENTS,
  countWhere,
  formatDateInput,
  formatUiTime,
  toTimeString,
} from "../../helpers/seedData";
import { Steps } from "../../helpers/steps";
import {
  clickRowAction,
  confirmDialog,
  getColumnCellTexts,
  getPaginationTotal,
  getResultsSummary,
  openRowActions,
  openStaffTab,
  selectAddressSuggestion,
  selectSidebarCombobox,
  selectStudentSuggestion,
  setGlobalSearch,
  sortColumn,
  waitForTableReady,
} from "../../helpers/table";

// --- Seed data constants -------------------------------------------------------

const TOTAL = 182;
const CONFIRMED_COUNT = countWhere(PARTIES, (p) => p.status === "confirmed");
const CANCELLED_COUNT = countWhere(PARTIES, (p) => p.status === "cancelled");

const LOCATION = LOCATIONS[0];
const STUDENT = STUDENTS[0];

// A time present in at least one seeded party
const SAMPLE_TIME = toTimeString(PARTIES[0].party_datetime);
const SAMPLE_TIME_COUNT = countWhere(
  PARTIES,
  (p) =>
    formatUiTime(p.party_datetime) === formatUiTime(PARTIES[0].party_datetime)
);

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
    value: LOCATION.formatted_address,
    expectedCount: countWhere(
      PARTIES,
      (p) => p.location_address === LOCATION.formatted_address
    ),
  },
  // Date — After/Before (parties span -12 to +12 days from now)
  {
    kind: "date",
    column: "Date",
    operator: "After",
    value: formatDateInput(new Date(Date.now() - 14 * 86400000)),
    expectedCount: TOTAL,
  },
  {
    kind: "date",
    column: "Date",
    operator: "Before",
    value: formatDateInput(new Date(Date.now() + 14 * 86400000)),
    expectedCount: TOTAL,
  },
  // Time — Equals/Between
  {
    kind: "time",
    column: "Time",
    operator: "Equals",
    value: SAMPLE_TIME,
    expectedCount: SAMPLE_TIME_COUNT,
  },
  {
    kind: "time",
    column: "Time",
    operator: "Between",
    value: { from: "00:00", to: "23:59" },
    expectedCount: TOTAL,
  },
  // Contact One — text
  {
    kind: "text",
    column: "Contact One",
    operator: "Contains",
    value: STUDENT.first_name,
    expectedCount: countWhere(PARTIES, (p) =>
      p.contact_one_name
        .toLowerCase()
        .includes(STUDENT.first_name.toLowerCase())
    ),
  },
  // Active — select (status)
  {
    kind: "select",
    column: "Active",
    operator: "Equals",
    value: "Confirmed",
    expectedCount: CONFIRMED_COUNT,
  },
  {
    kind: "select",
    column: "Active",
    operator: "Equals",
    value: "Cancelled",
    expectedCount: CANCELLED_COUNT,
  },
  {
    kind: "select",
    column: "Active",
    operator: "Is one of",
    value: ["Confirmed", "Cancelled"],
    expectedCount: TOTAL,
  },
];

// ==============================================================================

test.describe("Parties — exhaustive", () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);
  });

  // --- Read ---------------------------------------------------------------------

  test.describe("read", () => {
    test("view data: cells are populated", async ({ page }) => {
      const dates = await getColumnCellTexts(page, "Date");
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0]).not.toBe("");
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

    test("sort Date: third click resets to default order", async ({ page }) => {
      const initialDates = await getColumnCellTexts(page, "Date");
      await sortColumn(page, "Date", "asc");
      await sortColumn(page, "Date", "desc");
      // Clicking the active desc direction a second time clears the sort
      await sortColumn(page, "Date", "desc");
      expect(await getColumnCellTexts(page, "Date")).toEqual(initialDates);
    });

    for (const tc of FILTER_CASES) {
      test(filterTestTitle(tc), async ({ page }) => {
        await filterAndExpect(page, tc);
      });
    }

    test("pagination: total matches seed", async ({ page }) => {
      expect(await getPaginationTotal(page)).toBe(TOTAL);
    });

    test("global search: finds matching rows", async ({ page }) => {
      await setGlobalSearch(page, STUDENT.email);
      expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    });

    test("global search: no results for nonsense input", async ({ page }) => {
      await setGlobalSearch(page, "zzz-no-match-xyz-playwright-000");
      expect(await getPaginationTotal(page)).toBe(0);
    });

    test("exception: active party has Cancel but no Delete", async ({
      page,
    }) => {
      const confirmedParty = PARTIES.find((p) => p.status === "confirmed");
      if (!confirmedParty) throw new Error("No confirmed party in seed data");
      await setGlobalSearch(page, confirmedParty.location_address);
      await openRowActions(page, confirmedParty.location_address);
      await expect(
        page.getByRole("menuitem", { name: "Cancel" })
      ).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(
        0
      );
      await page.keyboard.press("Escape");
    });
  });

  // --- Modify -------------------------------------------------------------------

  test.describe("modify", () => {
    const ctx = {
      email: null as string | null,
      contactName: null as string | null, // updated by any step that renames the party
    };
    const steps = new Steps(ctx);

    const ensurePartyCreated = steps.step(async (page) => {
      const email = `playwright-party-${Date.now()}@unc.edu`;
      await page.getByRole("button", { name: /New Party/i }).click();
      await selectAddressSuggestion(page, "", LOCATION.formatted_address);
      await page
        .getByLabel("Party Date")
        .fill(formatDateInput(new Date(Date.now() + 86400000 * 2)));
      await page.getByLabel("Party Time").fill("21:00");
      await selectStudentSuggestion(
        page,
        STUDENT.email,
        `${STUDENT.first_name} ${STUDENT.last_name}`
      );
      await page.getByLabel("Contact Email").fill(email);
      await page.getByLabel("First Name").fill("Playwright");
      await page.getByLabel("Last Name").fill("Test");
      await page.getByLabel("Phone Number").fill("9195551234");
      await selectSidebarCombobox(page, 0, "Text");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      ctx.email = email;
      ctx.contactName = "Playwright Test";
      return ["email", "contactName"] as const;
    });

    const ensurePartyEdited = steps.step(async (page) => {
      const { email, contactName } = await ensurePartyCreated(page);
      await setGlobalSearch(page, email);
      await clickRowAction(page, contactName, "Edit");
      await page.getByLabel("Last Name").fill("Updated");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      ctx.contactName = "Playwright Updated";
      return ["email", "contactName"] as const;
    });

    const ensurePartyCancelled = steps.step(async (page) => {
      const { email, contactName } = await ensurePartyCreated(page);
      await setGlobalSearch(page, email);
      await clickRowAction(page, contactName, "Cancel");
      await confirmDialog(page, "Cancel Party");
      return ["email", "contactName"] as const;
    });

    test("create new party", async ({ page }) => {
      const { email } = await ensurePartyCreated(page);
      await setGlobalSearch(page, email);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("edit party: update last name", async ({ page }) => {
      const { email } = await ensurePartyEdited(page);
      await setGlobalSearch(page, email);
      expect(await getPaginationTotal(page)).toBe(1);
      await expect(page.getByText("Playwright Updated")).toBeVisible();
    });

    test("exception: cancel active party", async ({ page }) => {
      const { email, contactName } = await ensurePartyCancelled(page);
      await setGlobalSearch(page, email);
      await expect(async () => {
        await page.keyboard.press("Escape");
        await openRowActions(page, contactName);
        await expect(
          page.getByRole("menuitem", { name: "Restore" })
        ).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 10_000 });
      await page.keyboard.press("Escape");
    });

    test("exception: restore cancelled party", async ({ page }) => {
      const { email, contactName } = await ensurePartyCancelled(page);
      await setGlobalSearch(page, email);
      await clickRowAction(page, contactName, "Restore");
      await waitForTableReady(page);
      await setGlobalSearch(page, email);
      await openRowActions(page, contactName);
      await expect(
        page.getByRole("menuitem", { name: "Cancel" })
      ).toBeVisible();
    });
  });
});
