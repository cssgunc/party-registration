import { Locator, Page, expect } from "@playwright/test";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseUiDate(value: string): number {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Could not parse UI date: ${value}`);
  }
  return parsed.getTime();
}

function parseUiTime(value: string): number {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    throw new Error(`Could not parse UI time: ${value}`);
  }

  const [, rawHour, rawMinute, meridiem] = match;
  let hour = Number.parseInt(rawHour, 10) % 12;
  const minute = Number.parseInt(rawMinute, 10);
  if (meridiem.toUpperCase() === "PM") hour += 12;
  return hour * 60 + minute;
}

export async function waitForTableReady(page: Page) {
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.locator("text=/Results\\s+\\d+\\s+-\\s+\\d+\\s+of\\s+\\d+/")
  ).toBeVisible();
  // Wait for any in-flight fetch to finish (table dims with opacity-60 while fetching)
  await expect(page.locator(".opacity-60")).toHaveCount(0, { timeout: 15_000 });
}

async function waitForDebouncedTableReady(page: Page) {
  await page.waitForTimeout(800);
  await waitForTableReady(page);
}

export async function getResultsSummary(page: Page) {
  const text = normalizeWhitespace(
    (await page
      .locator("text=/Results\\s+\\d+\\s+-\\s+\\d+\\s+of\\s+\\d+/")
      .first()
      .textContent()) ?? ""
  );
  const match = text.match(/^Results\s+(\d+)\s+-\s+(\d+)\s+of\s+(\d+)$/);
  if (!match) {
    throw new Error(`Could not parse results summary: ${text}`);
  }

  return {
    start: Number.parseInt(match[1], 10),
    end: Number.parseInt(match[2], 10),
    total: Number.parseInt(match[3], 10),
  };
}

export async function getPaginationTotal(page: Page): Promise<number> {
  return (await getResultsSummary(page)).total;
}

export async function getVisibleRowCount(page: Page): Promise<number> {
  const table = page.getByRole("table");
  return table.evaluate((node) => {
    const rows = Array.from(
      node.querySelectorAll<HTMLTableRowElement>("tbody tr")
    );
    return rows.filter((row) => {
      const cells = row.querySelectorAll("td");
      const text = (row.textContent || "").replace(/\s+/g, " ").trim();
      return cells.length > 1 || text !== "";
    }).length;
  });
}

export async function openColumnMenu(page: Page, headerText: string) {
  const button = page.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(headerText)}(?:\\s|$)`),
  });
  await button.click();
}

export async function sortColumn(
  page: Page,
  headerText: string,
  direction: "asc" | "desc"
) {
  await openColumnMenu(page, headerText);
  await page
    .getByRole("menuitem", {
      name: direction === "asc" ? "Sort Ascending" : "Sort Descending",
    })
    .click();
  await waitForTableReady(page);
}

export async function clearSort(
  page: Page,
  headerText: string,
  direction: "asc" | "desc"
) {
  await sortColumn(page, headerText, direction);
}

function getOpenSidebar(page: Page): Locator {
  return page.locator('[data-slot="sheet-content"]').last();
}

async function openFilterSidebar(page: Page, headerText: string) {
  await openColumnMenu(page, headerText);
  await page.getByRole("menuitem", { name: /Add Filter|Edit Filter/ }).click();
  await expect(page.getByRole("heading", { name: /^Filter / })).toBeVisible();
}

async function selectFilterOperator(page: Page, operator: string) {
  const sidebar = getOpenSidebar(page);
  const operatorSelect = sidebar.getByRole("combobox").first();
  await operatorSelect.click();
  await page.getByRole("option", { name: operator, exact: true }).click();
}

async function applyFilter(page: Page) {
  const sidebar = getOpenSidebar(page);
  await sidebar.getByRole("button", { name: "Apply" }).click();
  const heading = page.getByRole("heading", { name: /^Filter / });
  try {
    await expect(heading).toBeHidden({ timeout: 1500 });
  } catch {
    await page.locator("div.fixed.top-0.right-0 button").first().click();
    await expect(heading).toBeHidden();
  }
  await waitForDebouncedTableReady(page);
}

export async function clearFilter(page: Page, headerText: string) {
  await openColumnMenu(page, headerText);
  await page.getByRole("menuitem", { name: "Clear Filter" }).click();
  await waitForDebouncedTableReady(page);
}

export async function applyTextFilter(
  page: Page,
  headerText: string,
  operator: string,
  value?: string
) {
  await openFilterSidebar(page, headerText);
  await selectFilterOperator(page, operator);
  if (value !== undefined) {
    const sidebar = getOpenSidebar(page);
    await sidebar.getByRole("textbox").fill(value);
  }
  await applyFilter(page);
}

export async function applyNumberFilter(
  page: Page,
  headerText: string,
  operator: string,
  value: number
) {
  await openFilterSidebar(page, headerText);
  await selectFilterOperator(page, operator);
  const sidebar = getOpenSidebar(page);
  await sidebar.locator('input[type="number"]').fill(String(value));
  await applyFilter(page);
}

export async function applySelectFilter(
  page: Page,
  headerText: string,
  operator: string,
  value: string | string[]
) {
  await openFilterSidebar(page, headerText);
  await selectFilterOperator(page, operator);
  const sidebar = getOpenSidebar(page);

  if (Array.isArray(value)) {
    for (const label of value) {
      await sidebar.getByText(label, { exact: true }).click();
    }
  } else {
    await sidebar.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: value, exact: true }).click();
  }

  await applyFilter(page);
}

export async function applyDateFilter(
  page: Page,
  headerText: string,
  operator: string,
  value?: string
) {
  await openFilterSidebar(page, headerText);
  await selectFilterOperator(page, operator);
  if (value !== undefined) {
    const sidebar = getOpenSidebar(page);
    await sidebar.locator('input[placeholder="mm/dd/yyyy"]').fill(value);
  }
  await applyFilter(page);
}

export async function applyDateRangeFilter(
  page: Page,
  headerText: string,
  fromLabel: RegExp,
  toLabel: RegExp
) {
  await openFilterSidebar(page, headerText);
  await selectFilterOperator(page, "Between");
  const sidebar = getOpenSidebar(page);
  await sidebar.getByRole("button", { name: /Pick a date range| - / }).click();
  await page.getByRole("button", { name: fromLabel }).click();
  await page.getByRole("button", { name: toLabel }).click();
  await applyFilter(page);
}

export async function applyTimeFilter(
  page: Page,
  headerText: string,
  operator: string,
  value: string | { from: string; to: string }
) {
  await openFilterSidebar(page, headerText);
  await selectFilterOperator(page, operator);
  const sidebar = getOpenSidebar(page);

  if (typeof value === "string") {
    await sidebar.locator('input[type="time"]').fill(value);
  } else {
    await sidebar.locator('input[type="time"]').nth(0).fill(value.from);
    await sidebar.locator('input[type="time"]').nth(1).fill(value.to);
  }

  await applyFilter(page);
}

export async function setGlobalSearch(page: Page, value: string) {
  const input = page.getByPlaceholder("Search all columns...");
  await input.fill(value);
  await waitForDebouncedTableReady(page);
}

export async function goToPage(page: Page, pageNumber: number) {
  await page
    .getByRole("link", { name: String(pageNumber), exact: true })
    .click();
  await waitForTableReady(page);
}

export async function setPageSize(page: Page, pageSize: number) {
  await page.getByRole("combobox").last().click();
  await page
    .getByRole("option", { name: String(pageSize), exact: true })
    .click();
  await waitForTableReady(page);
}

export async function openStaffTab(page: Page, tabLabel: string) {
  const tab = page.getByRole("tab", { name: tabLabel, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await waitForTableReady(page);
}

export async function getColumnCellTexts(page: Page, headerText: string) {
  const table = page.getByRole("table");
  return table.evaluate((node, header) => {
    const headers = Array.from(
      node.querySelectorAll<HTMLTableCellElement>("thead th")
    ).map((th) => (th.textContent || "").replace(/\s+/g, " ").trim());
    const columnIndex = headers.findIndex((candidate) =>
      candidate.startsWith(header)
    );
    if (columnIndex === -1) {
      throw new Error(`Column not found: ${header}`);
    }

    return Array.from(node.querySelectorAll<HTMLTableRowElement>("tbody tr"))
      .map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length !== headers.length) return null;
        return (cells[columnIndex]?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
      })
      .filter((value): value is string => Boolean(value));
  }, headerText);
}

export function expectSorted(
  values: string[],
  kind: "text" | "number" | "date" | "time",
  direction: "asc" | "desc"
) {
  const normalized = [...values];
  const sorted = [...values].sort((left, right) => {
    switch (kind) {
      case "number":
        return Number.parseFloat(left) - Number.parseFloat(right);
      case "date":
        return parseUiDate(left) - parseUiDate(right);
      case "time":
        return parseUiTime(left) - parseUiTime(right);
      default:
        return left.localeCompare(right);
    }
  });

  if (direction === "desc") {
    sorted.reverse();
  }

  expect(normalized).toEqual(sorted);
}

export async function getRow(page: Page, rowText: string | RegExp) {
  const row = page.getByRole("row").filter({
    has:
      typeof rowText === "string"
        ? page.getByText(rowText, { exact: false })
        : page.getByText(rowText),
  });
  await expect(row.first()).toBeVisible();
  return row.first();
}

export async function openRowActions(page: Page, rowText: string | RegExp) {
  const row = await getRow(page, rowText);
  await row.getByRole("button", { name: "Open menu" }).click();
}

export async function clickRowAction(
  page: Page,
  rowText: string | RegExp,
  action: string
) {
  await openRowActions(page, rowText);
  await page.getByRole("menuitem", { name: action }).click();
}

export async function confirmDialog(page: Page, confirmLabel: string) {
  await page.getByRole("button", { name: confirmLabel }).click();
  await waitForTableReady(page);
}

export async function selectAddressSuggestion(
  page: Page,
  inputId: string,
  query: string
) {
  const input = inputId
    ? page.locator(`#${inputId}`)
    : page.getByLabel("Address search input").first();
  await input.click();
  await input.fill(query);
  await page.waitForTimeout(500);
  await page.getByRole("option").first().click();
}

export async function selectStudentSuggestion(
  page: Page,
  query: string,
  optionText: string
) {
  const input = page.getByLabel("Student search input");
  await input.click();
  await input.fill(query);
  await page.waitForTimeout(500);
  await page
    .getByRole("option")
    .filter({ hasText: optionText })
    .first()
    .click();
}

export async function selectFormOptionById(
  page: Page,
  triggerId: string,
  optionText: string
) {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

export async function selectSidebarCombobox(
  page: Page,
  index: number,
  optionText: string
) {
  const sidebar = page.locator('[data-slot="sheet-content"]').last();
  await sidebar.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}
