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
