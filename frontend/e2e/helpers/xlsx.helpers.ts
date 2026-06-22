/**
 * Excel / XLSX helpers for Playwright download assertions.
 *
 * Requires the `exceljs` package (added as a devDependency).
 * Reads the first worksheet and returns every row as an array of cell text.
 */
import { type Download } from "@playwright/test";
import ExcelJS from "exceljs";
import os from "os";
import path from "path";

/**
 * Saves a Playwright download to a temp file, loads it with ExcelJS, and
 * returns every row from the first worksheet as an array of string cells.
 *
 * Empty rows are included as empty arrays so row indices stay stable.
 * Cell values are coerced to strings via `.toString()` (numbers, dates, etc.
 * are stringified; rich-text cells use their plain-text representation).
 *
 * @param download  The Playwright `Download` object to read.
 * @returns         A 2-D array where `rows[r][c]` is the text of cell (r, c).
 */
export async function readDownloadedXlsx(
  download: Download
): Promise<string[][]> {
  // download.path() is available immediately for completed downloads; use it
  // directly to avoid an extra copy in most runners.  If it returns null (e.g.
  // in some remote scenarios), fall back to saveAs into a temp file.
  let filePath = await download.path();
  if (!filePath) {
    filePath = path.join(
      os.tmpdir(),
      `pw-download-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`
    );
    await download.saveAs(filePath);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error(
      "readDownloadedXlsx: the downloaded file contains no worksheets"
    );
  }

  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value;
      if (val === null || val === undefined) {
        cells.push("");
      } else if (typeof val === "object" && "richText" in val) {
        // RichTextValue
        cells.push(
          (val as { richText: { text: string }[] }).richText
            .map((r) => r.text)
            .join("")
        );
      } else if (val instanceof Date) {
        cells.push(val.toISOString());
      } else {
        cells.push(String(val));
      }
    });
    rows.push(cells);
  });

  return rows;
}

/**
 * Convenience helper — returns the first row (header row) from the output of
 * `readDownloadedXlsx`.  Throws if the rows array is empty.
 */
export function getHeaderRow(rows: string[][]): string[] {
  if (rows.length === 0) {
    throw new Error(
      "getHeaderRow: rows array is empty — the worksheet has no data"
    );
  }
  return rows[0];
}
