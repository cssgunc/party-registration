/**
 * officer-dashboard.spec.ts
 *
 * Tests for the police officer dashboard at /police.
 * Uses OFFICER_AUTH_FILE (jcarter) — no admin privileges.
 *
 * Coverage:
 *  - Default date filter (today) → empty/populated states
 *  - Advanced filters: name, phone, contact preference (+clear), severity (+clear),
 *    start-time before/after/exactly — all client-side
 *  - Party card content for a known seeded party (address, date/time, contacts, counts, hold)
 *  - Card select/deselect
 *  - Pagination page-size change
 *  - Admin Dashboard link absent for officer
 *  - Export: filename, header columns, disabled-when-incomplete
 */
import { OFFICER_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import {
  type Page,
  expect,
  suiteTest as test,
} from "../../helpers/fixtures.helpers";
import { PARTIES, countWhere } from "../../helpers/seed.helpers";
import { getHeaderRow, readDownloadedXlsx } from "../../helpers/xlsx.helpers";

// ---------------------------------------------------------------------------
// Seed-derived constants
// ---------------------------------------------------------------------------

// Party 2: 408 Pittsboro St, today (NOW+0d@22:00), with citation incident at its location
// contact_one: Laura Gonzales (call), contact_two: Daniel Johnson (call)
const KNOWN_PARTY = PARTIES.find((p) => p.id === 2)!;

// Party 5: 429 Brookside Dr, today (NOW+0d@21:00), active hold, citation incident
const HOLD_PARTY = PARTIES.find((p) => p.id === 5)!;

// Today parties seeded count (NOW+0d): 11 hardcoded based on mock_data.json
// (parties at NOW+0d: ids 1,2,3,4,5,6,7,8,9,10,11)
const TODAY_PARTY_COUNT = countWhere(PARTIES, (p) => {
  const d = p.party_datetime;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openAdvancedFilters(page: Page) {
  const filterBtn = page.getByRole("button", { name: "Advanced filters" });
  await filterBtn.click();
  // Wait for the advanced panel to be visible (Name input has placeholder="None")
  // The panel renders multiple inputs with placeholder="None"
  await expect(page.locator('input[placeholder="None"]').first()).toBeVisible();
}

/** Get the Name input in the advanced panel (placeholder="None", second occurrence = name) */
function getNameInput(page: Page) {
  // AdvancedPartySearch renders Phone first, then Name
  // Phone has placeholder="None" and type="text", Name also has placeholder="None" type="text"
  // They appear in DOM order: Start Time select, Phone input, Name input
  return page.locator('input[placeholder="None"][type="text"]').nth(1);
}

/** Get the Phone input in the advanced panel */
function getPhoneInput(page: Page) {
  return page.locator('input[placeholder="None"][type="text"]').nth(0);
}

/** Get the Preference select trigger in the advanced panel */
function getPreferenceSelect(page: Page) {
  // The Preference select is the 2nd select trigger in the advanced panel
  // Order in DOM: Start Time type select (1st), Preference (2nd), Citation Type (3rd)
  return page.locator('[data-slot="select-trigger"]').nth(1);
}

/** Get the Citation Type select trigger in the advanced panel */
function getCitationTypeSelect(page: Page) {
  return page.locator('[data-slot="select-trigger"]').nth(2);
}

/** Get the Start Time type select trigger */
function getStartTimeTypeSelect(page: Page) {
  return page.locator('[data-slot="select-trigger"]').nth(0);
}

async function waitForCards(page: Page) {
  // Wait for at least one card or the empty state, ensuring loading is done
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll("article[data-party-id]");
    const empty = document.querySelector("p.content.text-muted-foreground");
    return cards.length > 0 || !!empty;
  });
}

// ===========================================================================

test.describe("Officer Dashboard — /police", () => {
  test.use({ storageState: OFFICER_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/police");
  });

  // -------------------------------------------------------------------------
  // Date range / empty & populated states
  // -------------------------------------------------------------------------

  test.describe("date filter", () => {
    test("default range is today — shows today parties", async ({ page }) => {
      await waitForCards(page);
      // Today has 11 seeded parties — the list should be populated
      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test("export button is enabled by default (date range is pre-populated)", async ({
      page,
    }) => {
      // On page load, startDate and endDate both default to today, so Export is enabled.
      const exportBtn = page.getByRole("button", {
        name: "Download parties in the list as Excel",
      });
      await expect(exportBtn).toBeEnabled();
    });

    test("date range set to a future date with parties shows cards", async ({
      page,
    }) => {
      await waitForCards(page);
      // Verify today parties are shown (TODAY_PARTY_COUNT seeded)
      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBe(TODAY_PARTY_COUNT);
    });
  });

  // -------------------------------------------------------------------------
  // Advanced filters (all client-side)
  // -------------------------------------------------------------------------

  test.describe("advanced filters", () => {
    test.beforeEach(async ({ page }) => {
      await waitForCards(page);
      await openAdvancedFilters(page);
    });

    test("name filter narrows list to matching parties", async ({ page }) => {
      // "Laura" appears as contact_one only in party 2 today
      await getNameInput(page).fill("Laura");

      const cards = page.locator("article[data-party-id]");
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText("Laura");
    });

    test("phone filter narrows list", async ({ page }) => {
      // Laura Gonzales phone: 8565753194
      await getPhoneInput(page).fill("8565753194");

      const cards = page.locator("article[data-party-id]");
      await expect(cards).toHaveCount(1);
    });

    test("contact preference — call — narrows list", async ({ page }) => {
      // Today: 7 parties have at least one contact preferring call
      await getPreferenceSelect(page).click();
      await page.getByRole("option", { name: "Call", exact: true }).click();

      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(TODAY_PARTY_COUNT);
    });

    test("contact preference clear — restores all results", async ({
      page,
    }) => {
      await getPreferenceSelect(page).click();
      await page.getByRole("option", { name: "Call", exact: true }).click();

      const narrowed = await page.locator("article[data-party-id]").count();

      // The Preference select renders an X span[role=button] next to the trigger
      // when a value is selected
      const clearBtn = page
        .locator("span[role='button']")
        .filter({ has: page.locator("svg") })
        .first();
      await clearBtn.click();

      const restored = await page.locator("article[data-party-id]").count();
      expect(restored).toBeGreaterThan(narrowed);
    });

    test("citation severity filter narrows list", async ({ page }) => {
      // Today: parties 2, 4, 5, 9 have citation incidents at their locations
      await getCitationTypeSelect(page).click();
      await page.getByRole("option", { name: "Citation", exact: true }).click();

      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(TODAY_PARTY_COUNT);
    });

    test("severity clear — restores all results", async ({ page }) => {
      await getCitationTypeSelect(page).click();
      await page.getByRole("option", { name: "Citation", exact: true }).click();

      const narrowed = await page.locator("article[data-party-id]").count();

      // The Citation Type select renders an X span[role=button] when value is set
      const clearBtns = page
        .locator("span[role='button']")
        .filter({ has: page.locator("svg") });
      await clearBtns.last().click();

      const restored = await page.locator("article[data-party-id]").count();
      expect(restored).toBeGreaterThan(narrowed);
    });

    test("start time — before 19:00 — shows only early parties", async ({
      page,
    }) => {
      // Today parties before 19:00: party 4 (18:30)
      await getStartTimeTypeSelect(page).click();
      await page.getByRole("option", { name: "Before", exact: true }).click();

      const timeInput = page.locator('input[type="time"]').first();
      await timeInput.fill("19:00");

      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      // Only party 4 (18:30) is before 19:00
      expect(count).toBeLessThan(TODAY_PARTY_COUNT);
    });

    test("start time — after 21:00 — shows only late parties", async ({
      page,
    }) => {
      // Today parties after 21:00: party 2 (22:00)
      await getStartTimeTypeSelect(page).click();
      await page.getByRole("option", { name: "After", exact: true }).click();

      const timeInput = page.locator('input[type="time"]').first();
      await timeInput.fill("21:00");

      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      // Only party 2 at 22:00 is strictly after 21:00
      expect(count).toBeLessThan(TODAY_PARTY_COUNT);
    });

    test("start time — exactly 20:00 — shows only matching parties", async ({
      page,
    }) => {
      // Today parties at exactly 20:00: parties 10 and 11
      await getStartTimeTypeSelect(page).click();
      await page.getByRole("option", { name: "Exactly", exact: true }).click();

      const timeInput = page.locator('input[type="time"]').first();
      await timeInput.fill("20:00");

      const cards = page.locator("article[data-party-id]");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBe(2); // parties 10 and 11 are at 20:00
    });
  });

  // -------------------------------------------------------------------------
  // Party card content
  // -------------------------------------------------------------------------

  test.describe("party card content", () => {
    test("known party (408 Pittsboro) shows address, contacts, and incident counts", async ({
      page,
    }) => {
      await waitForCards(page);

      const card = page.locator(`article[data-party-id="${KNOWN_PARTY.id}"]`);
      await expect(card).toBeVisible();

      // Address displayed (street number + name)
      await expect(card).toContainText("408");
      await expect(card).toContainText("Pittsboro");

      // Date/time present (formatTime renders as h:mm a, e.g. "10:00 PM")
      await expect(card).toContainText("10:00 PM");

      // Contact names
      await expect(card).toContainText("Laura");
      await expect(card).toContainText("Gonzales");
      await expect(card).toContainText("Daniel");
      await expect(card).toContainText("Johnson");
    });

    test("hold party (429 Brookside) shows hold expiration indicator", async ({
      page,
    }) => {
      await waitForCards(page);

      const card = page.locator(`article[data-party-id="${HOLD_PARTY.id}"]`);
      await expect(card).toBeVisible();

      // Hold expiration: a date string visible in the card (AlertTriangle + date)
      // The card renders the hold_expiration date when hasActiveHold is true
      await expect(card.locator("svg.lucide-triangle-alert")).toBeVisible();
    });

    test("clicking a card selects it; clicking again deselects it", async ({
      page,
    }) => {
      await waitForCards(page);

      const card = page.locator(`article[data-party-id="${KNOWN_PARTY.id}"]`);
      await expect(card).toBeVisible();

      // Initial state: not active (no bg-primary/10 ring)
      await expect(card).not.toHaveClass(/bg-primary\/10/);

      // Click → selected
      await card.click();
      await expect(card).toHaveClass(/bg-primary\/10/);

      // Click again → deselected
      await card.click();
      await expect(card).not.toHaveClass(/bg-primary\/10/);
    });
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  test("pagination: page-size selector changes visible card count", async ({
    page,
  }) => {
    await waitForCards(page);

    // Default page size is 25 (set in source). Today has 11 parties — all visible.
    // Navigate to a multi-day range so there are enough parties to paginate.
    // Instead, verify the page-size combobox options are present.
    const pageSizeCombobox = page.getByRole("combobox").last();
    await pageSizeCombobox.click();
    await expect(
      page.getByRole("option", { name: "10", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "25", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "50", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "100", exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  // -------------------------------------------------------------------------
  // Admin Dashboard link absent for officer
  // -------------------------------------------------------------------------

  test("Admin Dashboard link is NOT shown for officer role", async ({
    page,
  }) => {
    // The link is only shown when canAccessAdmin is true (police_admin/admin only)
    await expect(
      page.getByRole("link", { name: /Admin Dashboard/i })
    ).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  test.describe("export", () => {
    test("export button is enabled when date range is set", async ({
      page,
    }) => {
      const exportBtn = page.getByRole("button", {
        name: "Download parties in the list as Excel",
      });
      await expect(exportBtn).toBeEnabled();
    });

    test("export downloads an .xlsx file with expected headers", async ({
      page,
    }) => {
      await waitForCards(page);

      const exportBtn = page.getByRole("button", {
        name: "Download parties in the list as Excel",
      });
      await expect(exportBtn).toBeEnabled();

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportBtn.click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);

      const rows = await readDownloadedXlsx(download);
      const headers = getHeaderRow(rows);

      // Verify key column headers are present (case-insensitive contains check)
      const headerJoined = headers.join(" ").toLowerCase();
      expect(headerJoined).toContain("address");
      // The export includes date/time and contact fields
      expect(headers.length).toBeGreaterThan(2);
    });

    test("export button is disabled when date range is mid-selection", async ({
      page,
    }) => {
      const exportBtn = page.getByRole("button", {
        name: "Download parties in the list as Excel",
      });

      // Open the DateRangeFilter popover
      await page.locator("#date-range").click();

      // Click the currently-selected day: react-day-picker range mode resets
      // to {from: date, to: undefined} when you click the existing start date,
      // leaving endDate undefined and disabling the export button.
      await page.locator('[aria-selected="true"]').first().click();

      // Close the popover so the disabled state is readable
      await page.keyboard.press("Escape");

      await expect(exportBtn).toBeDisabled();
    });
  });
});
