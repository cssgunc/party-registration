import { OFFICER_AUTH_FILE, POLICE_AUTH_FILE } from "../../global-setup";
import { signupPoliceViaApi } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { POLICE_OFFICER } from "../../helpers/seed-state.helpers";

// ==============================================================================
// Police Login
// ==============================================================================

test.describe("Police Login", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  // --- Happy path ---------------------------------------------------------------

  test("happy path: valid officer credentials redirect to /police", async ({
    page,
  }) => {
    await page.goto("/police/login");
    await page.locator('[name="email"]').fill(POLICE_OFFICER.email);
    await page.locator('[name="password"]').fill(POLICE_OFFICER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/police**");
    expect(page.url()).toContain("/police");
  });

  // --- Client-side validation ---------------------------------------------------

  test("validation: invalid email format shows inline error", async ({
    page,
  }) => {
    await page.goto("/police/login");
    await page.locator('[name="email"]').fill("not-an-email");
    await page.locator('[name="email"]').blur();
    await expect(page.getByText("Please enter a valid email")).toBeVisible();
  });

  test("validation: empty password shows inline error", async ({ page }) => {
    await page.goto("/police/login");
    await page.locator('[name="email"]').fill(POLICE_OFFICER.email);
    await page.locator('[name="password"]').fill("");
    // Trigger blur-based validation by focusing another element
    await page.locator('[name="email"]').focus();
    await page.locator('[name="password"]').blur();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  // --- Server errors ------------------------------------------------------------

  test("401 wrong credentials: shows 'Invalid email or password.'", async ({
    page,
  }) => {
    await page.goto("/police/login");
    await page.locator('[name="email"]').fill(POLICE_OFFICER.email);
    await page.locator('[name="password"]').fill("wrong-password-xyz");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("403 EMAIL_NOT_VERIFIED: shows unverified message and Resend Email button", async ({
    page,
    request,
  }) => {
    const unverifiedEmail = `e2e-unverified-${Date.now()}@chapelhillnc.gov`;
    await signupPoliceViaApi(request, unverifiedEmail, "securepassword");

    await page.goto("/police/login");
    await page.locator('[name="email"]').fill(unverifiedEmail);
    await page.locator('[name="password"]').fill("securepassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(
      page.getByText(
        "Your account hasn't been verified yet. Please check your email for a verification link."
      )
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Resend Email/i })
    ).toBeVisible();
  });

  // --- Already-authenticated redirect ------------------------------------------

  test.describe("already-authenticated redirect", () => {
    test.use({ storageState: OFFICER_AUTH_FILE });

    test("officer visiting /police/login is redirected to /police", async ({
      page,
    }) => {
      await page.goto("/police/login");
      await expect(page).toHaveURL(/\/police(?!\/login)/);
    });
  });

  test.describe("already-authenticated redirect (police admin)", () => {
    test.use({ storageState: POLICE_AUTH_FILE });

    test("police admin visiting /police/login is redirected to /police", async ({
      page,
    }) => {
      await page.goto("/police/login");
      await expect(page).toHaveURL(/\/police(?!\/login)/);
    });
  });
});
