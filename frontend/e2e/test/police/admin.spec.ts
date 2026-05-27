import { expect, test } from "@playwright/test";
import { loginViaSaml } from "../../helpers/auth";
import { POLICE_ACCOUNTS, countWhere } from "../../helpers/seedData";
import {
  applySelectFilter,
  applyTextFilter,
  clearFilter,
  clickRowAction,
  expectSorted,
  getColumnCellTexts,
  getPaginationTotal,
  openRowActions,
  selectSidebarCombobox,
  sortColumn,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Police admin table", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaSaml(
      page,
      "dreyes@chapelhillnc.gov",
      "securepassword",
      "admin",
      "/police/admin"
    );
    await waitForTableReady(page);
  });

  test("supports sorting and filters", async ({ page }) => {
    await sortColumn(page, "Email", "asc");
    expectSorted(await getColumnCellTexts(page, "Email"), "text", "asc");
    await sortColumn(page, "Email", "desc");
    expectSorted(await getColumnCellTexts(page, "Email"), "text", "desc");

    await applyTextFilter(page, "Email", "Contains", "@chapelhillnc.gov");
    expect(await getPaginationTotal(page)).toBe(POLICE_ACCOUNTS.length);
    await clearFilter(page, "Email");

    await applySelectFilter(page, "Verified", "Equals", "True");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(POLICE_ACCOUNTS, (account) => account.is_verified)
    );
  });

  test("supports edit and self-delete restriction", async ({ page }) => {
    const officer = POLICE_ACCOUNTS.find(
      (account) => account.role === "officer"
    );
    if (!officer) throw new Error("Expected seeded officer account");

    await clickRowAction(page, officer.email, "Edit");
    await selectSidebarCombobox(page, 0, "Police Admin");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);

    await clickRowAction(page, officer.email, "Edit");
    await selectSidebarCombobox(page, 0, "Officer");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);

    await openRowActions(page, "dreyes@chapelhillnc.gov");
    await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  });
});
