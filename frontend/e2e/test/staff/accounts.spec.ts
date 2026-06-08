import { Page, expect, test } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";
import { AGGREGATE_ACCOUNTS } from "../../helpers/seedData";
import {
  applySelectFilter,
  applyTextFilter,
  clearFilter,
  clickRowAction,
  confirmDialog,
  expectSorted,
  getColumnCellTexts,
  getPaginationTotal,
  openRowActions,
  openStaffTab,
  selectSidebarCombobox,
  setGlobalSearch,
  sortColumn,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Staff accounts table", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, "/staff/accounts");
    await openStaffTab(page, "Accounts");
    await waitForTableReady(page);
  });

  test("supports sorting, filtering, and global search", async ({ page }) => {
    expect(await getPaginationTotal(page)).toBe(AGGREGATE_ACCOUNTS.length);

    await applyTextFilter(page, "Email", "Contains", "johndoe");
    expect(await getPaginationTotal(page)).toBe(1);
    await expect(page.getByText("johndoe@unc.edu")).toBeVisible();
    await clearFilter(page, "Email");

    await applySelectFilter(page, "Role", "Equals", "Staff");
    expect(await getPaginationTotal(page)).toBe(1);
    await expect(page.getByText("janesmith@unc.edu")).toBeVisible();
    await clearFilter(page, "Role");

    await sortColumnAndAssert(page, "Email");

    await setGlobalSearch(page, "janesmith");
    expect(await getPaginationTotal(page)).toBe(1);
    await expect(page.getByText("janesmith@unc.edu")).toBeVisible();
  });

  test("supports create, invited-row actions, edit, and delete restrictions", async ({
    page,
  }) => {
    const uniqueEmail = `playwright-account-${Date.now()}@unc.edu`;

    await page.getByRole("button", { name: /New Invite/i }).click();
    await page.getByLabel("Email").fill(uniqueEmail);
    await selectSidebarCombobox(page, 0, "Staff");
    await page.getByRole("button", { name: "Send Invite" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, uniqueEmail);
    expect(await getPaginationTotal(page)).toBe(1);

    await openRowActions(page, uniqueEmail);
    await expect(
      page.getByRole("menuitem", { name: "Resend invite" })
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await setGlobalSearch(page, "janesmith@unc.edu");
    await clickRowAction(page, "janesmith@unc.edu", "Edit");
    await selectSidebarCombobox(page, 0, "Admin");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);
    await expect(page.getByText("Admin")).toBeVisible();

    await clickRowAction(page, "janesmith@unc.edu", "Edit");
    await selectSidebarCombobox(page, 0, "Staff");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, uniqueEmail);
    await clickRowAction(page, uniqueEmail, "Delete");
    await confirmDialog(page, "Delete");
    await setGlobalSearch(page, uniqueEmail);
    expect(await getPaginationTotal(page)).toBe(0);

    await setGlobalSearch(page, "johndoe@unc.edu");
    await openRowActions(page, "johndoe@unc.edu");
    await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  });
});

async function sortColumnAndAssert(page: Page, header: string) {
  await sortColumn(page, header, "asc");
  expectSorted(await getColumnCellTexts(page, header), "text", "asc");
  await sortColumn(page, header, "desc");
  expectSorted(await getColumnCellTexts(page, header), "text", "desc");
}
