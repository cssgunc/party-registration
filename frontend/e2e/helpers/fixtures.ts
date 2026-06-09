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

export { test, expect, type Page };
