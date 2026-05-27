import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../../helpers/auth";
import { PARTIES, STUDENTS, countWhere } from "../../helpers/seedData";
import {
  applySelectFilter,
  applyTextFilter,
  clearFilter,
  clickRowAction,
  confirmDialog,
  getPaginationTotal,
  openStaffTab,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table";

test.describe("Staff students table", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, "/staff/students");
    await openStaffTab(page, "Students");
    await waitForTableReady(page);
  });

  test("supports text filters, select filters, and search", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: /New row/i })).toHaveCount(0);

    await applyTextFilter(page, "Email", "Contains", "stevenmorrison");
    expect(await getPaginationTotal(page)).toBe(1);
    await clearFilter(page, "Email");

    await applySelectFilter(page, "Call/Text", "Equals", "Text");
    expect(await getPaginationTotal(page)).toBe(
      countWhere(STUDENTS, (student) => student.contact_preference === "text")
    );
    await clearFilter(page, "Call/Text");

    await applySelectFilter(page, "Is Registered", "Equals", "True");
    expect(await getPaginationTotal(page)).toBeGreaterThan(0);
    await clearFilter(page, "Is Registered");

    await setGlobalSearch(page, "stevenmorrison");
    expect(await getPaginationTotal(page)).toBe(1);
  });

  test("supports edit and delete", async ({ page }) => {
    const partyStudentIds = new Set(
      PARTIES.map((party) => party.contact_one_id)
    );
    const student = STUDENTS.find(
      (candidate) => !partyStudentIds.has(candidate.id)
    );
    if (!student)
      throw new Error("Expected a student not referenced by seeded parties");
    const updatedPhone = "9195556789";

    await setGlobalSearch(page, student.email);
    await clickRowAction(page, student.email, "Edit");
    await page.getByLabel("Phone Number").fill(updatedPhone);
    await selectSidebarCombobox(page, 0, "Call");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);
    await expect(page.getByText("(919) 555-6789")).toBeVisible();

    await clickRowAction(page, student.email, "Delete");
    await confirmDialog(page, "Delete");
    await setGlobalSearch(page, student.email);
    expect(await getPaginationTotal(page)).toBe(0);
  });
});
