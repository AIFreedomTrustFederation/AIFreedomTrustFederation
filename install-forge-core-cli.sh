#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🔥 Installing Forge Core CLI foundation inside AIFT-Forge"

if [ ! -d ".git" ]; then
  echo "❌ Run this from ~/Projects/AIFT/AIFT-Forge"
  exit 1
fi

mkdir -p packages/forge-core/src/cli
mkdir -p packages/forge-core/src/lib
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/lib/paths.mjs <<'JS'
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getForgePaths(importMetaUrl = import.meta.url) {
  const file = fileURLToPath(importMetaUrl);
  const dir = dirname(file);

  const forgeCoreRoot = resolve(dir, "../../..");
  const repoRoot = resolve(forgeCoreRoot, "../..");
  const aiftRoot = resolve(repoRoot, "..");

  return {
    file,
    dir,
    forgeCoreRoot,
    repoRoot,
    aiftRoot
  };
}
JS

cat > packages/forge-core/src/lib/logger.mjs <<'JS'
export function section(label) {
  console.log("");
  console.log(`━━ ${label}`);
}

export function ok(message) {
  console.log(`✅ ${message}`);
}

export function warn(message) {
  console.log(`⚠️ ${message}`);
}

export function fail(message) {
  console.log(`❌ ${message}`);
}
JS

cat > packages/forge-core/src/lib/checks.mjs <<'JS'
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
JS

cat > packages/forge-core/src/commands/doctor.mjs <<'JS'
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, fail } from "../lib/logger.mjs";
import { checkCommand, printVersion, checkDir, checkFile } from "../lib/checks.mjs";

export function doctor() {
  const paths = getForgePaths(import.meta.url);

  console.log("🔥 AIFT Forge Doctor");

  section("Paths");
  console.log(`Repo root: ${paths.repoRoot}`);
  console.log(`AIFT root: ${paths.aiftRoot}`);
  console.log(`Forge core: ${paths.forgeCoreRoot}`);

  section("Tools");
  checkCommand("git");
  checkCommand("node");
  checkCommand("npm");
  checkCommand("pnpm");

  section("Versions");
  printVersion("git");
  printVersion("node", ["-v"]);
  printVersion("npm", ["-v"]);
  printVersion("pnpm", ["-v"]);

  section("AIFT repos");
  checkDir(join(paths.aiftRoot, "AIFT-Forge"));
  checkDir(join(paths.aiftRoot, "BookSmith-Federation-OS"));
  checkDir(join(paths.aiftRoot, "booksmith-ai"));
  checkDir(join(paths.aiftRoot, "AI-Freedom-Trust"));
  checkDir(join(paths.aiftRoot, "Aether_Coin_biozonecurrency"));

  section("AIFT-Forge structure");
  checkDir(join(paths.repoRoot, "apps"));
  checkDir(join(paths.repoRoot, "packages"));
  checkDir(join(paths.repoRoot, "packages/forge-core"));
  checkDir(join(paths.repoRoot, "scripts"));
  checkDir(join(paths.repoRoot, "docs"));
  checkDir(join(paths.repoRoot, "agents"));

  section("Core files");
  checkFile(join(paths.repoRoot, "README.md"));
  checkFile(join(paths.repoRoot, "package.json"));
  checkFile(join(paths.repoRoot, "aift-forge-manifest.json"));
  checkFile(join(paths.repoRoot, "aift-root-manifest.json"));

  section("Git status");
  try {
    const status = execSync("git status --short", {
      cwd: paths.repoRoot,
      encoding: "utf8"
    }).trim();

    console.log(status || "clean");
  } catch {
    fail("Could not read git status");
  }

  ok("Forge doctor complete.");
}
JS

cat > packages/forge-core/src/cli/index.mjs <<'JS'
#!/usr/bin/env node

import { doctor } from "../commands/doctor.mjs";

const command = process.argv[2] ?? "help";

function help() {
  console.log("AIFT Forge CLI");
  console.log("");
  console.log("Usage:");
  console.log("  node packages/forge-core/src/cli/index.mjs <command>");
  console.log("");
  console.log("Commands:");
  console.log("  doctor   Check federation tools, repos, and AIFT-Forge structure");
  console.log("  help     Show this help");
}

switch (command) {
  case "doctor":
    doctor();
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    help();
    process.exit(1);
}
JS

chmod +x packages/forge-core/src/cli/index.mjs

cat > scripts/forge <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/packages/forge-core/src/cli/index.mjs" "$@"
SH

chmod +x scripts/forge

mkdir -p "$HOME/.local/bin"
ln -sf "$PWD/scripts/forge" "$HOME/.local/bin/aift-forge"

if ! echo ":$PATH:" | grep -q ":$HOME/.local/bin:"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "✅ Forge Core CLI installed."
echo ""
echo "Run:"
echo "  ./scripts/forge doctor"
echo "  aift-forge doctor"
