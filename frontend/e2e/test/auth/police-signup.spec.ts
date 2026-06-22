import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { POLICE_OFFICER } from "../../helpers/seed-state.helpers";

// ==============================================================================
// Police Signup
// ==============================================================================

test.describe("Police Signup", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  // --- Happy path ---------------------------------------------------------------

  test("happy path: valid chapelhillnc.gov email and matching password shows success screen", async ({
    page,
  }) => {
    const email = `e2e-signup-${Date.now()}@chapelhillnc.gov`;

    await page.goto("/police/signup");
    await page.locator('[name="email"]').fill(email);
    await page.locator('[name="password"]').fill("securepassword");
    await page.locator('[name="confirm_password"]').fill("securepassword");
    await page.getByRole("button", { name: "Create Account" }).click();

    // Success screen description
    await expect(
      page.getByText(
        "Check your email to verify your account before logging in."
      )
    ).toBeVisible();

    // Resend button visible in cooldown state after signup
    await expect(
      page.getByRole("button", { name: /Resend Email/i })
    ).toBeVisible();
  });

  // --- Client-side validation ---------------------------------------------------

  test("validation: non-chapelhillnc.gov email shows domain error", async ({
    page,
  }) => {
    await page.goto("/police/signup");
    await page.locator('[name="email"]').fill("officer@otherdomain.com");
    await page.locator('[name="email"]').blur();
    await expect(
      page.getByText("Email must use the @chapelhillnc.gov domain")
    ).toBeVisible();
  });

  test("validation: password shorter than 8 characters shows length error", async ({
    page,
  }) => {
    await page.goto("/police/signup");
    await page
      .locator('[name="email"]')
      .fill(`e2e-short-pw-${Date.now()}@chapelhillnc.gov`);
    await page.locator('[name="password"]').fill("short");
    await page.locator('[name="password"]').blur();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
  });

  test("validation: mismatched passwords shows mismatch error", async ({
    page,
  }) => {
    await page.goto("/police/signup");
    await page
      .locator('[name="email"]')
      .fill(`e2e-mismatch-${Date.now()}@chapelhillnc.gov`);
    await page.locator('[name="password"]').fill("securepassword");
    await page.locator('[name="confirm_password"]').fill("differentpassword");
    await page.locator('[name="confirm_password"]').blur();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  // --- Server errors ------------------------------------------------------------

  test("409 duplicate email: shows 'An account with that email already exists.'", async ({
    page,
  }) => {
    // jcarter is a seeded, already-existing verified officer account
    await page.goto("/police/signup");
    await page.locator('[name="email"]').fill(POLICE_OFFICER.email);
    await page.locator('[name="password"]').fill("securepassword");
    await page.locator('[name="confirm_password"]').fill("securepassword");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(
      page.getByText("An account with that email already exists.")
    ).toBeVisible();
  });
});
