import { loginAsAdmin } from "../../helpers/auth";
import { expect, test } from "../../helpers/fixtures";
import {
  LOCATIONS,
  countWhere,
  firstUniqueToken,
  formatDateInput,
} from "../../helpers/seedData";
import {
  applyDateFilter,
  applyNumberFilter,
  applyTextFilter,
  clearFilter,
  clickRowAction,
  confirmDialog,
  getColumnCellTexts,
  getPaginationTotal,
  goToPage,
  openStaffTab,
  selectAddressSuggestion,
  setGlobalSearch,
  setPageSize,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Staff locations table", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, "/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);
  });

  test("supports text, number, and nullable date filters plus pagination", async ({
    page,
  }) => {
    const addressToken = firstUniqueToken(
      LOCATIONS.map((location) => location.formatted_address)
    );
    const expectedAddressCount = countWhere(LOCATIONS, (location) =>
      location.formatted_address
        .toLowerCase()
        .includes(addressToken.toLowerCase())
    );

    await applyTextFilter(page, "Address", "Contains", addressToken);
    expect(await getPaginationTotal(page)).toBe(expectedAddressCount);
    await clearFilter(page, "Address");

    await applyNumberFilter(page, "Incidents", "Greater than", 1);
    expect(await getPaginationTotal(page)).toBe(
      countWhere(LOCATIONS, (location) => location.incident_count >= 1)
    );
    await clearFilter(page, "Incidents");

    await applyDateFilter(page, "Active Hold", "Active");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(LOCATIONS, (location) => location.hold_expiration !== null)
    );
    await clearFilter(page, "Active Hold");

    await applyDateFilter(page, "Active Hold", "Inactive");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(LOCATIONS, (location) => location.hold_expiration === null)
    );
    await clearFilter(page, "Active Hold");

    await setPageSize(page, 10);
    const firstPageAddresses = await getColumnCellTexts(page, "Address");
    await goToPage(page, 2);
    const secondPageAddresses = await getColumnCellTexts(page, "Address");
    expect(secondPageAddresses).not.toEqual(firstPageAddresses);
  });

  test("supports create, edit, and delete", async ({ page }) => {
    const createAddress = "100 E Franklin St, Chapel Hill, NC 27514, USA";
    const editedSearchTerm = "Expires:";

    await page.getByRole("button", { name: /New Location/i }).click();
    await selectAddressSuggestion(page, "", createAddress);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, createAddress);
    await clickRowAction(page, createAddress, "Edit");
    await page
      .getByLabel(/Hold Expiration/)
      .fill(formatDateInput(new Date(Date.now() + 86400000 * 5)));
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);
    await expect(page.getByText(editedSearchTerm).first()).toBeVisible();

    await clickRowAction(page, createAddress, "Delete");
    await confirmDialog(page, "Delete");
  });
});
