#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "📊 Teaching Forge dashboard"

mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/commands/dashboard.mjs <<'JS'
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getForgePaths } from "../lib/paths.mjs";
import { FEDERATION_REPOSITORIES } from "../lib/repositories.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

function gitStatus(repoPath) {
  try {
    const branch = execSync("git branch --show-current", {
      cwd: repoPath,
      encoding: "utf8"
    }).trim();

    const status = execSync("git status --short", {
      cwd: repoPath,
      encoding: "utf8"
    }).trim();

    return {
      branch: branch || "unknown",
      clean: status.length === 0,
      changes: status ? status.split("\n").length : 0
    };
  } catch {
    return {
      branch: "unknown",
      clean: false,
      changes: -1
    };
  }
}

function scoreRepo(repoPath) {
  let score = 0;
  const checks = [
    "README.md",
    "package.json",
    ".git"
  ];

  for (const check of checks) {
    if (existsSync(join(repoPath, check))) score += 20;
  }

  if (
    existsSync(join(repoPath, "aift-manifest.json")) ||
    existsSync(join(repoPath, "aift-forge-manifest.json")) ||
    existsSync(join(repoPath, "aift-root-manifest.json")) ||
    existsSync(join(repoPath, "federation.config.json"))
  ) {
    score += 25;
  }

  if (existsSync(join(repoPath, "docs"))) score += 15;

  return Math.min(score, 100);
}

function bar(score) {
  const blocks = Math.round(score / 10);
  return "█".repeat(blocks) + "░".repeat(10 - blocks);
}

export function dashboard() {
  const paths = getForgePaths(import.meta.url);

  console.log("📊 AIFT Federation Dashboard");

  section("Root");
  console.log(paths.aiftRoot);

  section("Repositories");

  const reports = FEDERATION_REPOSITORIES.map((repo) => {
    const repoPath = join(paths.aiftRoot, repo.name);
    const exists = existsSync(repoPath);
    const git = exists ? gitStatus(repoPath) : null;
    const health = exists ? scoreRepo(repoPath) : 0;

    return {
      ...repo,
      path: repoPath,
      exists,
      git,
      health
    };
  });

  for (const report of reports) {
    const icon = report.health >= 90 ? "🟢" : report.health >= 70 ? "🟡" : "🔴";

    console.log(`${icon} ${report.name}`);
    console.log(`   Role:   ${report.role}`);
    console.log(`   Health: ${bar(report.health)} ${report.health}%`);

    if (!report.exists) {
      console.log(`   Status: missing`);
      console.log("");
      continue;
    }

    console.log(`   Branch: ${report.git.branch}`);
    console.log(`   Git:    ${report.git.clean ? "clean" : `${report.git.changes} change(s)`}`);
    console.log("");
  }

  section("Overall Health");

  const total = reports.reduce((sum, report) => sum + report.health, 0);
  const average = Math.round(total / reports.length);

  console.log(`${bar(average)} ${average}%`);

  if (average >= 90) {
    ok("Federation health is strong.");
  } else if (average >= 70) {
    warn("Federation health is usable but needs cleanup.");
  } else {
    warn("Federation health needs attention.");
  }
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

if 'import { dashboard } from "../commands/dashboard.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { dashboard } from "../commands/dashboard.mjs";')

if 'console.log("  dashboard' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  dashboard  Show federation health dashboard");\n  console.log("  help'
    )

if 'case "dashboard":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "dashboard":\n    dashboard();\n    break;\n  case "help":'
    )

cli.write_text(text)

registry = Path("packages/forge-core/src/registry/commands.mjs")
if registry.exists():
    rt = registry.read_text()
    if 'name: "dashboard"' not in rt:
        marker = "  {\n    name: \"doctor\","
        insert = '''  {
    name: "dashboard",
    description: "Show a federation-wide health dashboard.",
    category: "federation",
    phase: "1",
    status: "active"
  },
'''
        rt = rt.replace(marker, insert + marker)
        registry.write_text(rt)
PY

echo "✅ Dashboard command added."
echo ""
echo "Testing:"
aift-forge dashboard
