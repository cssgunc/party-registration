import { ADMIN_AUTH_FILE } from "../../global-setup";
import { loginAsAdmin, loginViaSaml } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { clearInbox, waitForMessageTo } from "../../helpers/mailpit.helpers";
import { STUDENT4 } from "../../helpers/seed-state.helpers";
import { formatDateInput } from "../../helpers/seed.helpers";
import {
  openStaffTab,
  selectAddressSuggestion,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// ---------------------------------------------------------------------------
// (A) Register via the new-party form
// ---------------------------------------------------------------------------

test.describe("(A) First-time onboarding — register via new-party form", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("new-party locked until party-smart complete, then full flow with emails", async ({
    page,
    browser,
  }) => {
    // 1. student4 logs in for the first time (auto-provision)
    await loginViaSaml(page, STUDENT4.username, STUDENT4.password, "student");

    // Dashboard: New Party button disabled with party-smart tooltip
    const newPartyWrapper = page.locator(
      'span[title="Complete the Party Smart Course to register a party"]'
    );
    await expect(newPartyWrapper).toBeVisible();
    const disabledBtn = newPartyWrapper.getByRole("button", {
      name: /New Party/i,
    });
    await expect(disabledBtn).toBeDisabled();

    // Navigating to /new-party redirects back to /
    await page.goto("/new-party");
    await page.waitForURL("/");

    // 2. Admin marks student4 as registered via Students table checkbox
    const adminCtx = await browser.newContext({
      storageState: ADMIN_AUTH_FILE,
    });
    const adminPage = await adminCtx.newPage();
    await loginAsAdmin(adminPage);
    await openStaffTab(adminPage, "Students");
    await setGlobalSearch(adminPage, STUDENT4.email);
    await waitForTableReady(adminPage);

    // Click the "Is Registered" checkbox for student4's row
    const row = adminPage.getByRole("row").filter({ hasText: STUDENT4.email });
    await expect(row.first()).toBeVisible();
    const checkbox = row.first().getByRole("checkbox");
    await checkbox.click();
    await waitForTableReady(adminPage);

    await adminCtx.close();

    // 3. Back to student4 — /new-party is now accessible
    await page.goto("/new-party");
    await expect(
      page.getByRole("heading", { name: "Register Party" })
    ).toBeVisible();

    // 4. Fill the form — student4 has no phone/contact preference/residence
    // Address field should be editable (no residence yet)
    await selectAddressSuggestion(page, "", "408 Pittsboro");

    // Party date + time
    const partyDate = new Date(Date.now() + 2 * 86400000);
    await page.getByLabel("Party Date").fill(formatDateInput(partyDate));
    await page.getByLabel("Party Time").fill("20:00");

    // Inline phone / contact preference (student4 has no phone yet)
    await page.getByLabel("Phone Number").first().fill("9195550101");
    await page.getByLabel("Contact Preference").first().click();
    await page.getByRole("option", { name: "Text", exact: true }).click();

    // Second contact info
    await page.getByLabel("First Name").fill("ContactTwo");
    await page.getByLabel("Last Name").fill("Person");
    // Second contact phone — different from student4's 9195550101
    await page.getByLabel("Phone Number").nth(1).fill("9195550202");
    await page.getByLabel("Contact Preference").last().click();
    await page.getByRole("option", { name: "Text", exact: true }).click();

    const contactTwoEmail = "playwright-c2-onboarding@unc.edu";
    await page.getByLabel("Contact Email").fill(contactTwoEmail);

    // Clear inbox before submitting
    await clearInbox();

    // Submit
    await page.getByRole("button", { name: "Submit Event" }).click();

    // If address is new, confirm dialog shows
    const confirmDialog = page.getByRole("dialog").filter({
      hasText: "Confirm Address Change",
    });
    if (await confirmDialog.isVisible()) {
      await page
        .getByRole("button", { name: "Confirm Address Change" })
        .click();
    }

    // Redirect to dashboard
    await page.waitForURL("/");
    await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();

    // Residence short address appears next to "Parties" title
    await expect(page.getByText(/408 Pittsboro/)).toBeVisible();

    // 5. Both contacts receive email notifications
    const contact1Msg = await waitForMessageTo(STUDENT4.email, {
      subjectIncludes: "Party registration",
    });
    expect(contact1Msg.To.map((a) => a.Address)).toContain(STUDENT4.email);

    const contact2Msg = await waitForMessageTo(contactTwoEmail, {
      subjectIncludes: "Party registration",
    });
    expect(contact2Msg.To.map((a) => a.Address)).toContain(contactTwoEmail);

    // Contact two's body contains extra notice about secondary contact
    expect(contact2Msg.HTML).toContain("secondary contact");

    // Contact one body does NOT contain secondary contact notice
    expect(contact1Msg.HTML).not.toContain("You are listed as the");
  });
});

// ---------------------------------------------------------------------------
// (B) Set info via profile, two-step
// ---------------------------------------------------------------------------

test.describe("(B) First-time onboarding — profile two-step", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("student4: set phone + contact pref, then set residence separately — both persist", async ({
    page,
  }) => {
    // Note: if persistence fails on a brand-new SSO account, this is an APP bug.
    // The test is left intact; mark fixme below if needed.

    await loginViaSaml(page, STUDENT4.username, STUDENT4.password, "student");

    await page.goto("/profile");

    // Enter edit mode
    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // Step 1: set phone + contact preference
    await page.getByLabel("Phone Number").fill("9195550303");
    await page
      .locator('button[role="combobox"]')
      .filter({ hasText: /Call|Text|Select/ })
      .click();
    await page.getByRole("option", { name: "Text", exact: true }).click();

    // Save (without touching residence)
    await page.getByRole("button", { name: "Save" }).click();

    // Reload and assert phone persisted
    await page.reload();
    await expect(page.getByText(/\(919\) 555-0303/)).toBeVisible();
    await expect(page.getByText("Text", { exact: true })).toBeVisible();

    // Step 2: enter edit mode again to set residence
    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // Address search is visible because no residence yet
    await page.getByPlaceholder("Search for the location address...").click();
    await page
      .getByPlaceholder("Search for the location address...")
      .fill("408 Pittsboro");
    await page.waitForTimeout(500);
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Save" }).click();

    // Reload and assert residence persisted
    await page.reload();
    await expect(page.getByText(/408 Pittsboro/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// (C) Set info via profile, one-step
// ---------------------------------------------------------------------------

test.describe("(C) First-time onboarding — profile one-step", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("student4: set phone + contact pref + residence in one edit — all persist", async ({
    page,
  }) => {
    // Note: if persistence fails on a brand-new SSO account, this is an APP bug.

    await loginViaSaml(page, STUDENT4.username, STUDENT4.password, "student");

    await page.goto("/profile");

    // Enter edit mode
    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // Set phone
    await page.getByLabel("Phone Number").fill("9195550404");

    // Set contact preference
    await page
      .locator('button[role="combobox"]')
      .filter({ hasText: /Call|Text|Select/ })
      .click();
    await page.getByRole("option", { name: "Call", exact: true }).click();

    // Set residence
    await page.getByPlaceholder("Search for the location address...").click();
    await page
      .getByPlaceholder("Search for the location address...")
      .fill("408 Pittsboro");
    await page.waitForTimeout(500);
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Save" }).click();
    // Wait for edit mode to close to ensure both requests were sent
    await expect(
      page.getByRole("button", { name: "Edit profile" })
    ).toBeVisible();

    // Reload and verify all three fields persisted
    await page.reload();
    await expect(page.getByText(/\(919\) 555-0404/)).toBeVisible();
    await expect(page.getByText("Call", { exact: true })).toBeVisible();
    await expect(page.getByText(/408 Pittsboro/)).toBeVisible();
  });
});
