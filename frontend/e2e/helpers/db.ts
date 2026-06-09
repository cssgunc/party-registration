import { execSync } from "child_process";
import path from "path";

const repoRoot = path.resolve(__dirname, "../../..");
const python = path.join(repoRoot, ".venv", "bin", "python");
const backendDir = path.join(repoRoot, "backend");

export function resetDatabase() {
  execSync(`${python} -m script.reset_dev`, {
    cwd: backendDir,
    stdio: "inherit",
  });
}
