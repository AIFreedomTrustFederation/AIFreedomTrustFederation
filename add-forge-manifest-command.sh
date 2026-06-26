#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "📜 Adding Forge manifest command"

if [ ! -d ".git" ]; then
  echo "❌ Run from ~/Projects/AIFT/AIFT-Forge"
  exit 1
fi

mkdir -p packages/forge-core/src/lib
mkdir -p packages/forge-core/src/commands
mkdir -p packages/forge-core/src/cli

cat > packages/forge-core/src/lib/manifest.mjs <<'JS'
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function readJsonFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing manifest file: ${path}`);
  }

  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadForgeManifest(repoRoot) {
  return readJsonFile(join(repoRoot, "aift-forge-manifest.json"));
}

export function loadRootManifest(repoRoot) {
  return readJsonFile(join(repoRoot, "aift-root-manifest.json"));
}

export function loadManifestBundle(repoRoot) {
  return {
    forge: loadForgeManifest(repoRoot),
    root: loadRootManifest(repoRoot)
  };
}
JS

cat > packages/forge-core/src/commands/manifest.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { loadManifestBundle } from "../lib/manifest.mjs";
import { section, ok } from "../lib/logger.mjs";

function list(items = []) {
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

export function manifest() {
  const paths = getForgePaths(import.meta.url);
  const bundle = loadManifestBundle(paths.repoRoot);

  console.log("📜 AIFT Forge Manifest");

  section("Forge Product");
  console.log(`Name:        ${bundle.forge.name}`);
  console.log(`Product ID:  ${bundle.forge.product_id}`);
  console.log(`Schema:      ${bundle.forge.schema}`);
  console.log(`Status:      ${bundle.forge.status}`);
  console.log(`Runtime:     ${bundle.forge.runtime_source_of_truth}`);
  console.log(`Mirror mode: ${bundle.forge.public_mirror_mode}`);
  console.log(`Updated:     ${bundle.forge.updated_at}`);

  section("Description");
  console.log(bundle.forge.description);

  section("Targets");
  list(bundle.forge.targets);

  section("Required Modules");
  list(bundle.forge.required_modules);

  section("Root Federation");
  console.log(`Name:       ${bundle.root.name}`);
  console.log(`Repo ID:    ${bundle.root.repo_id}`);
  console.log(`Role:       ${bundle.root.role}`);
  console.log(`Runtime:    ${bundle.root.runtime_source_of_truth}`);
  console.log(`Mirror:     ${bundle.root.public_mirror}`);
  console.log(`Updated:    ${bundle.root.updated_at}`);

  section("Principles");
  list(bundle.root.principles);

  section("Repo Classes");
  list(bundle.root.repo_classes);

  ok("Manifest loaded.");
}
JS

cat > packages/forge-core/src/cli/index.mjs <<'JS'
#!/usr/bin/env node

import { doctor } from "../commands/doctor.mjs";
import { manifest } from "../commands/manifest.mjs";

const command = process.argv[2] ?? "help";

function help() {
  console.log("AIFT Forge CLI");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge <command>");
  console.log("");
  console.log("Commands:");
  console.log("  doctor     Check federation tools, repos, and AIFT-Forge structure");
  console.log("  manifest   Show AIFT Forge and root federation manifests");
  console.log("  help       Show this help");
}

switch (command) {
  case "doctor":
    doctor();
    break;
  case "manifest":
    manifest();
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

echo "✅ Manifest command added."
echo ""
echo "Test:"
echo "  ./scripts/forge manifest"
echo "  aift-forge manifest"
