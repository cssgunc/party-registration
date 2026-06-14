import { type Page, expect } from "@playwright/test";
import {
  applyDateFilter,
  applyNumberFilter,
  applySelectFilter,
  applyTextFilter,
  applyTimeFilter,
  clearFilter,
  expectSorted,
  getColumnCellTexts,
  getPaginationTotal,
  sortColumn,
} from "./table.helpers";

export type SortCase = {
  header: string;
  kind: "text" | "number" | "date" | "time";
};

export type FilterCase =
  | {
      kind: "text";
      column: string;
      operator: string;
      value?: string;
      expectedCount: number;
    }
  | {
      kind: "number";
      column: string;
      operator: string;
      value: number;
      expectedCount: number;
    }
  | {
      kind: "select";
      column: string;
      operator: string;
      value: string | string[];
      expectedCount: number;
    }
  | {
      kind: "date";
      column: string;
      operator: string;
      value?: string;
      expectedCount: number;
    }
  | {
      kind: "time";
      column: string;
      operator: string;
      value: string | { from: string; to: string };
      expectedCount: number;
    };

export async function sortAndVerify(
  page: Page,
  header: string,
  kind: "text" | "number" | "date" | "time",
  direction: "asc" | "desc"
) {
  await sortColumn(page, header, direction);
  const values = await getColumnCellTexts(page, header);
  expect(values.length).toBeGreaterThan(0);
  expectSorted(values, kind, direction);
}

export async function filterAndExpect(page: Page, tc: FilterCase) {
  switch (tc.kind) {
    case "number":
      await applyNumberFilter(page, tc.column, tc.operator, tc.value);
      break;
    case "select":
      await applySelectFilter(page, tc.column, tc.operator, tc.value);
      break;
    case "date":
      await applyDateFilter(page, tc.column, tc.operator, tc.value);
      break;
    case "time":
      await applyTimeFilter(page, tc.column, tc.operator, tc.value);
      break;
    default:
      await applyTextFilter(
        page,
        tc.column,
        tc.operator,
        (tc as Extract<FilterCase, { kind: "text" }>).value
      );
  }
  expect(await getPaginationTotal(page)).toBe(tc.expectedCount);
  await clearFilter(page, tc.column);
}

export function filterTestTitle(tc: FilterCase): string {
  let valueStr = "";
  if ("value" in tc && tc.value !== undefined) {
    valueStr = Array.isArray(tc.value)
      ? `: [${(tc.value as string[]).join(", ")}]`
      : `: ${tc.value}`;
  }
  return `filter ${tc.column} — ${tc.operator}${valueStr}`;
}

// Click the Incidents info chip for a given location row and wait for the sidebar.
export async function openIncidentSidebar(page: Page, rowAddress: string) {
  await page
    .getByRole("row")
    .filter({ hasText: rowAddress })
    .first()
    .getByRole("button", { name: /\d+ incident/ })
    .click();
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible();
}
