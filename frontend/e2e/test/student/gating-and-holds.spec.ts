import { ADMIN_AUTH_FILE } from "../../global-setup";
import { loginAsAdmin, loginViaSaml } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { STUDENT1, STUDENT2, STUDENT3 } from "../../helpers/seed-state.helpers";
import { formatDateInput } from "../../helpers/seed.helpers";
import {
  clickRowAction,
  openStaffTab,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// ---------------------------------------------------------------------------
// Party-Smart states
// ---------------------------------------------------------------------------

test.describe("Party-Smart gating states", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("student2 (no party-smart): shows 'Course not completed' + New Party disabled", async ({
    page,
  }) => {
    await loginViaSaml(page, STUDENT2.username, STUDENT2.password, "student");

    // Registration Status section shows "Course not completed"
    await expect(page.getByText("Course not completed")).toBeVisible();

    // New Party button is disabled
    const newPartyWrapper = page.locator(
      'span[title="Complete the Party Smart Course to register a party"]'
    );
    await expect(newPartyWrapper).toBeVisible();
    await expect(
      newPartyWrapper.getByRole("button", { name: /New Party/i })
    ).toBeDisabled();
  });

  test("student3 (party-smart expired): shows 'Course not completed' + New Party disabled", async ({
    page,
  }) => {
    await loginViaSaml(page, STUDENT3.username, STUDENT3.password, "student");

    // Expired party smart also means "Course not completed" for current year
    await expect(page.getByText("Course not completed")).toBeVisible();

    const newPartyWrapper = page.locator(
      'span[title="Complete the Party Smart Course to register a party"]'
    );
    await expect(newPartyWrapper).toBeVisible();
    await expect(
      newPartyWrapper.getByRole("button", { name: /New Party/i })
    ).toBeDisabled();
  });

  test("student1 (party-smart complete): shows 'Completed on' + 'Expires' + New Party enabled", async ({
    page,
  }) => {
    await loginViaSaml(page, STUDENT1.username, STUDENT1.password, "student");

    // Registration Status shows completed
    await expect(page.getByText(/Completed on/)).toBeVisible();
    await expect(page.getByText(/Expires/)).toBeVisible();

    // New Party link should be a real link (not disabled span)
    await expect(page.getByRole("link", { name: /New Party/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Holds chain
// ---------------------------------------------------------------------------

test.describe("Holds chain (one DB session)", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("admin sets hold on student1 residence → student1 dashboard shows hold message + New Party disabled", async ({
    page,
    browser,
  }) => {
    // Step 1: Admin sets a hold on location_id 1 (408 Pittsboro St — student1's residence)
    const adminCtx = await browser.newContext({
      storageState: ADMIN_AUTH_FILE,
    });
    const adminPage = await adminCtx.newPage();
    await loginAsAdmin(adminPage);
    await openStaffTab(adminPage, "Locations");
    await setGlobalSearch(adminPage, "408 Pittsboro");
    await waitForTableReady(adminPage);

    // Edit the location
    await clickRowAction(adminPage, "408 Pittsboro", "Edit");

    // Fill hold expiration (must be > 1 business day out per the date constraint)
    const holdDate = new Date(Date.now() + 7 * 86400000); // 7 days from now
    const holdDateStr = formatDateInput(holdDate);

    const holdInput = adminPage.getByLabel("Hold Expiration");
    await holdInput.fill(holdDateStr);

    await adminPage.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(adminPage);

    await adminCtx.close();

    // Step 2: student1 logs in and sees the hold banner
    await loginViaSaml(page, STUDENT1.username, STUDENT1.password, "student");

    // Dashboard shows "Residence on hold until <date>" in red (destructive)
    await expect(page.getByText(/Residence on hold until/)).toBeVisible();

    // New Party button is disabled with hold tooltip
    const holdWrapper = page.locator(
      'span[title="A party cannot be registered on a residence with an active hold"]'
    );
    await expect(holdWrapper).toBeVisible();
    await expect(
      holdWrapper.getByRole("button", { name: /New Party/i })
    ).toBeDisabled();

    // /new-party redirects to /
    await page.goto("/new-party");
    await page.waitForURL("/");
  });
});
