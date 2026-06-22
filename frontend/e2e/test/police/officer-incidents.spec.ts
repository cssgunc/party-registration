/**
 * officer-incidents.spec.ts
 *
 * Tests for adding incidents via party cards on the officer dashboard.
 * Uses OFFICER_AUTH_FILE (jcarter).
 *
 * Coverage:
 *  - Open incident menu on a seeded party card
 *  - Add citation → IncidentDialog defaults correct (date, time present)
 *  - Fill optional ref-id and description → Save → citation count increments
 *  - Durable: reload page, re-find card, assert count still incremented
 *  - Add in-person warning — same happy path
 *  - Client validation: clear time field → "Time is required" error shown
 */
import { OFFICER_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import {
  type Page,
  expect,
  suiteTest as test,
} from "../../helpers/fixtures.helpers";
import { LOCATIONS, PARTIES } from "../../helpers/seed.helpers";
import { Steps } from "../../helpers/steps.helpers";

// ---------------------------------------------------------------------------
// Seed-derived constants
// ---------------------------------------------------------------------------

// Party 2: 408 Pittsboro St, today (NOW+0d@22:00)
// Location 1 incidents: remote_warning x2, citation x1 → citation count = 1
const TARGET_PARTY = PARTIES.find((p) => p.id === 2)!;
const TARGET_LOCATION = LOCATIONS.find((l) => l.id === 1)!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForCards(page: Page) {
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll("article[data-party-id]");
    const empty = document.querySelector("p.content.text-muted-foreground");
    return cards.length > 0 || !!empty;
  });
}

async function openIncidentMenu(page: Page, partyId: number) {
  const card = page.locator(`article[data-party-id="${partyId}"]`);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Open incident menu" }).click();
}

async function getIncidentCount(
  page: Page,
  partyId: number,
  severity: "remote_warning" | "in_person_warning" | "citation"
): Promise<number> {
  const card = page.locator(`article[data-party-id="${partyId}"]`);
  await expect(card).toBeVisible();

  // Each count is rendered as: `<number> <IncidentFlag>` inside the card footer
  // The severity flags appear in order: remote_warning, in_person_warning, citation
  const severityIndex = {
    remote_warning: 0,
    in_person_warning: 1,
    citation: 2,
  }[severity];

  const countText = await card
    .locator(".flex.items-center.gap-1.content-bold")
    .nth(severityIndex)
    .textContent();

  return Number.parseInt((countText ?? "0").trim(), 10);
}

// ===========================================================================

test.describe("Officer — Incident Creation", () => {
  test.use({ storageState: OFFICER_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/police");
    await waitForCards(page);
  });

  // -------------------------------------------------------------------------
  // Add citation
  // -------------------------------------------------------------------------

  test.describe("add citation to party card", () => {
    const ctx = {
      citationCountBefore: null as number | null,
      citationCountAfter: null as number | null,
    };
    const steps = new Steps(ctx);

    const ensureIncidentAdded = steps.step(async (page) => {
      ctx.citationCountBefore = await getIncidentCount(
        page,
        TARGET_PARTY.id,
        "citation"
      );

      await openIncidentMenu(page, TARGET_PARTY.id);
      await page.getByRole("menuitem", { name: /add citation/i }).click();

      // IncidentDialog should open
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /Add Citation/i })
      ).toBeVisible();

      // Selected Address is read-only and shows the party's location
      const addressInput = page.locator("#incident-address");
      await expect(addressInput).toBeDisabled();
      await expect(addressInput).toHaveValue(TARGET_LOCATION.formatted_address);

      // Date field (DateField input labelled "Date") defaults to the party's
      // date — verify it's present and pre-populated.
      const dateField = page.getByRole("dialog").getByLabel("Date");
      await expect(dateField).toBeVisible();
      await expect(dateField).not.toHaveValue("");

      // Time field has a value (default = current time, not empty)
      const timeInput = page.getByLabel("Incident Time");
      const timeValue = await timeInput.inputValue();
      expect(timeValue).toMatch(/^\d{2}:\d{2}$/);

      // Fill optional reference ID
      await page.getByLabel("Reference ID").fill("E2E-TEST-001");

      // Fill optional description
      await page.getByLabel("Description").fill("Playwright test citation");

      // Save
      await page.getByRole("button", { name: "Save Changes" }).click();

      // Dialog closes
      await expect(page.getByRole("dialog")).toHaveCount(0);

      ctx.citationCountAfter = await getIncidentCount(
        page,
        TARGET_PARTY.id,
        "citation"
      );

      return ["citationCountBefore", "citationCountAfter"] as const;
    });

    test("optimistic: citation count increments immediately after save", async ({
      page,
    }) => {
      const { citationCountBefore, citationCountAfter } =
        await ensureIncidentAdded(page);
      expect(citationCountAfter).toBe(citationCountBefore + 1);
    });

    test("durable: citation count persists after page reload", async ({
      page,
    }) => {
      const { citationCountBefore } = await ensureIncidentAdded(page);

      // Reload and re-check
      await page.reload();
      await waitForCards(page);

      const countAfterReload = await getIncidentCount(
        page,
        TARGET_PARTY.id,
        "citation"
      );
      expect(countAfterReload).toBe(citationCountBefore + 1);
    });
  });

  // -------------------------------------------------------------------------
  // Add in-person warning
  // -------------------------------------------------------------------------

  test("add in-person warning: count increments after save", async ({
    page,
  }) => {
    const countBefore = await getIncidentCount(
      page,
      TARGET_PARTY.id,
      "in_person_warning"
    );

    await openIncidentMenu(page, TARGET_PARTY.id);
    await page
      .getByRole("menuitem", { name: /add in-person warning/i })
      .click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Add In-Person Warning/i })
    ).toBeVisible();

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const countAfter = await getIncidentCount(
      page,
      TARGET_PARTY.id,
      "in_person_warning"
    );
    expect(countAfter).toBe(countBefore + 1);
  });

  // -------------------------------------------------------------------------
  // Client-side validation
  // -------------------------------------------------------------------------

  test("client validation: clearing time shows 'Time is required' error", async ({
    page,
  }) => {
    await openIncidentMenu(page, TARGET_PARTY.id);
    await page.getByRole("menuitem", { name: /add citation/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Clear the time field
    const timeInput = page.getByLabel("Incident Time");
    await timeInput.fill("");
    await timeInput.blur();

    // Attempt to submit
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Validation error should appear
    await expect(page.getByText("Time is required")).toBeVisible();

    // Dialog stays open
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
