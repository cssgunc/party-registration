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
    // Incidents support full CRUD (Locations no longer has a Delete action)
    await page.goto("/staff/incidents");
    await openStaffTab(page, "Incidents");
    await waitForTableReady(page);

    const incidentAddress = "100 E Franklin St, Chapel Hill, NC 27514, USA";

    // new row
    await page.getByRole("button", { name: /New Incident/i }).click();
    await expect(
      page.getByRole("heading", { name: "New Incident" })
    ).toBeVisible();
    await selectAddressSuggestion(page, "", incidentAddress);
    await page
      .locator('input[placeholder="mm/dd/yyyy"]')
      .fill(formatDateInput(new Date()));
    await page.locator('input[type="time"]').fill("20:00");
    await page.getByRole("button", { name: "Save" }).click();
    await waitForTableReady(page);
    await setGlobalSearch(page, incidentAddress);
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);

    // edit row
    await clickRowAction(page, incidentAddress, "Edit");
    await page.getByLabel("Description").fill("Playwright smoke test");
    await page.getByRole("button", { name: "Save" }).click();
    await waitForTableReady(page);

    // delete row
    const countBefore = await getPaginationTotal(page);
    await clickRowAction(page, incidentAddress, "Delete");
    await confirmDialog(page, "Delete");
    // Re-apply the search to guarantee a fresh server count (the pagination
    // text can lag behind the row removal if we only waitForTableReady).
    await setGlobalSearch(page, "");
    await waitForTableReady(page);
    await setGlobalSearch(page, incidentAddress);
    await waitForTableReady(page);
    expect(await getPaginationTotal(page)).toBe(countBefore - 1);
  });
});
