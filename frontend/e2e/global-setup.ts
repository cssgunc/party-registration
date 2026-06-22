import {
  type Browser,
  type FullConfig,
  type Page,
  chromium,
} from "@playwright/test";
import { type ChildProcess, spawn } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import {
  loginAsAdmin,
  loginAsOfficer,
  loginAsPoliceAdmin,
  loginAsStaff,
  loginAsStudent,
} from "./helpers/auth.helpers";

// Shared auth file paths — exhaustive spec files import these to skip per-test login.
export const STUDENT_AUTH_FILE = path.join(__dirname, ".auth/student.json");
export const STAFF_AUTH_FILE = path.join(__dirname, ".auth/staff.json");
export const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin.json");
export const OFFICER_AUTH_FILE = path.join(__dirname, ".auth/officer.json");
export const POLICE_AUTH_FILE = path.join(__dirname, ".auth/police.json");

// Chromium inside the container resolves localhost:8080 to IPv6 (::1) and fails
// to reach the SAML IdP. This socat proxy listens on IPv4 localhost:8080 and
// forwards to saml-idp:8080, bridging the IPv4→IPv6 gap so SAML login works.
// Scoped to the test run (started here, killed in teardown) so it doesn't live
// in the dev environment.
const SAML_PROXY_PORT = 8080;

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForPort(port: number, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `socat proxy did not open port ${port} within ${timeoutMs}ms`
  );
}

/**
 * Starts the SAML proxy. If port 8080 is already bound (e.g. a leftover proxy
 * or the dev environment provides its own), reuses it and returns null so
 * teardown leaves it untouched.
 */
async function startSamlProxy(): Promise<ChildProcess | null> {
  if (await isPortOpen(SAML_PROXY_PORT)) return null;

  const proxy = spawn(
    "socat",
    [
      `TCP4-LISTEN:${SAML_PROXY_PORT},fork,reuseaddr`,
      `TCP:saml-idp:${SAML_PROXY_PORT}`,
    ],
    { stdio: "ignore" }
  );
  await waitForPort(SAML_PROXY_PORT);
  return proxy;
}

async function saveAuthState(
  browser: Browser,
  baseURL: string,
  loginFn: (page: Page) => Promise<void>,
  authFile: string
) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await loginFn(page);
  await context.storageState({ path: authFile });
  await context.close();
}

// Re-auth if the file is older than the backend's access token lifetime so we
// never reuse a session whose access token has expired (refresh would fail
// because DB resets wipe the refresh_tokens table).
const ACCESS_TOKEN_EXPIRE_MINUTES = Number(
  process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 15
);
const ACCESS_TOKEN_VALID_MS = (ACCESS_TOKEN_EXPIRE_MINUTES - 1) * 60 * 1000;

function isAuthFileValid(authFile: string): boolean {
  if (!fs.existsSync(authFile)) return false;
  try {
    const stat = fs.statSync(authFile);
    if (Date.now() - stat.mtimeMs > ACCESS_TOKEN_VALID_MS) return false;

    const state = JSON.parse(fs.readFileSync(authFile, "utf-8")) as {
      cookies: Array<{ expires: number }>;
    };
    const oneHourFromNow = Date.now() / 1000 + 3600;
    const timedCookies = state.cookies.filter((c) => c.expires > 0);
    return (
      timedCookies.length > 0 &&
      timedCookies.every((c) => c.expires > oneHourFromNow)
    );
  } catch {
    return false;
  }
}

// DB reset is handled per-test via the auto-use fixture in helpers/fixtures.ts.
// Exhaustive suites call resetDatabase() in their own beforeAll.
export default async function globalSetup(config: FullConfig) {
  const proxy = await startSamlProxy();
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  const res = await fetch(`${baseURL}/api/auth/providers`).catch(() => null);
  if (!res?.ok) {
    proxy?.kill("SIGTERM");
    throw new Error(`App is not running at ${baseURL}. Start it first`);
  }
  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true });

  const authEntries = [
    { loginFn: loginAsStudent, authFile: STUDENT_AUTH_FILE },
    { loginFn: loginAsStaff, authFile: STAFF_AUTH_FILE },
    { loginFn: loginAsAdmin, authFile: ADMIN_AUTH_FILE },
    { loginFn: loginAsOfficer, authFile: OFFICER_AUTH_FILE },
    { loginFn: loginAsPoliceAdmin, authFile: POLICE_AUTH_FILE },
  ];
  const stale = authEntries.filter(
    ({ authFile }) => !isAuthFileValid(authFile)
  );

  if (stale.length > 0) {
    const browser = await chromium.launch({ chromiumSandbox: false });
    for (const { loginFn, authFile } of stale) {
      await saveAuthState(browser, baseURL, loginFn, authFile);
    }
    await browser.close();
  }

  // Returned function runs as Playwright's global teardown after all tests.
  return () => {
    proxy?.kill("SIGTERM");
  };
}
