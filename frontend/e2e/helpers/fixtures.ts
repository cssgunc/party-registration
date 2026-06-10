import { type Page, test as base, expect } from "@playwright/test";
import { resetDatabase } from "./db";

const test = base.extend<{ _dbReset: void }>({
  _dbReset: [
    async ({}, use) => {
      resetDatabase();
      await use();
    },
    { auto: true },
  ],
});

// For exhaustive suites: no auto-reset per test.
// Each spec using suiteTest must call resetDatabase() in a test.beforeAll.
const suiteTest = base;

export { test, suiteTest, expect, type Page };
