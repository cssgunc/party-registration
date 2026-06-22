import { ADMIN_AUTH_FILE } from "../../global-setup";
import { signupPoliceViaApi } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import {
  AGGREGATE_ACCOUNTS,
  POLICE_ACCOUNTS,
} from "../../helpers/seed.helpers";
import { Steps } from "../../helpers/steps.helpers";
import {
  clickRowAction,
  getPaginationTotal,
  openRowActions,
  openStaffTab,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// ---------------------------------------------------------------------------
// Seed-data helpers
// ---------------------------------------------------------------------------

const ADMIN_ACCOUNT = AGGREGATE_ACCOUNTS.find((a) => a.role === "admin")!;
const STAFF_ACCOUNT = AGGREGATE_ACCOUNTS.find((a) => a.role === "staff")!;
const POLICE_ADMIN_ACCOUNT = POLICE_ACCOUNTS.find(
  (a) => a.role === "police_admin"
)!;

// ===========================================================================

test.describe("Accounts Management — admin gaps", () => {
  test.use({ storageState: ADMIN_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/staff/accounts");
    await openStaffTab(page, "Accounts");
    await waitForTableReady(page);
  });

  // -------------------------------------------------------------------------
  // Invite form validation
  // -------------------------------------------------------------------------

  test.describe("invite form validation", () => {
    test("blank email shows inline error", async ({ page }) => {
      await page.getByRole("button", { name: /New Invite/i }).click();
      // Blur the email field without entering a value to trigger onBlur validation
      await page.getByLabel("Email").focus();
      await page.getByLabel("Email").blur();
      await page.getByRole("button", { name: "Send Invite" }).click();
      await expect(
        page.getByText(/invalid email address/i).first()
      ).toBeVisible();
    });

    test("invalid email format shows inline error", async ({ page }) => {
      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill("not-an-email");
      await page.getByLabel("Email").blur();
      await page.getByRole("button", { name: "Send Invite" }).click();
      // Zod html5Email pattern rejects non-email strings
      await expect(
        page
          .locator('[data-slot="sheet-content"]')
          .last()
          .locator(
            '[role="alert"], p.text-destructive, [id$="-form-item-message"]'
          )
          .first()
      ).toBeVisible();
    });

    test("role not selected shows inline error", async ({ page }) => {
      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill("valid@unc.edu");
      await page.getByLabel("Email").blur();
      // Don't pick a role, submit directly
      await page.getByRole("button", { name: "Send Invite" }).click();
      // The role combobox should show an error — the field is required by the enum schema
      await expect(
        page
          .locator('[data-slot="sheet-content"]')
          .last()
          .locator(
            '[role="alert"], p.text-destructive, [id$="-form-item-message"]'
          )
          .first()
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Invite duplicate-email (409)
  // -------------------------------------------------------------------------

  test("invite duplicate email shows 409 error", async ({ page }) => {
    // STAFF_ACCOUNT is already provisioned — inviting the same email should 409
    await page.getByRole("button", { name: /New Invite/i }).click();
    await page.getByLabel("Email").fill(STAFF_ACCOUNT.email);
    await selectSidebarCombobox(page, 0, "Staff");
    await page.getByRole("button", { name: "Send Invite" }).click();
    await expect(
      page.getByText("An account with this email already exists")
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Revoke invite — full flow
  // -------------------------------------------------------------------------

  test.describe("revoke invite", () => {
    const ctx = { inviteEmail: null as string | null };
    const steps = new Steps(ctx);

    const ensureInviteCreated = steps.step(async (page) => {
      const email = `playwright-revoke-${Date.now()}@unc.edu`;
      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill(email);
      await selectSidebarCombobox(page, 0, "Staff");
      await page.getByRole("button", { name: "Send Invite" }).click();
      await waitForTableReady(page);
      ctx.inviteEmail = email;
      return ["inviteEmail"] as const;
    });

    test("revoke invite: confirm dialog title includes email, row removed", async ({
      page,
    }) => {
      const { inviteEmail } = await ensureInviteCreated(page);
      await setGlobalSearch(page, inviteEmail);
      await openRowActions(page, inviteEmail);
      await page.getByRole("menuitem", { name: "Revoke invite" }).click();

      // ConfirmDialog should show title "Revoke Invite" and mention the email
      await expect(
        page.getByRole("heading", { name: "Revoke Invite" })
      ).toBeVisible();
      // Scope to the dialog — the email also appears in the table row behind it
      await expect(
        page.locator('[data-slot="dialog-content"]').getByText(inviteEmail)
      ).toBeVisible();

      // Confirm — ConfirmDialog confirm button is labelled "Revoke"
      await page.getByRole("button", { name: "Revoke" }).click();
      await waitForTableReady(page);

      // Row must be gone
      await setGlobalSearch(page, inviteEmail);
      expect(await getPaginationTotal(page)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Delete SAML account (non-self)
  // -------------------------------------------------------------------------

  test("delete SAML staff account: confirm dialog and row removed", async ({
    page,
  }) => {
    await setGlobalSearch(page, STAFF_ACCOUNT.email);
    await openRowActions(page, STAFF_ACCOUNT.email);
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // ConfirmDialog title is "Delete Account"
    await expect(
      page.getByRole("heading", { name: "Delete Account" })
    ).toBeVisible();
    // Scope to the dialog — the email also appears in the table row behind it
    await expect(
      page
        .locator('[data-slot="dialog-content"]')
        .getByText(STAFF_ACCOUNT.email)
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, STAFF_ACCOUNT.email);
    expect(await getPaginationTotal(page)).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Delete police account
  // -------------------------------------------------------------------------

  test("delete police account: confirm dialog and row removed", async ({
    page,
    request,
  }) => {
    // Create a throwaway police account to delete, rather than a seeded one.
    // Deleting jcarter/dreyes would break the next run's globalSetup, which
    // logs in as those accounts before any per-suite DB reset.
    const email = `pw-del-police-${Date.now()}@chapelhillnc.gov`;
    await signupPoliceViaApi(request, email, "securepassword123");
    await page.reload();
    await waitForTableReady(page);

    await setGlobalSearch(page, email);
    await openRowActions(page, email);
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // ConfirmDialog description should mention "police account <email>"
    await expect(
      page.getByRole("heading", { name: "Delete Account" })
    ).toBeVisible();
    // Scope the email assertion to the dialog — the email also appears in the
    // table row behind it, which would trip strict-mode (2 matches).
    const deleteDialog = page.locator('[data-slot="dialog-content"]');
    await expect(
      deleteDialog.getByText(/delete police account/i)
    ).toBeVisible();
    await expect(deleteDialog.getByText(email)).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await waitForTableReady(page);

    await setGlobalSearch(page, email);
    expect(await getPaginationTotal(page)).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Edit police account — full field update
  // -------------------------------------------------------------------------

  test("edit police account: change email, role, and status — persisted", async ({
    page,
  }) => {
    const newEmail = `playwright-police-edit-${Date.now()}@chapelhillnc.gov`;

    await setGlobalSearch(page, POLICE_ADMIN_ACCOUNT.email);
    await clickRowAction(page, POLICE_ADMIN_ACCOUNT.email, "Edit");

    // Sidebar heading should be "Edit Police Account"
    await expect(
      page.getByRole("heading", { name: "Edit Police Account" })
    ).toBeVisible();

    // PoliceAccountTableForm has Email, Role (combobox 0), Status (combobox 1)
    await page.getByLabel("Email").fill(newEmail);
    await selectSidebarCombobox(page, 0, "Officer");
    await selectSidebarCombobox(page, 1, "Unverified");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await waitForTableReady(page);

    // Durable: search for new email and verify role shows as Officer
    await setGlobalSearch(page, newEmail);
    await expect(page.getByRole("cell", { name: newEmail })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: /officer/i }).first()
    ).toBeVisible();

    // Re-open to verify status — sidebar should show Unverified
    await clickRowAction(page, newEmail, "Edit");
    const sidebar = page.locator('[data-slot="sheet-content"]').last();
    await expect(sidebar.getByRole("combobox").nth(1)).toHaveText(
      /unverified/i
    );
    await page.keyboard.press("Escape");
  });

  // -------------------------------------------------------------------------
  // Edit SAML account — only Role is editable (email is disabled)
  // -------------------------------------------------------------------------

  test("edit SAML account: email field is disabled, only role is editable", async ({
    page,
  }) => {
    await setGlobalSearch(page, ADMIN_ACCOUNT.email);
    await clickRowAction(page, ADMIN_ACCOUNT.email, "Edit");

    // AccountTableForm in edit mode disables the Email field
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeDisabled();

    // The email value must still show
    await expect(emailInput).toHaveValue(ADMIN_ACCOUNT.email);

    await page.keyboard.press("Escape");
  });
});
