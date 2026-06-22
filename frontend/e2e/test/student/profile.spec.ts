import { STUDENT_AUTH_FILE } from "../../global-setup";
import { loginViaSaml } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { STUDENT1, STUDENT2 } from "../../helpers/seed-state.helpers";

// ---------------------------------------------------------------------------
// student1 — storageState (has phone + residence locked)
// ---------------------------------------------------------------------------

test.describe("Profile — student1 (storageState)", () => {
  test.use({ storageState: STUDENT_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/profile");
  });

  test("view mode: name, email, phone formatted, contact method, residence rendered", async ({
    page,
  }) => {
    // Name and email are read-only (not inside form inputs)
    await expect(
      page.getByText(STUDENT1.firstName, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(STUDENT1.lastName, { exact: true })
    ).toBeVisible();
    await expect(page.getByText(STUDENT1.email)).toBeVisible();

    // Phone is formatted via formatPhoneNumber util  e.g. (536) 782-9443
    await expect(page.getByText(/\(536\) 782-9443/)).toBeVisible();

    // Contact method
    await expect(page.getByText("Text", { exact: true })).toBeVisible();

    // Residence shown (408 Pittsboro St, Chapel Hill, NC 27516, USA)
    await expect(page.getByText(/408 Pittsboro/)).toBeVisible();
  });

  test("student1 residence is locked: shown read-only with cannot-change note", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // Residence is displayed read-only (no address autocomplete visible)
    await expect(
      page.getByPlaceholder("Search for the location address...")
    ).toHaveCount(0);

    // "cannot change your address until" note is shown
    await expect(
      page.getByText(/You cannot change your address until/)
    ).toBeVisible();

    // The address itself is still displayed
    await expect(page.getByText(/408 Pittsboro/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// student2 — per-test login (no residence, has phone)
// ---------------------------------------------------------------------------

test.describe("Profile — student2 (per-test login)", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("edit phone + contact pref → durable after reload", async ({ page }) => {
    await loginViaSaml(page, STUDENT2.username, STUDENT2.password, "student");
    await page.goto("/profile");

    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // Change phone
    const phoneInput = page.getByLabel("Phone Number");
    await phoneInput.clear();
    await phoneInput.fill("9195550999");

    // Change contact preference to Call
    await page
      .locator('button[role="combobox"]')
      .filter({ hasText: /Call|Text/ })
      .click();
    await page.getByRole("option", { name: "Call", exact: true }).click();

    await page.getByRole("button", { name: "Save" }).click();

    // Reload and assert
    await page.reload();
    await expect(page.getByText(/\(919\) 555-0999/)).toBeVisible();
    await expect(page.getByText("Call", { exact: true })).toBeVisible();
  });

  test("client validation: phone required", async ({ page }) => {
    await loginViaSaml(page, STUDENT2.username, STUDENT2.password, "student");
    await page.goto("/profile");

    await page.getByRole("button", { name: "Edit profile" }).click();

    const phoneInput = page.getByLabel("Phone Number");
    await phoneInput.clear();
    await phoneInput.blur();

    await expect(page.getByText("Phone number is required")).toBeVisible();
  });

  test("client validation: phone <10 digits", async ({ page }) => {
    await loginViaSaml(page, STUDENT2.username, STUDENT2.password, "student");
    await page.goto("/profile");

    await page.getByRole("button", { name: "Edit profile" }).click();

    const phoneInput = page.getByLabel("Phone Number");
    await phoneInput.clear();
    await phoneInput.fill("919555");
    await phoneInput.blur();

    await expect(
      page.getByText("Phone number must be at least 10 digits")
    ).toBeVisible();
  });

  test("phone conflict 409: shows 'That phone number is already in use.'", async ({
    page,
  }) => {
    await loginViaSaml(page, STUDENT2.username, STUDENT2.password, "student");
    await page.goto("/profile");

    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // student1 (stevenmorrison) phone: 5367829443
    const phoneInput = page.getByLabel("Phone Number");
    await phoneInput.clear();
    await phoneInput.fill("5367829443");

    await page.getByRole("button", { name: "Save" }).click();

    // Inline error div in the form
    await expect(
      page.getByText("That phone number is already in use.")
    ).toBeVisible();
  });

  test("student2 (no residence) can set residence via profile → durable", async ({
    page,
  }) => {
    await loginViaSaml(page, STUDENT2.username, STUDENT2.password, "student");
    await page.goto("/profile");

    await page.getByRole("button", { name: "Edit profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Profile" })
    ).toBeVisible();

    // Address search should be visible (student2 has no residence)
    const addressInput = page.getByPlaceholder(
      "Search for the location address..."
    );
    await expect(addressInput).toBeVisible();

    await addressInput.click();
    await addressInput.fill("408 Pittsboro");
    await page.waitForTimeout(500);
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Save" }).click();

    // Reload and verify residence persisted
    await page.reload();
    await expect(page.getByText(/408 Pittsboro/)).toBeVisible();
  });
});
