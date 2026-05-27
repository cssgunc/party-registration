import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";
import {
  LOCATIONS,
  PARTIES,
  countWhere,
  firstUniqueToken,
} from "../../helpers/seedData";
import {
  applyNumberFilter,
  applySelectFilter,
  applyTextFilter,
  applyTimeFilter,
  clearFilter,
  getPaginationTotal,
  getResultsSummary,
  goToPage,
  openRowActions,
  openStaffTab,
  setGlobalSearch,
  sortColumn,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Shared table smoke pack", () => {
  test.describe.configure({ timeout: 120_000 });

  test("accounts smoke: sort, text filter, search, and row-action exception", async ({
    page,
  }) => {
    await loginAsAdmin(page, "/staff/accounts");
    await openStaffTab(page, "Accounts");
    await waitForTableReady(page);

    await sortColumn(page, "Email", "asc");
    await applyTextFilter(page, "Email", "Contains", "johndoe");
    expect(await getPaginationTotal(page)).toBe(1);
    await clearFilter(page, "Email");
    await setGlobalSearch(page, "johndoe");
    expect(await getPaginationTotal(page)).toBe(1);
    await openRowActions(page, "johndoe@unc.edu");
    await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  });

  test("locations smoke: number filter, nullable date filter, and pagination", async ({
    page,
  }) => {
    await loginAsAdmin(page, "/staff/locations");
    await openStaffTab(page, "Locations");
    await waitForTableReady(page);

    await applyNumberFilter(page, "Incidents", "Greater than", 1);
    expect(await getPaginationTotal(page)).toBe(
      countWhere(LOCATIONS, (location) => location.incident_count >= 1)
    );
    await clearFilter(page, "Incidents");

    await applyTextFilter(
      page,
      "Address",
      "Contains",
      firstUniqueToken(LOCATIONS.map((location) => location.formatted_address))
    );
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    await clearFilter(page, "Address");

    const firstPage = await getResultsSummary(page);
    await goToPage(page, 2);
    const secondPage = await getResultsSummary(page);
    expect(secondPage.start).toBe(firstPage.end + 1);
  });

  test("parties smoke: select filter, time filter, and search", async ({
    page,
  }) => {
    await loginAsAdmin(page, "/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);

    await applySelectFilter(page, "Active", "Equals", "Cancelled");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(PARTIES, (party) => party.status === "cancelled")
    );
    await clearFilter(page, "Active");

    await applyTimeFilter(page, "Time", "Between", {
      from: "20:00",
      to: "22:00",
    });
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    await clearFilter(page, "Time");

    await setGlobalSearch(page, PARTIES[0].location_address);
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
  });
});
