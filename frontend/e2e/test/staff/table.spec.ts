import { ADMIN_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  LOCATIONS,
  countWhere,
  firstUniqueToken,
  formatDateInput,
} from "../../helpers/seed.helpers";
import {
  applyTextFilter,
  clearFilter,
  clickRowAction,
  confirmDialog,
  expectSorted,
  getColumnCellTexts,
  getPaginationTotal,
  getResultsSummary,
  goToPage,
  openStaffTab,
  selectAddressSuggestion,
  setGlobalSearch,
  setPageSize,
  sortColumn,
  waitForTableReady,
} from "../../helpers/table.helpers";

test.describe("Shared table smoke pack", () => {
  test.describe.configure({ timeout: 120_000 });
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
  });

  test("viewing data, sort, filter, pagination, and full table search", async ({
    page,
  }) => {
    // viewing data: cells are populated with expected values
    const initialAddresses = await getColumnCellTexts(page, "Address");
    expect(initialAddresses.length).toBeGreaterThan(0);
    expect(initialAddresses[0]).not.toBe("");

    // sort
    await sortColumn(page, "Address", "asc");
    expectSorted(await getColumnCellTexts(page, "Address"), "text", "asc");

    // filter
    const addressToken = firstUniqueToken(
      LOCATIONS.map((l) => l.formatted_address)
    );
    const expectedCount = countWhere(LOCATIONS, (l) =>
      l.formatted_address.toLowerCase().includes(addressToken.toLowerCase())
    );
    await applyTextFilter(page, "Address", "Contains", addressToken);
    expect(await getPaginationTotal(page)).toBe(expectedCount);
    await clearFilter(page, "Address");

    // pagination
    await setPageSize(page, 10);
    const firstPage = await getResultsSummary(page);
    await goToPage(page, 2);
    const secondPage = await getResultsSummary(page);
    expect(secondPage.start).toBe(firstPage.end + 1);

    // full table search
    await setGlobalSearch(page, addressToken);
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
  });

  test("new row, edit row, and delete row", async ({ page }) => {
    const createAddress = "100 E Franklin St, Chapel Hill, NC 27514, USA";

    // new row
    await page.getByRole("button", { name: /New Location/i }).click();
    await selectAddressSuggestion(page, "", createAddress);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);
    await setGlobalSearch(page, createAddress);
    expect(await getPaginationTotal(page)).toBe(1);

    // edit row
    await clickRowAction(page, createAddress, "Edit");
    await page
      .getByLabel(/Hold Expiration/)
      .fill(formatDateInput(new Date(Date.now() + 86400000 * 5)));
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);
    await expect(page.getByText("Expires:")).toBeVisible();

    // delete row
    await clickRowAction(page, createAddress, "Delete");
    await confirmDialog(page, "Delete");
    await setGlobalSearch(page, createAddress);
    expect(await getPaginationTotal(page)).toBe(0);
  });
});
