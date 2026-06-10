import { POLICE_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db";
import {
  FilterCase,
  SortCase,
  filterAndExpect,
  filterTestTitle,
  sortAndVerify,
} from "../../helpers/exhaustive";
import { expect, suiteTest as test } from "../../helpers/fixtures";
import { POLICE_ACCOUNTS, countWhere } from "../../helpers/seedData";
import {
  clickRowAction,
  getPaginationTotal,
  getResultsSummary,
  openRowActions,
  selectSidebarCombobox,
  waitForTableReady,
} from "../../helpers/table";

// --- Seed data constants -------------------------------------------------------

const TOTAL = POLICE_ACCOUNTS.length;
const VERIFIED_COUNT = countWhere(POLICE_ACCOUNTS, (a) => a.is_verified);

// The police_admin account is the currently logged-in user — delete is restricted.
const ADMIN_ACCOUNT = POLICE_ACCOUNTS.find((a) => a.role === "police_admin")!;
// The officer account can be edited freely.
const OFFICER_ACCOUNT = POLICE_ACCOUNTS.find((a) => a.role === "officer")!;

// --- Sort and filter definitions -----------------------------------------------

const SORT_CASES: SortCase[] = [{ header: "Email", kind: "text" }];

const FILTER_CASES: FilterCase[] = [
  {
    kind: "text",
    column: "Email",
    operator: "Contains",
    value: "@chapelhillnc.gov",
    expectedCount: TOTAL,
  },
  {
    kind: "select",
    column: "Verified",
    operator: "Equals",
    value: "True",
    expectedCount: VERIFIED_COUNT,
  },
];

// ==============================================================================

test.describe("Police Admin — exhaustive", () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ storageState: POLICE_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/police/admin");
    await waitForTableReady(page);
  });

  // --- Read ---------------------------------------------------------------------

  test.describe("read", () => {
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

    test("exception: admin account has no Delete action (self)", async ({
      page,
    }) => {
      await openRowActions(page, ADMIN_ACCOUNT.email);
      await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(
        0
      );
      await page.keyboard.press("Escape");
    });
  });

  // --- Modify -------------------------------------------------------------------

  test.describe("modify", () => {
    test("edit account: change role", async ({ page }) => {
      await clickRowAction(page, OFFICER_ACCOUNT.email, "Edit");
      await selectSidebarCombobox(page, 0, "Police Admin");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      await expect(page.getByText("Police Admin").first()).toBeVisible();
      // Restore original role
      await clickRowAction(page, OFFICER_ACCOUNT.email, "Edit");
      await selectSidebarCombobox(page, 0, "Officer");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
    });
  });
});
