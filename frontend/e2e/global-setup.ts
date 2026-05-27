import { execSync } from "child_process";
import path from "path";

export default async function globalSetup() {
  resetDevDatabase();
}

/**
 * Resets the dev database to the seeded state from mock_data.json.
 * Runs reset_dev.py using the repo-root venv.
 */
function resetDevDatabase() {
  const repoRoot = path.resolve(__dirname, "../..");
  const python = path.join(repoRoot, ".venv", "bin", "python");
  const backendDir = path.join(repoRoot, "backend");

  console.log("[setup] Resetting dev database...");
  execSync(`${python} -m script.reset_dev`, {
    cwd: backendDir,
    stdio: "inherit",
  });
  console.log("[setup] Dev database reset.");
}
