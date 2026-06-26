#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🌐 Adding Forge workspace command"

mkdir -p packages/forge-core/src/services
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/services/workspace-service.mjs <<'JS'
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function readDirs(path) {
  if (!existsSync(path)) return [];

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function exists(path) {
  return existsSync(path);
}

export class WorkspaceService {
  constructor(context = {}) {
    this.context = context;
    this.aiftRoot = context.aiftRoot;
  }

  scanRepository(repoName) {
    const repoPath = join(this.aiftRoot, repoName);

    return {
      name: repoName,
      path: repoPath,
      exists: exists(repoPath),
      git: exists(join(repoPath, ".git")),
      readme: exists(join(repoPath, "README.md")),
      packageJson: exists(join(repoPath, "package.json")),
      apps: readDirs(join(repoPath, "apps")),
      packages: readDirs(join(repoPath, "packages")),
      agents: readDirs(join(repoPath, "agents")),
      docs: exists(join(repoPath, "docs"))
    };
  }

  scan(repoNames = []) {
    return {
      root: this.aiftRoot,
      repositories: repoNames.map((name) => this.scanRepository(name))
    };
  }
}

export function createWorkspaceService(context = {}) {
  return new WorkspaceService(context);
}
JS

cat > packages/forge-core/src/commands/workspace.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { FEDERATION_REPOSITORIES } from "../lib/repositories.mjs";
import { createWorkspaceService } from "../services/workspace-service.mjs";
import { section, ok } from "../lib/logger.mjs";

function printRepository(repo) {
  const mark = repo.exists ? "✅" : "⚠️";

  console.log(`${mark} ${repo.name}`);
  console.log(`   Path: ${repo.path}`);
  console.log(`   Git: ${repo.git ? "yes" : "no"}`);
  console.log(`   README: ${repo.readme ? "yes" : "no"}`);
  console.log(`   package.json: ${repo.packageJson ? "yes" : "no"}`);

  if (repo.apps.length) {
    console.log(`   Apps: ${repo.apps.join(", ")}`);
  }

  if (repo.packages.length) {
    console.log(`   Packages: ${repo.packages.join(", ")}`);
  }

  if (repo.agents.length) {
    console.log(`   Agents: ${repo.agents.join(", ")}`);
  }

  console.log(`   Docs: ${repo.docs ? "yes" : "no"}`);
  console.log("");
}

export function workspace(args = []) {
  const subcommand = args[0] ?? "scan";
  const paths = getForgePaths(import.meta.url);
  const service = createWorkspaceService({ aiftRoot: paths.aiftRoot });
  const repoNames = FEDERATION_REPOSITORIES.map((repo) => repo.name);

  if (subcommand !== "scan" && subcommand !== "list") {
    console.log("Usage:");
    console.log("  aift-forge workspace scan");
    console.log("  aift-forge workspace list");
    process.exit(1);
  }

  const result = service.scan(repoNames);

  console.log("🌐 AIFT Workspace");

  section("Root");
  console.log(result.root);

  section("Repositories");

  for (const repo of result.repositories) {
    if (subcommand === "list") {
      console.log(`${repo.exists ? "✅" : "⚠️"} ${repo.name}`);
    } else {
      printRepository(repo);
    }
  }

  ok("Workspace scan complete.");
}
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/cli/index.mjs")
text = p.read_text()

if 'import { workspace } from "../commands/workspace.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { workspace } from "../commands/workspace.mjs";')

if 'console.log("  workspace' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  workspace  Scan or list the local federation workspace");\n  console.log("  help'
    )

if 'case "workspace":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "workspace":\n    workspace(process.argv.slice(3));\n    break;\n  case "help":'
    )

p.write_text(text)
PY

echo "✅ Workspace command added."
echo ""
echo "Test:"
echo "  aift-forge workspace scan"
echo "  aift-forge workspace list"
