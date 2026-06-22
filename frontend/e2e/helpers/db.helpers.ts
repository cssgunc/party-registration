import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../../..");
const venvPython = path.join(repoRoot, ".venv", "bin", "python");
const python = fs.existsSync(venvPython) ? venvPython : "python3";
const backendDir = path.join(repoRoot, "backend");

export function resetDatabase() {
  execSync(`${python} -m script.reset_dev`, {
    cwd: backendDir,
    stdio: "inherit",
  });
}

/**
 * Insert an already-expired invite token for the given email directly into the
 * DB. Used to reproduce the expired-invite login-DoS bug in e2e tests without
 * waiting for a real token to expire.
 *
 * Call AFTER resetDatabase() — the reset wipes all invite rows.
 */
export function createExpiredInvite(email: string, role: "staff" | "admin") {
  execSync(`${python} -m script.create_expired_invite ${email} ${role}`, {
    cwd: backendDir,
    stdio: "inherit",
  });
}
