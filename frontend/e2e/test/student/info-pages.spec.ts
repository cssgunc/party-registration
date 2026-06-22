import { STUDENT_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import { expect, suiteTest as test } from "../../helpers/fixtures.helpers";

// ---------------------------------------------------------------------------
// About pages — accordion/DialogItem buttons open dialogs, Escape closes them
// ---------------------------------------------------------------------------

test.describe("Info pages — dialog items", () => {
  test.use({ storageState: STUDENT_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  // Titles as they appear in PartyRegistrationInfo
  const PARTY_REG_DIALOG_TITLES = [
    "How does party registration work?",
    "Why register your party?",
    "Your residence & holds",
    "Want to know the fine print?",
  ];

  // Titles as they appear in PartySmartInfo
  const PARTY_SMART_DIALOG_TITLES = [
    "How to reduce risk before the Party",
    "How to reduce risk during the Party",
    "How to reduce risk after the Party",
  ];

  test.describe("/about-party-registration", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/about-party-registration");
      await expect(
        page.getByRole("heading", { name: "About Party Registration" })
      ).toBeVisible();
    });

    for (const title of PARTY_REG_DIALOG_TITLES) {
      test(`dialog opens and closes via Escape: "${title}"`, async ({
        page,
      }) => {
        // Click the DialogItem button
        await page.getByRole("button", { name: title }).click();

        // Dialog is visible with the matching heading
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("heading", { name: title })
        ).toBeVisible();

        // Close via Escape
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
      });
    }
  });

  test.describe("/about-party-smart", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/about-party-smart");
      await expect(
        page.getByRole("heading", { name: "About Party Smart" })
      ).toBeVisible();
    });

    for (const title of PARTY_SMART_DIALOG_TITLES) {
      test(`dialog opens and closes via Escape: "${title}"`, async ({
        page,
      }) => {
        await page.getByRole("button", { name: title }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("heading", { name: title })
        ).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
      });
    }
  });
});
