#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧠 Teaching Forge work session"

mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/commands/work.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { loadMemory } from "../memory/state.mjs";
import { backlogItems, completedCapabilities } from "../backlog/items.mjs";
import { FEDERATION_REPOSITORIES } from "../lib/repositories.mjs";
import { section, ok, warn } from "../lib/logger.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";

function repoExists(paths, name) {
  return existsSync(join(paths.aiftRoot, name));
}

function getReadyBacklog() {
  return backlogItems.filter((item) =>
    item.dependsOn.every((dependency) => completedCapabilities.includes(dependency))
  );
}

export function work(args = []) {
  const approve = args.includes("--approve");
  const paths = getForgePaths(import.meta.url);
  const memory = loadMemory(paths.repoRoot);
  const readyBacklog = getReadyBacklog();

  console.log("🧠 Forge Engineering Session");

  section("Loading");
  ok("Memory loaded");
  ok("Workspace model loaded");
  ok("Backlog loaded");
  ok("Command registry loaded");

  section("Current Mission");
  console.log(memory.mission);

  section("Current Phase");
  console.log(memory.phase);

  section("Current Task");
  console.log(memory.currentTask.title);
  console.log(`Status: ${memory.currentTask.status}`);
  console.log(`Target: ${memory.currentTask.targetRepo}`);
  console.log(`Reason: ${memory.currentTask.reason}`);

  section("Federation Repositories");
  for (const repo of FEDERATION_REPOSITORIES) {
    console.log(`${repoExists(paths, repo.name) ? "✅" : "⚠️"} ${repo.name}`);
  }

  section("Ready Backlog");
  for (const item of readyBacklog.slice(0, 5)) {
    console.log(`□ [P${item.priority}] ${item.title}`);
  }

  section("Recommended Next Action");

  if (approve) {
    console.log("Approval mode requested.");
    console.log("Next implementation should generate the Desktop Window Manager in BookSmith Web OS.");
    console.log("");
    console.log("Planned files:");
    console.log("  BookSmith-Federation-OS/apps/web-os/components/WindowManager.tsx");
    console.log("  BookSmith-Federation-OS/apps/web-os/components/Window.tsx");
    console.log("  BookSmith-Federation-OS/apps/web-os/lib/window-registry.ts");
    ok("Work session approved for next implementation.");
    return;
  }

  console.log("Run:");
  console.log("  aift-forge work --approve");
  console.log("");
  console.log("Then build the approved task with a dedicated implementation script.");

  section("Options");
  console.log("[1] Approve next task: aift-forge work --approve");
  console.log("[2] Review memory:      aift-forge remember");
  console.log("[3] Review backlog:     aift-forge backlog");
  console.log("[4] Verify Web OS:      aift-forge verify web-os");
  console.log("[5] Dashboard:          aift-forge dashboard");

  warn("Automatic code execution is not enabled yet. This session is advisory.");
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

if 'import { work } from "../commands/work.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { work } from "../commands/work.mjs";')

if 'console.log("  work' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  work       Start a guided Forge engineering session");\n  console.log("  help'
    )

if 'case "work":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "work":\n    work(process.argv.slice(3));\n    break;\n  case "help":'
    )

cli.write_text(text)

registry = Path("packages/forge-core/src/registry/commands.mjs")
if registry.exists():
    rt = registry.read_text()
    if 'name: "work"' not in rt:
        marker = '  {\n    name: "dashboard",'
        insert = '''  {
    name: "work",
    description: "Start a guided Forge engineering session.",
    category: "orchestration",
    phase: "1",
    status: "active"
  },
'''
        rt = rt.replace(marker, insert + marker)
        registry.write_text(rt)
PY

echo "✅ Forge work session added."
echo ""
echo "Testing:"
aift-forge work
echo ""
aift-forge work --approve
