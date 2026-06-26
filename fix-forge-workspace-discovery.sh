#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧭 Installing Forge workspace discovery fix"

if [ ! -d ".git" ]; then
  echo "❌ Run from ~/Projects/AIFT/AIFT-Forge"
  exit 1
fi

mkdir -p packages/forge-core/src/lib
mkdir -p packages/forge-core/src/commands
mkdir -p packages/forge-core/src/cli

cat > packages/forge-core/src/lib/workspace.mjs <<'JS'
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function fileFromImportMeta(importMetaUrl) {
  return fileURLToPath(importMetaUrl);
}

export function findUp(startDir, markerNames) {
  let current = resolve(startDir);

  while (true) {
    for (const marker of markerNames) {
      const candidate = resolve(current, marker);

      if (existsSync(candidate)) {
        return current;
      }
    }

    const parent = dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function findForgeRepoRoot(startDir) {
  return findUp(startDir, [
    "aift-forge-manifest.json",
    "AIFT_REPO_SYSTEM.md",
    ".git"
  ]);
}

export function getForgeWorkspace(importMetaUrl) {
  const file = fileFromImportMeta(importMetaUrl);
  const startDir = dirname(file);
  const repoRoot = findForgeRepoRoot(startDir);

  if (!repoRoot) {
    throw new Error(`Could not find AIFT-Forge repo root from ${startDir}`);
  }

  const aiftRoot = dirname(repoRoot);

  return {
    file,
    startDir,
    repoRoot,
    aiftRoot,
    forgeCoreRoot: resolve(repoRoot, "packages/forge-core")
  };
}
JS

cat > packages/forge-core/src/lib/paths.mjs <<'JS'
import { getForgeWorkspace } from "./workspace.mjs";

export function getForgePaths(importMetaUrl = import.meta.url) {
  return getForgeWorkspace(importMetaUrl);
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

chmod +x scripts/forge

echo "✅ Workspace discovery fix installed."
echo ""
echo "Test now with:"
echo "  ./scripts/forge doctor"
echo "  aift-forge doctor"
