import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { ok, warn, fail } from "./logger.mjs";

export function checkCommand(command) {
  try {
    const path = execSync(`command -v ${command}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    ok(`${command}: ${path}`);
    return true;
  } catch {
    fail(`${command} missing`);
    return false;
  }
}

export function printVersion(command, args = ["--version"]) {
  try {
    const output = execSync([command, ...args].join(" "), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    console.log(output);
  } catch {
    warn(`Could not read version for ${command}`);
  }
}

export function checkDir(path) {
  if (existsSync(path)) {
    ok(path);
    return true;
  }

  warn(`Missing: ${path}`);
  return false;
}

export function checkFile(path) {
  if (existsSync(path)) {
    ok(path);
    return true;
  }

  warn(`Missing: ${path}`);
  return false;
}
