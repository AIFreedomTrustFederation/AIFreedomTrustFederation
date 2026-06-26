#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧠 Adding Forge backlog command"

mkdir -p packages/forge-core/src/backlog
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/backlog/items.mjs <<'JS'
export const backlogItems = [
  {
    id: "repository-generator",
    title: "Repository Generator",
    priority: 1,
    category: "generator",
    description: "Generate federation repository scaffolds with manifests, README, package metadata, and registration hooks.",
    command: "aift-forge generate command repo",
    files: [
      "packages/forge-core/src/commands/repo.mjs"
    ],
    dependsOn: [
      "command-registry",
      "workspace-scan"
    ]
  },
  {
    id: "event-generator",
    title: "Event Generator",
    priority: 1,
    category: "generator",
    description: "Generate event models for human approval events, build records, sync events, and provenance trails.",
    command: "aift-forge generate model ApprovalEvent",
    files: [
      "packages/forge-core/src/models/approval-event.mjs"
    ],
    dependsOn: [
      "model-generator"
    ]
  },
  {
    id: "store-generator",
    title: "Store Generator",
    priority: 1,
    category: "generator",
    description: "Generate local-first store modules for workspace state, cache files, and registry records.",
    command: "aift-forge generate service WorkspaceStoreService",
    files: [
      "packages/forge-core/src/services/workspace-store-service.mjs"
    ],
    dependsOn: [
      "service-generator",
      "workspace-scan"
    ]
  },
  {
    id: "api-generator",
    title: "API Generator",
    priority: 2,
    category: "generator",
    description: "Generate API route scaffolds that expose Forge Core services through forge-api and future desktop clients.",
    command: "aift-forge generate command api",
    files: [
      "packages/forge-core/src/commands/api.mjs"
    ],
    dependsOn: [
      "command-generator",
      "command-registry"
    ]
  },
  {
    id: "agent-generator",
    title: "Agent Generator",
    priority: 2,
    category: "agent",
    description: "Generate agent definition files under agents/ with role, scope, permissions, and approval boundaries.",
    command: "aift-forge generate command agent",
    files: [
      "packages/forge-core/src/commands/agent.mjs"
    ],
    dependsOn: [
      "command-generator",
      "command-registry"
    ]
  },
  {
    id: "workspace-cache",
    title: "Workspace Cache",
    priority: 2,
    category: "workspace",
    description: "Persist workspace scans into .forge/workspace.json for fast repeated federation inspection.",
    command: "aift-forge generate service WorkspaceCacheService",
    files: [
      "packages/forge-core/src/services/workspace-cache-service.mjs"
    ],
    dependsOn: [
      "workspace-scan",
      "service-generator"
    ]
  },
  {
    id: "task-engine",
    title: "Task Engine",
    priority: 3,
    category: "planning",
    description: "Load roadmap files, track task completion, recommend next work, and later support approved execution.",
    command: "aift-forge generate command task",
    files: [
      "packages/forge-core/src/commands/task.mjs"
    ],
    dependsOn: [
      "plan-command",
      "command-registry"
    ]
  },
  {
    id: "evolve-command",
    title: "Evolve Command",
    priority: 4,
    category: "planning",
    description: "Read backlog and roadmap state, propose the next architectural task, and ask for approval before generation.",
    command: "aift-forge generate command evolve",
    files: [
      "packages/forge-core/src/commands/evolve.mjs"
    ],
    dependsOn: [
      "backlog-command",
      "task-engine"
    ]
  }
];

export const completedCapabilities = [
  "workspace-discovery",
  "manifest-loader",
  "doctor-command",
  "manifest-command",
  "federation-graph",
  "command-generator",
  "service-generator",
  "model-generator",
  "package-generator",
  "workspace-scan",
  "command-registry",
  "plan-command"
];
JS

cat > packages/forge-core/src/commands/backlog.mjs <<'JS'
import { existsSync } from "node:fs";
import { join } from "node:path";
import { backlogItems, completedCapabilities } from "../backlog/items.mjs";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

function isItemComplete(repoRoot, item) {
  return item.files.every((file) => existsSync(join(repoRoot, file)));
}

function dependenciesMet(item) {
  return item.dependsOn.every((dependency) => completedCapabilities.includes(dependency));
}

function inspectBacklog(repoRoot) {
  return backlogItems.map((item) => ({
    ...item,
    complete: isItemComplete(repoRoot, item),
    ready: dependenciesMet(item)
  }));
}

function printItem(item) {
  const mark = item.complete ? "✅" : item.ready ? "⬜" : "⏳";
  console.log(`${mark} [P${item.priority}] ${item.title}`);
  console.log(`   ID: ${item.id}`);
  console.log(`   Category: ${item.category}`);
  console.log(`   Description: ${item.description}`);
  console.log(`   Command: ${item.command}`);
  if (item.dependsOn.length) {
    console.log(`   Depends on: ${item.dependsOn.join(", ")}`);
  }
  console.log("");
}

export function backlog(args = []) {
  const mode = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);
  const inspected = inspectBacklog(paths.repoRoot);

  const completed = inspected.filter((item) => item.complete);
  const open = inspected.filter((item) => !item.complete);
  const ready = open.filter((item) => item.ready);
  const blocked = open.filter((item) => !item.ready);

  console.log("🧠 Forge Development Backlog");

  if (mode === "next") {
    section("Next Recommended Task");

    const next = ready.sort((a, b) => a.priority - b.priority)[0];

    if (!next) {
      if (open.length === 0) {
        ok("Backlog complete.");
      } else {
        warn("No ready tasks. Resolve dependencies first.");
      }
      return;
    }

    printItem(next);
    return;
  }

  section("Summary");
  console.log(`Completed: ${completed.length}`);
  console.log(`Open:      ${open.length}`);
  console.log(`Ready:     ${ready.length}`);
  console.log(`Blocked:   ${blocked.length}`);

  section("Ready");
  for (const item of ready.sort((a, b) => a.priority - b.priority)) {
    printItem(item);
  }

  if (blocked.length) {
    section("Blocked");
    for (const item of blocked.sort((a, b) => a.priority - b.priority)) {
      printItem(item);
    }
  }

  section("Suggested");
  console.log("Run:");
  console.log("  aift-forge backlog next");
}
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/cli/index.mjs")
text = p.read_text()

if 'import { backlog } from "../commands/backlog.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { backlog } from "../commands/backlog.mjs";')

if 'console.log("  backlog' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  backlog   Show Forge development backlog");\n  console.log("  help'
    )

if 'case "backlog":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "backlog":\n    backlog(process.argv.slice(3));\n    break;\n  case "help":'
    )

p.write_text(text)
PY

echo "✅ Backlog command added."
echo ""
echo "Test:"
echo "  aift-forge backlog"
echo "  aift-forge backlog next"
