/**
 * invite-and-dual-role.spec.ts
 *
 * Tests for:
 *  1. Admin invites a NEW account (ADMIN2 / priyapatel@unc.edu — valid SAML
 *     identity, NOT provisioned in the backend) and the invitee accepts via SAML.
 *  2. Admin invites an EXISTING student (STUDENT2 / monicamalone@unc.edu) as
 *     staff, so that student gets promoted/dual-role access.
 *
 * Invite acceptance does NOT require an email link — the app keys acceptance on
 * email + role at SSO exchange time.  After admin creates the invite,
 * loginViaSaml(..., role) with the invited email is sufficient.
 */
import { ADMIN_AUTH_FILE } from "../../global-setup";
import { loginViaSaml } from "../../helpers/auth.helpers";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";
import { clearInbox, waitForMessageTo } from "../../helpers/mailpit.helpers";
import { ADMIN2, STAFF1, STUDENT2 } from "../../helpers/seed-state.helpers";
import { Steps } from "../../helpers/steps.helpers";
import {
  openStaffTab,
  selectSidebarCombobox,
  setGlobalSearch,
  waitForTableReady,
} from "../../helpers/table.helpers";

// ==============================================================================

test.describe("Invite & dual-role flows", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  // ---------------------------------------------------------------------------
  // Invite a brand-new account (staff role)

  test.describe("invite new account as staff", () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    const ctx = { inviteEmail: null as string | null };
    const steps = new Steps(ctx);

    const ensureInviteCreated = steps.step(async (page) => {
      await clearInbox();
      await page.goto("/staff/accounts");
      await openStaffTab(page, "Accounts");
      await waitForTableReady(page);

      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill(ADMIN2.email);
      await selectSidebarCombobox(page, 0, "Staff");
      await page.getByRole("button", { name: "Send Invite" }).click();
      await waitForTableReady(page);

      ctx.inviteEmail = ADMIN2.email;
      return ["inviteEmail"] as const;
    });

    test("invited row appears in Accounts table with status Invited", async ({
      page,
    }) => {
      const { inviteEmail } = await ensureInviteCreated(page);
      await setGlobalSearch(page, inviteEmail);
      await expect(page.getByText("Invited")).toBeVisible();
    });

    test("invite email is delivered to invitee", async ({ page }) => {
      await ensureInviteCreated(page);
      const msg = await waitForMessageTo(ADMIN2.email);
      expect(msg.To.some((a) => a.Address.toLowerCase() === ADMIN2.email)).toBe(
        true
      );
    });

    test("invitee can accept via SAML and land on /staff", async ({ page }) => {
      await ensureInviteCreated(page);
      await loginViaSaml(
        page,
        ADMIN2.username,
        ADMIN2.password,
        "staff",
        "/staff/parties"
      );
      await expect(page).toHaveURL(/\/staff/);
    });

    test("invitee has access to staff tabs after acceptance", async ({
      page,
    }) => {
      await ensureInviteCreated(page);
      await loginViaSaml(
        page,
        ADMIN2.username,
        ADMIN2.password,
        "staff",
        "/staff/parties"
      );
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);
      await openStaffTab(page, "Students");
      await waitForTableReady(page);
    });

    test("invitee (staff role) cannot see Accounts tab after acceptance", async ({
      page,
    }) => {
      await ensureInviteCreated(page);
      await loginViaSaml(
        page,
        ADMIN2.username,
        ADMIN2.password,
        "staff",
        "/staff/parties"
      );
      await expect(page.getByRole("tab", { name: "Accounts" })).toHaveCount(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Invite a brand-new account (admin role)

  test.describe("invite new account as admin", () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    const ctx = { inviteEmail: null as string | null };
    const steps = new Steps(ctx);

    const ensureAdminInviteCreated = steps.step(async (page) => {
      await clearInbox();
      // Use a unique e-mail for this variant so it doesn't clash with the
      // staff-invite suite's row.
      const adminInviteEmail = `playwright-admin-invite-${Date.now()}@unc.edu`;
      await page.goto("/staff/accounts");
      await openStaffTab(page, "Accounts");
      await waitForTableReady(page);

      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill(adminInviteEmail);
      await selectSidebarCombobox(page, 0, "Admin");
      await page.getByRole("button", { name: "Send Invite" }).click();
      await waitForTableReady(page);

      ctx.inviteEmail = adminInviteEmail;
      return ["inviteEmail"] as const;
    });

    test("invited admin row appears in Accounts table with status Invited", async ({
      page,
    }) => {
      const { inviteEmail } = await ensureAdminInviteCreated(page);
      await setGlobalSearch(page, inviteEmail);
      await expect(page.getByText("Invited")).toBeVisible();
      await expect(
        page.getByRole("cell", { name: "Admin", exact: true })
      ).toBeVisible();
    });

    test("admin invite email is delivered to invitee", async ({ page }) => {
      const { inviteEmail } = await ensureAdminInviteCreated(page);
      const msg = await waitForMessageTo(inviteEmail);
      expect(
        msg.To.some(
          (a) => a.Address.toLowerCase() === inviteEmail.toLowerCase()
        )
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Staff member becomes a student by logging in via student SSO

  test.describe("staff member logging in via student SSO gets student access", () => {
    test("can visit /profile after logging in via student SSO", async ({
      page,
    }) => {
      await loginViaSaml(
        page,
        STAFF1.username,
        STAFF1.password,
        "student",
        "/staff/parties"
      );
      await page.goto("/profile");
      expect(new URL(page.url()).pathname).toBe("/profile");
      await expect(page.getByText(STAFF1.email)).toBeVisible();
    });

    test("appears in Students tab after logging in via student SSO", async ({
      page,
    }) => {
      await loginViaSaml(
        page,
        STAFF1.username,
        STAFF1.password,
        "student",
        "/staff/parties"
      );
      await openStaffTab(page, "Students");
      await waitForTableReady(page);
      await setGlobalSearch(page, STAFF1.email);
      await expect(
        page.getByRole("cell", { name: STAFF1.email })
      ).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Promote an existing student to staff (dual-role)
  test.describe("invite existing student as staff (dual-role)", () => {
    test.use({ storageState: ADMIN_AUTH_FILE });

    const ctx = { inviteEmail: null as string | null };
    const steps = new Steps(ctx);

    const ensureStudentInvited = steps.step(async (page) => {
      await clearInbox();
      await page.goto("/staff/accounts");
      await openStaffTab(page, "Accounts");
      await waitForTableReady(page);

      await page.getByRole("button", { name: /New Invite/i }).click();
      await page.getByLabel("Email").fill(STUDENT2.email);
      await selectSidebarCombobox(page, 0, "Staff");
      await page.getByRole("button", { name: "Send Invite" }).click();
      await waitForTableReady(page);

      ctx.inviteEmail = STUDENT2.email;
      return ["inviteEmail"] as const;
    });

    test("invite row for student email appears with status Invited", async ({
      page,
    }) => {
      const { inviteEmail } = await ensureStudentInvited(page);
      await setGlobalSearch(page, inviteEmail);
      await expect(page.getByText("Invited")).toBeVisible();
    });

    test("promoted student can access /staff after SAML login", async ({
      page,
    }) => {
      await ensureStudentInvited(page);
      await loginViaSaml(
        page,
        STUDENT2.username,
        STUDENT2.password,
        "staff",
        "/staff/parties"
      );
      await expect(page).toHaveURL(/\/staff/);
      await openStaffTab(page, "Parties");
      await waitForTableReady(page);
    });

    test("promoted student (now staff) is not redirected away from student area", async ({
      page,
    }) => {
      // Dual-role: staff is in STUDENT_AREA_ROLES, so a student promoted to
      // staff should still reach "/" and "/profile" without being bounced.
      await ensureStudentInvited(page);
      await loginViaSaml(
        page,
        STUDENT2.username,
        STUDENT2.password,
        "staff",
        "/staff/parties"
      );
      await page.goto("/");
      expect(new URL(page.url()).pathname).toBe("/");

      await page.goto("/profile");
      expect(new URL(page.url()).pathname).toBe("/profile");
    });

    test("promoted student retains their Student record (profile data intact)", async ({
      page,
    }) => {
      // The Student record must survive the account being upserted to staff —
      // /profile fetches /students/me. If it's dropped, the profile errors.
      await ensureStudentInvited(page);
      await loginViaSaml(
        page,
        STUDENT2.username,
        STUDENT2.password,
        "staff",
        "/staff/parties"
      );
      await page.goto("/profile");
      await expect(page.getByText(STUDENT2.email)).toBeVisible();
    });
  });
});
