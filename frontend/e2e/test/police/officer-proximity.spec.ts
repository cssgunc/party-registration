/**
 * officer-proximity.spec.ts
 *
 * Tests for the proximity address-search feature on the officer dashboard.
 * Uses OFFICER_AUTH_FILE (jcarter).
 *
 * Proximity radius is controlled by NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES
 * (default 0.1 miles). All distance assertions below assume the default.
 *
 * Seeded layout relevant to these tests:
 *
 *   Location 1  — 408 Pittsboro St  (lat 35.9059, lon -79.0553)
 *     Has party 2 today (NOW+0d@22:00), has citation+remote_warning incidents.
 *     Nearest neighbour = Location 26 at ~0.144mi — OUTSIDE 0.1mi radius.
 *     → searching 408 Pittsboro yields exact-match WITH party + EMPTY nearby.
 *
 *   Location 8  — 509 Pine Bluff Trail (hold=NOW+90d, no today party)
 *     Nearest neighbour > 0.1mi (fully isolated).
 *     → searching 509 Pine Bluff Trail yields exact-match WITHOUT party + hold shown.
 *
 *   Location 11 — 204 Spring Ln (hold=NOW+90d, no today party)
 *     Location 15 (216 E Rosemary St, ~0.071mi) and
 *     Location 2  (306 Henderson St,  ~0.076mi) are WITHIN 0.1mi.
 *     Location 2 has party 13 (NOW+1d@22:00 — NOT today) and
 *     Location 15 has parties spanning multiple dates (some TODAY).
 *     → good candidate for "nearby party found" assertion.
 *
 * PROXIMITY-FIXTURE APPROACH: FALLBACK (no backend API seeding needed)
 *
 * The task brief asks us to add a nearby party within 0.1mi in beforeAll if
 * the API approach is practical. Analysis shows:
 *  - Location 11 already has two seeded neighbours within 0.1mi (loc 2 & 15).
 *  - Location 15 has today parties (loc_id=15, parties at NOW+0d range exist).
 *  - This means searching 204 Spring Ln should yield exact-match (no today party)
 *    + nearby parties from loc 15 and loc 2 where dates overlap the filter.
 *
 * We therefore test the "empty nearby" scenario using 204 Spring Ln on today's
 * date filter: loc 15 and loc 2 have NO today parties (nearest parties are on
 * +1d/+3d), confirming the Nearby section is absent for today-only filter.
 * The fixme test documents the widened-date-range scenario.
 * Exact distance math is owned by backend unit tests.
 */
import { addDays, format } from "date-fns";
import { OFFICER_AUTH_FILE } from "../../global-setup";
import { resetDatabase } from "../../helpers/db.helpers";
import {
  type Page,
  expect,
  suiteTest as test,
} from "../../helpers/fixtures.helpers";
import { LOCATIONS } from "../../helpers/seed.helpers";
import { selectAddressSuggestion } from "../../helpers/table.helpers";

// ---------------------------------------------------------------------------
// Seed-derived constants
// ---------------------------------------------------------------------------

const SEARCH_RADIUS_MILES = parseFloat(
  process.env.NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES ?? "0.1"
);

// Location 1: exact match WITH a today party, no active hold
const LOC_WITH_PARTY_TODAY = LOCATIONS.find((l) => l.id === 1)!;
// Address string for Google Maps autocomplete
const ADDR_WITH_PARTY = LOC_WITH_PARTY_TODAY.formatted_address; // "408 Pittsboro St, Chapel Hill, NC 27516, USA"

// Location 8: exact match WITHOUT a today party, active hold=NOW+90d
const LOC_WITH_HOLD_NO_TODAY_PARTY = LOCATIONS.find((l) => l.id === 8)!;
const ADDR_WITH_HOLD = LOC_WITH_HOLD_NO_TODAY_PARTY.formatted_address; // "509 Pine Bluff Trail, Chapel Hill, NC 27516, USA"

// Location 11: exact match WITHOUT a today party, active hold, has neighbours within radius
const LOC_HAS_NEARBY_NEIGHBOURS = LOCATIONS.find((l) => l.id === 11)!;
const ADDR_NEAR_OTHERS = LOC_HAS_NEARBY_NEIGHBOURS.formatted_address; // "204 Spring Ln, Chapel Hill, NC 27514, USA"

// Location 26: nearest neighbour to loc 1 at ~0.144mi — OUTSIDE the 0.1mi radius
// Has a party today (NOW+0d@21:00)
const LOC_OUTSIDE_RADIUS = LOCATIONS.find((l) => l.id === 26)!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForCards(page: Page) {
  await page.waitForFunction(() => {
    const cards = document.querySelectorAll("article[data-party-id]");
    const empty = document.querySelector("p.content.text-muted-foreground");
    const exactMatch = document.querySelector(
      "[aria-labelledby='party-list-exact-match']"
    );
    return cards.length > 0 || !!empty || !!exactMatch;
  });
}

async function searchAddress(page: Page, address: string) {
  await selectAddressSuggestion(page, "address", address);
}

async function clearSearch(page: Page) {
  // The AddressSearch renders a "Clear address selection" button when a value is selected
  const clearBtn = page.getByRole("button", {
    name: "Clear address selection",
  });
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
  } else {
    // Fallback: manually clear the input
    const addressInput = page.locator("#address");
    await addressInput.fill("");
    await addressInput.press("Escape");
  }
  // Wait a moment for the debounced state update
  await page.waitForTimeout(600);
}

// ===========================================================================

test.describe("Officer — Proximity Search", () => {
  test.use({ storageState: OFFICER_AUTH_FILE });

  test.beforeAll(() => {
    resetDatabase();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/police");
    // Wait for initial today party list to load
    await waitForCards(page);
  });

  // -------------------------------------------------------------------------
  // Map heading changes when address is searched
  // -------------------------------------------------------------------------

  test("searching an address changes map heading to 'Showing Nearby Parties'", async ({
    page,
  }) => {
    // Initial heading
    await expect(
      page.getByRole("heading", { name: "Showing All Parties" })
    ).toBeVisible();

    await searchAddress(page, ADDR_WITH_PARTY);
    await waitForCards(page);

    await expect(
      page.getByRole("heading", { name: "Showing Nearby Parties" })
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Exact-match states
  // -------------------------------------------------------------------------

  test("exact match WITH a today party — shows full party card in Exact Match section", async ({
    page,
  }) => {
    await searchAddress(page, ADDR_WITH_PARTY);
    await waitForCards(page);

    // "Exact Match:" heading appears
    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();
    await expect(
      exactSection.getByRole("heading", { name: "Exact Match:" })
    ).toBeVisible();

    // The card within exact match shows address text
    await expect(exactSection).toContainText("408");
    await expect(exactSection).toContainText("Pittsboro");

    // Full party card: contacts shown (Laura Gonzales / Daniel Johnson)
    await expect(exactSection).toContainText("Laura");
    await expect(exactSection).toContainText("Daniel");
  });

  test("exact match WITHOUT a today party — shows stripped 'No party registered' card", async ({
    page,
  }) => {
    // Location 8: 509 Pine Bluff Trail — no today party, hold exists
    await searchAddress(page, ADDR_WITH_HOLD);
    await waitForCards(page);

    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();

    // Stripped card shows the no-party message
    await expect(
      exactSection.getByText("No party registered at this location")
    ).toBeVisible();
  });

  test("exact match hold location — hold expiration indicator shown on stripped card", async ({
    page,
  }) => {
    // Location 8 has hold=NOW+90d and no today party
    await searchAddress(page, ADDR_WITH_HOLD);
    await waitForCards(page);

    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();

    // Hold indicator: AlertTriangle SVG
    await expect(
      exactSection.locator("svg.lucide-triangle-alert")
    ).toBeVisible();
  });

  test("exact match non-existing location — stripped card with empty incident flags", async ({
    page,
  }) => {
    // Search an address that exists in Google Maps but is NOT in the DB at all
    // Use a valid Chapel Hill address not in mock_data
    await searchAddress(page, "300 S Columbia St, Chapel Hill, NC");
    await waitForCards(page);

    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();
    await expect(
      exactSection.getByText("No party registered at this location")
    ).toBeVisible();

    // Incident counts should all be 0
    const counts = exactSection.locator(
      ".flex.items-center.gap-1.content-bold"
    );
    const countValues = await counts.allTextContents();
    for (const val of countValues) {
      expect(Number.parseInt(val.trim(), 10)).toBe(0);
    }
  });

  // -------------------------------------------------------------------------
  // Add incident to exact-match cards
  // -------------------------------------------------------------------------

  test("add incident to exact-match-with-party card — count appears", async ({
    page,
  }) => {
    await searchAddress(page, ADDR_WITH_PARTY);
    await waitForCards(page);

    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();

    // Get the current remote_warning count
    const countLocator = exactSection
      .locator(".flex.items-center.gap-1.content-bold")
      .nth(0);
    const countBefore = Number.parseInt(
      (await countLocator.textContent()) ?? "0",
      10
    );

    // Open incident menu and add remote warning
    await exactSection
      .getByRole("button", { name: "Open incident menu" })
      .click();
    await page.getByRole("menuitem", { name: /add remote warning/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Count increments
    const countAfter = Number.parseInt(
      (await countLocator.textContent()) ?? "0",
      10
    );
    expect(countAfter).toBe(countBefore + 1);
  });

  test("add incident to exact-match-without-party card — flag appears (upserts location)", async ({
    page,
  }) => {
    // Location 8 has no today party but exists in DB
    await searchAddress(page, ADDR_WITH_HOLD);
    await waitForCards(page);

    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();

    const countBefore = Number.parseInt(
      (await exactSection
        .locator(".flex.items-center.gap-1.content-bold")
        .nth(0)
        .textContent()) ?? "0",
      10
    );

    await exactSection
      .getByRole("button", { name: "Open incident menu" })
      .click();
    await page.getByRole("menuitem", { name: /add remote warning/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const countAfter = Number.parseInt(
      (await exactSection
        .locator(".flex.items-center.gap-1.content-bold")
        .nth(0)
        .textContent()) ?? "0",
      10
    );
    expect(countAfter).toBe(countBefore + 1);
  });

  // -------------------------------------------------------------------------
  // Nearby distance boundary (FALLBACK approach — no API seeding required)
  //
  // LIMITATION: All seeded locations have their nearest in-radius neighbours
  // only on non-today dates when viewed with the default today filter. We
  // therefore demonstrate the boundary via two complementary assertions:
  //
  //  (a) 408 Pittsboro St (loc 1): nearest neighbour loc 26 at ~0.144mi
  //      → OUTSIDE 0.1mi; today filter → no "Nearby Parties:" heading.
  //
  //  (b) 204 Spring Ln (loc 11): neighbours loc 15 (~0.071mi) and loc 2
  //      (~0.076mi) are WITHIN 0.1mi but have no TODAY parties; today filter
  //      → no "Nearby Parties:" heading (correct: no nearby parties today).
  //
  // The fixme test documents the widened-date-range path that would show
  // the "Nearby Parties:" section from loc 15/loc 2.
  //
  // Location 1 (408 Pittsboro) nearest neighbour: loc 26 at ~0.144mi — OUTSIDE.
  // -------------------------------------------------------------------------

  test(`nearby: search ${ADDR_WITH_PARTY} — no 'Nearby Parties' section because nearest neighbour (${LOC_OUTSIDE_RADIUS.formatted_address}) is outside ${SEARCH_RADIUS_MILES}mi radius`, async ({
    page,
  }) => {
    await searchAddress(page, ADDR_WITH_PARTY);
    await waitForCards(page);

    // No "Nearby Parties:" heading should appear — exact match only
    await expect(
      page.getByRole("heading", { name: "Nearby Parties:" })
    ).toHaveCount(0);
  });

  test("nearby: search 204 Spring Ln (today filter) — no Nearby section because loc-15/loc-2 have no today parties", async ({
    page,
  }) => {
    // Location 11 (204 Spring Ln) neighbours loc 15 (~0.071mi) and loc 2 (~0.076mi),
    // both within 0.1mi. However, loc 15 has no today parties (nearest: NOW+1d)
    // and loc 2 has no today parties (nearest: NOW+1d). With today-only filter,
    // no nearby parties appear — this is correct API behaviour.
    await searchAddress(page, ADDR_NEAR_OTHERS);
    await waitForCards(page);

    // "Exact Match:" section for 204 Spring Ln (no today party at this location)
    const exactSection = page.locator(
      "[aria-labelledby='party-list-exact-match']"
    );
    await expect(exactSection).toBeVisible();

    // Exact section shows stripped card (no today party at 204 Spring Ln)
    await expect(
      exactSection.getByText("No party registered at this location")
    ).toBeVisible();

    // "Nearby Parties:" heading should NOT appear (no today neighbours)
    await expect(
      page.getByRole("heading", { name: "Nearby Parties:" })
    ).toHaveCount(0);
  });

  test("nearby: widen date range then search 204 Spring Ln — Nearby Parties section shows loc-15/loc-2 parties", async ({
    page,
  }) => {
    // Loc-15 has a party at NOW+1d and loc-2 has one at NOW+1d; both are
    // within SEARCH_RADIUS_MILES of 204 Spring Ln. Widening the date range
    // from today-only to today → today+3 surfaces them.

    // Open the DateRangeFilter popover
    await page.locator("#date-range").click();

    // Click today's button — "Today," prefix is added by react-day-picker
    // when the day has the `today` modifier. This resets to mid-selection
    // (from=today, to=undefined).
    await page.getByRole("button", { name: /^Today,/ }).click();

    // Click today+3 to complete the range (from=today, to=today+3)
    await page
      .getByRole("button", { name: format(addDays(new Date(), 3), "PPPP") })
      .click();

    await page.keyboard.press("Escape");

    // Now search 204 Spring Ln
    await searchAddress(page, ADDR_NEAR_OTHERS);
    await waitForCards(page);

    // Nearby Parties heading should appear because loc-15 and loc-2 have
    // parties within the widened date range and within the search radius.
    await expect(
      page.getByRole("heading", { name: "Nearby Parties:" })
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Clear search → back to all parties
  // -------------------------------------------------------------------------

  test("clearing the address search returns to 'Showing All Parties'", async ({
    page,
  }) => {
    await searchAddress(page, ADDR_WITH_PARTY);
    await waitForCards(page);

    await expect(
      page.getByRole("heading", { name: "Showing Nearby Parties" })
    ).toBeVisible();

    // Clear the address input
    await clearSearch(page);

    await expect(
      page.getByRole("heading", { name: "Showing All Parties" })
    ).toBeVisible();
  });
});
