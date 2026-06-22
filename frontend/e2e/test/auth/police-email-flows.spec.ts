import { signupPolice, signupPoliceViaApi } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  clearInbox,
  extractLink,
  waitForMessageTo,
} from "../../helpers/mailpit.helpers";
import { POLICE_OFFICER } from "../../helpers/seed-state.helpers";

// ==============================================================================
// Police Email Flows (Mailpit)
// ==============================================================================

test.describe("Police Email Flows", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async () => {
    await clearInbox();
  });

  // --- Signup → verify → login chain -------------------------------------------

  test("signup → verify email → login chain", async ({ page }) => {
    const email = `e2e-verify-chain-${Date.now()}@chapelhillnc.gov`;
    const password = "securepassword";

    // Step 1: Sign up (UI helper waits for the success screen)
    await signupPolice(page, email, password);

    // Step 2: Wait for the verification email and extract the link
    const message = await waitForMessageTo(email);
    const verifyLink = extractLink(message, "/police/verify");

    // Step 3: Follow the verification link
    await page.goto(verifyLink);
    await expect(
      page.getByText(
        "Your email has been verified. You can now sign in to the police portal."
      )
    ).toBeVisible();

    // Step 4: Log in with the verified credentials
    await page.getByRole("link", { name: "Go to Police Login" }).click();
    await page.locator('[name="email"]').fill(email);
    await page.locator('[name="password"]').fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/police**");
    expect(page.url()).toContain("/police");
  });

  // --- Forgot → reset → login chain --------------------------------------------

  test("forgot password → reset → login chain", async ({ page }) => {
    const newPassword = `reset-pw-${Date.now()}`;

    // Step 1: Request password reset for the verified seeded officer
    await page.goto("/police/forgot-password");
    await page.locator('[name="email"]').fill(POLICE_OFFICER.email);
    await page.getByRole("button", { name: "Send Reset Link" }).click();

    // Success screen — "Check Your Email" card title
    await expect(
      page.getByRole("heading", { name: "Check Your Email" })
    ).toBeVisible();

    // Step 2: Wait for the reset email and extract the link
    const message = await waitForMessageTo(POLICE_OFFICER.email);
    const resetLink = extractLink(message, "/police/reset-password");

    // Step 3: Follow the reset link and set a new password
    await page.goto(resetLink);
    await expect(
      page.getByRole("heading", { name: "Reset Password" })
    ).toBeVisible();

    await page.locator('[name="password"]').fill(newPassword);
    await page.locator('[name="confirm_password"]').fill(newPassword);
    await page.getByRole("button", { name: "Reset Password" }).click();

    // Step 4: Success state — "Password Reset" card title
    await expect(
      page.getByRole("heading", { name: "Password Reset" })
    ).toBeVisible();
    await expect(
      page.getByText("Your password has been reset successfully.")
    ).toBeVisible();

    // Step 5: Sign in with the new password
    await page.getByRole("link", { name: "Sign In" }).click();
    await page.locator('[name="email"]').fill(POLICE_OFFICER.email);
    await page.locator('[name="password"]').fill(newPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/police**");
    expect(page.url()).toContain("/police");
  });

  // --- Resend verification ------------------------------------------------------

  test("resend verification: clicking Resend Email delivers a new message", async ({
    page,
    request,
  }) => {
    const email = `e2e-resend-${Date.now()}@chapelhillnc.gov`;
    await signupPoliceViaApi(request, email, "securepassword");

    // Arrive at the login page as an unverified user to surface the Resend button
    await page.goto("/police/login");
    await page.locator('[name="email"]').fill(email);
    await page.locator('[name="password"]').fill("securepassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for the unverified error and Resend button to appear
    await expect(
      page.getByText(
        "Your account hasn't been verified yet. Please check your email for a verification link."
      )
    ).toBeVisible();
    const resendButton = page.getByRole("button", { name: /Resend Email/i });
    await expect(resendButton).toBeVisible();

    // Click Resend and confirm a message arrives
    await resendButton.click();
    const message = await waitForMessageTo(email);
    expect(
      message.To.some((a) => a.Address.toLowerCase() === email.toLowerCase())
    ).toBe(true);

    // The success toast/message is shown after resend
    await expect(page.getByText("Verification email resent.")).toBeVisible();
  });

  // --- UI-only invalid token / no-token states (no Mailpit) --------------------

  test("verify page with no token shows invalid-link message", async ({
    page,
  }) => {
    await page.goto("/police/verify");
    await expect(
      page.getByText(
        "This verification link is invalid or has expired. Please try logging in to request a new link, or contact OCSL for help."
      )
    ).toBeVisible();
  });

  test("verify page with bogus token shows invalid/expired message", async ({
    page,
  }) => {
    await page.goto("/police/verify?token=bogus-token-abc");
    await expect(
      page.getByText(
        "This verification link is invalid or has expired. Please try logging in to request a new link, or contact OCSL for help."
      )
    ).toBeVisible();
  });

  test("reset-password page with no token shows Invalid Link screen", async ({
    page,
  }) => {
    await page.goto("/police/reset-password");
    await expect(
      page.getByRole("heading", { name: "Invalid Link" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "This password reset link is invalid. Please request a new one."
      )
    ).toBeVisible();
  });

  test("reset-password page with bogus token shows invalid/expired error after submit", async ({
    page,
  }) => {
    await page.goto("/police/reset-password?token=bogus-token-xyz");
    await expect(
      page.getByRole("heading", { name: "Reset Password" })
    ).toBeVisible();

    await page.locator('[name="password"]').fill("newpassword123");
    await page.locator('[name="confirm_password"]').fill("newpassword123");
    await page.getByRole("button", { name: "Reset Password" }).click();

    await expect(
      page.getByText(
        "This reset link is invalid or has expired. Please request a new one."
      )
    ).toBeVisible();
  });
});
