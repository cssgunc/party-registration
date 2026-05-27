import { Page, expect, test } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";
import {
  LOCATIONS,
  PARTIES,
  STUDENTS,
  countWhere,
  formatDateInput,
  formatUiTime,
  toTimeString,
} from "../../helpers/seedData";
import {
  applySelectFilter,
  applyTextFilter,
  applyTimeFilter,
  clearFilter,
  clickRowAction,
  confirmDialog,
  expectSorted,
  getColumnCellTexts,
  getPaginationTotal,
  openRowActions,
  openStaffTab,
  selectAddressSuggestion,
  selectSidebarCombobox,
  selectStudentSuggestion,
  setGlobalSearch,
  sortColumn,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Staff parties table", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, "/staff/parties");
    await openStaffTab(page, "Parties");
    await waitForTableReady(page);
  });

  test("supports sorting, default sort reset, text filters, time filters, and status filters", async ({
    page,
  }) => {
    const initialDates = await getColumnCellTexts(page, "Date");
    const timeValue = toTimeString(PARTIES[0].party_datetime);

    await sortColumn(page, "Date", "asc");
    expectSorted(await getColumnCellTexts(page, "Date"), "date", "asc");
    await sortColumn(page, "Date", "desc");
    expectSorted(await getColumnCellTexts(page, "Date"), "date", "desc");
    await sortColumn(page, "Date", "desc");
    expect(await getColumnCellTexts(page, "Date")).toEqual(initialDates);

    await applyTextFilter(
      page,
      "Address",
      "Contains",
      PARTIES[0].location_address
    );
    expect(await getPaginationTotal(page)).toBe(
      countWhere(
        PARTIES,
        (party) => party.location_address === PARTIES[0].location_address
      )
    );
    await clearFilter(page, "Address");

    await applyTimeFilter(page, "Time", "Equals", timeValue);
    expect(await getPaginationTotal(page)).toBe(
      countWhere(
        PARTIES,
        (party) =>
          formatUiTime(party.party_datetime) ===
          formatUiTime(PARTIES[0].party_datetime)
      )
    );
    await clearFilter(page, "Time");

    await applyTimeFilter(page, "Time", "Between", {
      from: "20:00",
      to: "22:00",
    });
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    await clearFilter(page, "Time");

    await applySelectFilter(page, "Active", "Equals", "Cancelled");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(PARTIES, (party) => party.status === "cancelled")
    );
  });

  test("supports create, edit, search, cancel, and restore", async ({
    page,
  }) => {
    const uniqueEmail = `playwright-party-${Date.now()}@unc.edu`;
    const location = LOCATIONS[0];
    const student = STUDENTS[0];

    await page.getByRole("button", { name: /New row/i }).click();
    await selectAddressSuggestion(
      page,
      "party-address",
      location.formatted_address
    );
    await page
      .locator("#party-date")
      .fill(formatDateInput(new Date(Date.now() + 86400000 * 2)));
    await page.locator("#party-time").fill("21:15");
    await selectStudentSuggestion(
      page,
      student.email,
      `${student.first_name} ${student.last_name}`
    );
    await page.locator("#contact-two-email").fill(uniqueEmail);
    await page.locator("#contact-two-first-name").fill("Playwright");
    await page.locator("#contact-two-last-name").fill("Party");
    await page.locator("#contact-two-phone-number").fill("9195551212");
    await selectSidebarCombobox(page, 0, "Text");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, uniqueEmail);
    expect(await getPaginationTotal(page)).toBe(1);

    await clickRowAction(page, uniqueEmail, "Edit");
    await page.locator("#contact-two-last-name").fill("Updated");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);
    await setGlobalSearch(page, "Updated");
    expect(await getPaginationTotal(page)).toBe(1);

    await clickRowAction(page, "Updated", "Cancel");
    await confirmDialog(page, "Cancel Party");
    await openAndAssertRestore(page, "Updated");
    await clickRowAction(page, "Updated", "Restore");
    await waitForTableReady(page);
  });
});

async function openAndAssertRestore(page: Page, rowText: string) {
  await openRowActions(page, rowText);
  await expect(page.getByRole("menuitem", { name: "Restore" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Cancel" })).toHaveCount(0);
  await page.keyboard.press("Escape");
}
