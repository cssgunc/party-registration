import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: [
    path.resolve(__dirname, ".env.local"),
    path.resolve(__dirname, "../backend/.env"),
  ],
});

const baseURL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const expectTimeout = Number(process.env.E2E_EXPECT_TIMEOUT ?? 15_000);
const actionTimeout = Number(process.env.E2E_ACTION_TIMEOUT ?? 30_000);
const navigationTimeout = Number(process.env.E2E_NAVIGATION_TIMEOUT ?? 60_000);
const testTimeout = Number(process.env.E2E_TEST_TIMEOUT ?? 120_000);

/**
 * Run from within the devcontainer (VS Code integrated terminal).
 * Requires both the frontend (port 3000) and backend (port 8000) to already
 * be running. globalSetup will fail fast with a clear message if they aren't.
 *
 * Quick start:
 *   npm run test:e2e        — headless run
 *   npm run test:e2e:ui     — interactive UI mode
 *   npx playwright install chromium  — first-time browser install
 */
export default defineConfig({
  testDir: "./e2e/test",
  globalSetup: "./e2e/global-setup.ts",

  // E2E tests are sequential to avoid DB conflicts between tests.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],

  timeout: testTimeout,
  expect: { timeout: expectTimeout },

  use: {
    baseURL,
    launchOptions: { chromiumSandbox: false },
    trace: "on-first-retry",
    actionTimeout,
    navigationTimeout,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
