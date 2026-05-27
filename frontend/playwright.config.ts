import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const baseURL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Run from within the devcontainer (VS Code integrated terminal).
 * Requires both the frontend (port 3000) and backend (port 8000) to already
 * be running. The globalSetup handles resetting the dev DB and proxying the
 * SAML IdP.
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

  use: {
    baseURL,
    trace: "on-first-retry",
    // Keep a longer timeout for SAML redirects.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Reuse the dev server that's already running in the devcontainer.
  // If it isn't running yet, Playwright will start it automatically.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
