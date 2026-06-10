import { type FullConfig, chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { loginAsAdmin, loginAsPoliceAdmin } from "./helpers/auth";

// Shared auth file paths — exhaustive spec files import these to skip per-test login.
export const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin.json");
export const POLICE_AUTH_FILE = path.join(__dirname, ".auth/police.json");

// DB reset is handled per-test via the auto-use fixture in helpers/fixtures.ts.
// Exhaustive suites call resetDatabase() in their own beforeAll.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await loginAsAdmin(page, "/staff/parties");
  await context.storageState({ path: ADMIN_AUTH_FILE });

  await loginAsPoliceAdmin(page);
  await context.storageState({ path: POLICE_AUTH_FILE });

  await browser.close();
}
