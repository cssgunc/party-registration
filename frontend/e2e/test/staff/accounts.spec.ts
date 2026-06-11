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
  AGGREGATE_ACCOUNTS,
  POLICE_ACCOUNTS,
} from "../../helpers/seed.helpers";
import { Steps } from "../../helpers/steps.helpers";
import {
  clickRowAction,
  confirmDialog,
  getPaginationTotal,
  getResultsSummary,
  openRowActions,
  openStaffTab,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// --- Seed data constants -------------------------------------------------------

// 2 staff/admin + 2 police = 4 total
const TOTAL = AGGREGATE_ACCOUNTS.length; // 4
const ADMIN_COUNT = AGGREGATE_ACCOUNTS.filter((a) => a.role === "admin").length; // 1
const STAFF_COUNT = AGGREGATE_ACCOUNTS.filter((a) => a.role === "staff").length; // 1
const ACTIVE_COUNT = AGGREGATE_ACCOUNTS.filter(
  (a) => a.status === "active"
).length; // 4

// The admin account is the currently logged-in user — delete is restricted.
const ADMIN_ACCOUNT = AGGREGATE_ACCOUNTS.find((a) => a.role === "admin")!;
// The staff account can be edited freely.
const STAFF_ACCOUNT = AGGREGATE_ACCOUNTS.find((a) => a.role === "staff")!;
// The officer account — police rows open PoliceAccountTableForm (different fields).
const POLICE_OFFICER = POLICE_ACCOUNTS.find((a) => a.role === "officer")!;

// --- Sort and filter definitions -----------------------------------------------

const SORT_CASES: SortCase[] = [{ header: "Email", kind: "text" }];

const FILTER_CASES: FilterCase[] = [
  // Email — text
  {
    kind: "text",
    column: "Email",
    operator: "Contains",
    value: ADMIN_ACCOUNT.email,
    expectedCount: 1,
  },
  {
    kind: "text",
    column: "Email",
    operator: "Equals",
    value: ADMIN_ACCOUNT.email,
    expectedCount: 1,
  },
  {
    kind: "text",
    column: "Email",
    operator: "Not equals",
    value: ADMIN_ACCOUNT.email,
    expectedCount: TOTAL - 1,
  },
  // First Name — nullable text
  {
    kind: "text",
    column: "First Name",
    operator: "Is not empty",
    expectedCount: AGGREGATE_ACCOUNTS.filter((a) => !!a.first_name).length,
  },
  {
    kind: "text",
    column: "First Name",
    operator: "Is empty",
    expectedCount: AGGREGATE_ACCOUNTS.filter((a) => !a.first_name).length,
  },
  // Role — select
  {
    kind: "select",
    column: "Role",
    operator: "Equals",
    value: "Staff",
    expectedCount: STAFF_COUNT,
  },
  {
    kind: "select",
    column: "Role",
    operator: "Equals",
    value: "Admin",
    expectedCount: ADMIN_COUNT,
  },
  {
    kind: "select",
    column: "Role",
    operator: "Is one of",
    value: ["Admin", "Staff"],
    expectedCount: ADMIN_COUNT + STAFF_COUNT,
  },
  // Status — select (all are active in seed; invited count is 0)
  {
    kind: "select",
    column: "Status",
    operator: "Equals",
    value: "Active",
    expectedCount: ACTIVE_COUNT,
  },
  {
    kind: "select",
    column: "Status",
    operator: "Equals",
    value: "Invited",
    expectedCount: 0,
  },
];

// ==============================================================================

test.describe("Accounts — exhaustive", () => {
  test.describe.configure({ timeout: 300_000 });
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/accounts");
    await openStaffTab(page, "Accounts");
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

    test("global search: finds matching rows", async ({ page }) => {
      await setGlobalSearch(page, STAFF_ACCOUNT.email);
      expect(await getPaginationTotal(page)).toBe(1);
      await expect(page.getByText(STAFF_ACCOUNT.email)).toBeVisible();
    });

    test("global search: no results for nonsense input", async ({ page }) => {
      await setGlobalSearch(page, "zzz-no-match-xyz-playwright-000");
      expect(await getPaginationTotal(page)).toBe(0);
    });

    test("exception: admin account has no Delete action (self)", async ({
      page,
    }) => {
      await setGlobalSearch(page, ADMIN_ACCOUNT.email);
      await openRowActions(page, ADMIN_ACCOUNT.email);
      await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(
        0
      );
      await page.keyboard.press("Escape");
    });
  });

  // --- Modify -------------------------------------------------------------------

  test.describe("modify", () => {
    const ctx = { inviteEmail: null as string | null };
    const steps = new Steps(ctx);

    const ensureInviteCreated = steps.step(async (page) => {
      const email = `playwright-invite-${Date.now()}@unc.edu`;
      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill(email);
      await selectSidebarCombobox(page, 0, "Staff");
      await page.getByRole("button", { name: "Send Invite" }).click();
      await waitForTableReady(page);
      ctx.inviteEmail = email;
      return ["inviteEmail"] as const;
    });

    test("create invite: appears as invited row", async ({ page }) => {
      const { inviteEmail } = await ensureInviteCreated(page);
      await setGlobalSearch(page, inviteEmail);
      expect(await getPaginationTotal(page)).toBe(1);
    });

    test("edit account: change role", async ({ page }) => {
      await setGlobalSearch(page, STAFF_ACCOUNT.email);
      await clickRowAction(page, STAFF_ACCOUNT.email, "Edit");
      await selectSidebarCombobox(page, 0, "Admin");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      await expect(page.getByText("Admin")).toBeVisible();
      // Restore original role
      await clickRowAction(page, STAFF_ACCOUNT.email, "Edit");
      await selectSidebarCombobox(page, 0, "Staff");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
    });

    test("edit police account: change role", async ({ page }) => {
      await setGlobalSearch(page, POLICE_OFFICER.email);
      await clickRowAction(page, POLICE_OFFICER.email, "Edit");
      await selectSidebarCombobox(page, 0, "Police Admin");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
      await expect(page.getByText("Police Admin").first()).toBeVisible();
      // Restore original role
      await clickRowAction(page, POLICE_OFFICER.email, "Edit");
      await selectSidebarCombobox(page, 0, "Officer");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await waitForTableReady(page);
    });

    test("exception: invited row shows Resend invite instead of Edit", async ({
      page,
    }) => {
      const { inviteEmail } = await ensureInviteCreated(page);
      await setGlobalSearch(page, inviteEmail);
      await openRowActions(page, inviteEmail);
      await expect(
        page.getByRole("menuitem", { name: "Resend invite" })
      ).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
      await page.keyboard.press("Escape");
      // cleanup
      await clickRowAction(page, inviteEmail, "Delete");
      await confirmDialog(page, "Delete");
    });
  });
});
