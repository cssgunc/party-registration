import { loginAsAdmin } from "../../helpers/auth";
import { expect, test } from "../../helpers/fixtures";
import {
  INCIDENTS,
  LOCATIONS,
  countWhere,
  formatDateInput,
  toTimeString,
} from "../../helpers/seedData";
import {
  applySelectFilter,
  applyTextFilter,
  applyTimeFilter,
  clearFilter,
  clickRowAction,
  confirmDialog,
  getPaginationTotal,
  openStaffTab,
  selectAddressSuggestion,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Staff incidents table", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, "/staff/incidents");
    await openStaffTab(page, "Incidents");
    await waitForTableReady(page);
  });

  test("supports text, select, time, and nullable filters", async ({
    page,
  }) => {
    await expect(
      page.getByRole("cell", { name: "Citation" }).first()
    ).toBeVisible();

    await applyTextFilter(
      page,
      "Address",
      "Contains",
      INCIDENTS[0].location_address
    );
    expect(await getPaginationTotal(page)).toBe(
      countWhere(
        INCIDENTS,
        (incident) =>
          incident.location_address === INCIDENTS[0].location_address
      )
    );
    await clearFilter(page, "Address");

    await applySelectFilter(page, "Severity", "Equals", "Citation");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(INCIDENTS, (incident) => incident.severity === "citation")
    );
    await clearFilter(page, "Severity");

    await applySelectFilter(page, "Severity", "Is one of", [
      "Citation",
      "Remote Warning",
    ]);
    expect(await getPaginationTotal(page)).toBe(
      countWhere(
        INCIDENTS,
        (incident) =>
          incident.severity === "citation" ||
          incident.severity === "remote_warning"
      )
    );
    await clearFilter(page, "Severity");

    await applyTimeFilter(
      page,
      "Time",
      "Equals",
      toTimeString(INCIDENTS[0].incident_datetime)
    );
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    await clearFilter(page, "Time");

    await applyTextFilter(page, "Reference ID", "Is not empty");
    await clearFilter(page, "Reference ID");
  });

  test("supports create, edit, search, and delete", async ({ page }) => {
    const uniqueReference = `PW-${Date.now()}`;
    const location = LOCATIONS[0];

    await page.getByRole("button", { name: /New Incident/i }).click();
    await selectAddressSuggestion(page, "", location.formatted_address);
    await page.getByLabel("Incident Date").fill(formatDateInput(new Date()));
    await page.getByLabel("Incident Time").fill("20:45");
    await selectSidebarCombobox(page, 0, "Citation");
    await page.getByLabel("Reference ID").fill(uniqueReference);
    await page
      .getByLabel("Description")
      .fill(`Playwright incident ${uniqueReference}`);
    await page.getByRole("button", { name: "Save" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, uniqueReference);
    expect(await getPaginationTotal(page)).toBe(1);

    await clickRowAction(page, uniqueReference, "Edit");
    await selectSidebarCombobox(page, 0, "Remote Warning");
    await page.getByRole("button", { name: "Save" }).click();
    await waitForTableReady(page);

    await clickRowAction(page, uniqueReference, "Delete");
    await confirmDialog(page, "Delete");
    await setGlobalSearch(page, uniqueReference);
    expect(await getPaginationTotal(page)).toBe(0);
  });
});
