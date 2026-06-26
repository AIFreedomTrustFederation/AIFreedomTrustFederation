#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧠 Teaching Forge memory, resume, and next"

mkdir -p packages/forge-core/src/memory
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/memory/state.mjs <<'JS'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function defaultMemory() {
  return {
    schema: "aift.forge.memory.v1",
    mission: "Build BookSmith Federation OS",
    phase: "Phase 0.2 — Web OS Shell",
    lastCompleted: [
      "Forge Dashboard",
      "Progress Runner",
      "Web OS Verify",
      "Web OS Repair",
      "Web OS Build Shell"
    ],
    currentTask: {
      id: "web-os-window-manager",
      title: "Build Desktop Window Manager",
      status: "ready",
      targetRepo: "BookSmith-Federation-OS",
      reason: "The Web OS shell exists and verifies. The next OS-level capability is managing windows and app surfaces."
    },
    nextTasks: [
      {
        id: "web-os-dock-manager",
        title: "Build Dock Manager",
        status: "queued"
      },
      {
        id: "web-os-app-registry",
        title: "Build App Registry",
        status: "queued"
      },
      {
        id: "web-os-launcher",
        title: "Build Launcher Routing",
        status: "queued"
      },
      {
        id: "web-os-settings",
        title: "Build Settings Surface",
        status: "queued"
      }
    ],
    approvals: [],
    updatedAt: new Date().toISOString()
  };
}

export function memoryPath(repoRoot) {
  return join(repoRoot, ".forge", "memory.json");
}

export function loadMemory(repoRoot) {
  const path = memoryPath(repoRoot);

  if (!existsSync(path)) {
    return defaultMemory();
  }

  return JSON.parse(readFileSync(path, "utf8"));
}

export function saveMemory(repoRoot, memory) {
  const path = memoryPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });

  const next = {
    ...memory,
    updatedAt: new Date().toISOString()
  };

  writeFileSync(path, JSON.stringify(next, null, 2) + "\\n");
  return next;
}

export function ensureMemory(repoRoot) {
  const memory = loadMemory(repoRoot);
  return saveMemory(repoRoot, memory);
}

export function approveCurrentTask(repoRoot) {
  const memory = loadMemory(repoRoot);
  const task = memory.currentTask;

  memory.approvals.push({
    taskId: task.id,
    title: task.title,
    approvedAt: new Date().toISOString(),
    approvedBy: "human-local-operator"
  });

  task.status = "approved";

  return saveMemory(repoRoot, memory);
}
JS

cat > packages/forge-core/src/commands/remember.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { ensureMemory } from "../memory/state.mjs";
import { section, ok } from "../lib/logger.mjs";

export function remember() {
  const paths = getForgePaths(import.meta.url);
  const memory = ensureMemory(paths.repoRoot);

  console.log("🧠 Forge Memory");

  section("Current Mission");
  console.log(memory.mission);

  section("Current Phase");
  console.log(memory.phase);

  section("Last Completed");
  for (const item of memory.lastCompleted) {
    console.log(`✅ ${item}`);
  }

  section("Current Task");
  console.log(`${memory.currentTask.title}`);
  console.log(`Status: ${memory.currentTask.status}`);
  console.log(`Target: ${memory.currentTask.targetRepo}`);
  console.log(`Reason: ${memory.currentTask.reason}`);

  section("Next Tasks");
  for (const task of memory.nextTasks) {
    console.log(`□ ${task.title}`);
  }

  section("Memory File");
  console.log(".forge/memory.json");

  ok("Memory loaded.");
}
JS

cat > packages/forge-core/src/commands/resume.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { ensureMemory } from "../memory/state.mjs";
import { section, ok } from "../lib/logger.mjs";

export function resume() {
  const paths = getForgePaths(import.meta.url);
  const memory = ensureMemory(paths.repoRoot);

  console.log("🔁 Forge Resume");

  section("Where We Left Off");
  console.log(`Mission: ${memory.mission}`);
  console.log(`Phase:   ${memory.phase}`);

  section("Last Completed");
  for (const item of memory.lastCompleted.slice(-5)) {
    console.log(`✅ ${item}`);
  }

  section("Resume Task");
  console.log(memory.currentTask.title);
  console.log(memory.currentTask.reason);

  section("Suggested");
  console.log("Run:");
  console.log("  aift-forge next");
  console.log("  aift-forge next --approve");

  ok("Resume ready.");
}
JS

cat > packages/forge-core/src/commands/next.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { approveCurrentTask, ensureMemory, loadMemory } from "../memory/state.mjs";
import { section, ok } from "../lib/logger.mjs";

export function next(args = []) {
  const approve = args.includes("--approve");
  const paths = getForgePaths(import.meta.url);

  if (approve) {
    const memory = approveCurrentTask(paths.repoRoot);

    console.log("✅ Forge Next Approved");

    section("Approved Task");
    console.log(memory.currentTask.title);

    section("Next Manual Step");
    console.log("Build this task with a dedicated script or future Forge builder.");
    console.log("Recommended first implementation:");
    console.log("  Build WindowManager component in BookSmith-Federation-OS/apps/web-os/components");

    ok("Approval recorded in .forge/memory.json");
    return;
  }

  const memory = ensureMemory(paths.repoRoot);

  console.log("⏭️ Forge Next");

  section("Recommended Task");
  console.log(memory.currentTask.title);

  section("Why");
  console.log(memory.currentTask.reason);

  section("Target Repository");
  console.log(memory.currentTask.targetRepo);

  section("Approval");
  console.log("Run:");
  console.log("  aift-forge next --approve");

  section("Queued After This");
  for (const task of memory.nextTasks.slice(0, 4)) {
    console.log(`□ ${task.title}`);
  }
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

imports = {
    'import { remember } from "../commands/remember.mjs";': "remember",
    'import { resume } from "../commands/resume.mjs";': "resume",
    'import { next } from "../commands/next.mjs";': "next"
}

for import_line in imports:
    if import_line not in text:
        last_imports = [line for line in text.splitlines() if line.startswith("import ")]
        last = last_imports[-1]
        text = text.replace(last, last + "\n" + import_line)

help_lines = [
    ('console.log("  remember', 'console.log("  remember   Show Forge memory state");'),
    ('console.log("  resume', 'console.log("  resume     Resume from last known Forge task");'),
    ('console.log("  next', 'console.log("  next       Show or approve next Forge task");')
]

for needle, line in help_lines:
    if needle not in text:
        text = text.replace('console.log("  help', line + '\n  console.log("  help')

cases = {
    'case "remember":': '  case "remember":\n    remember();\n    break;\n',
    'case "resume":': '  case "resume":\n    resume();\n    break;\n',
    'case "next":': '  case "next":\n    next(process.argv.slice(3));\n    break;\n'
}

for needle, block in cases.items():
    if needle not in text:
        text = text.replace('  case "help":', block + '  case "help":')

cli.write_text(text)

registry = Path("packages/forge-core/src/registry/commands.mjs")
if registry.exists():
    rt = registry.read_text()
    additions = [
'''  {
    name: "remember",
    description: "Show Forge memory state and current mission.",
    category: "memory",
    phase: "1",
    status: "active"
  },
''',
'''  {
    name: "resume",
    description: "Resume from the last known Forge task.",
    category: "memory",
    phase: "1",
    status: "active"
  },
''',
'''  {
    name: "next",
    description: "Show or approve the next Forge task.",
    category: "planning",
    phase: "1",
    status: "active"
  },
'''
    ]

    marker = "  {\n    name: \"dashboard\","
    for add in additions:
        name = add.split('name: "')[1].split('"')[0]
        if f'name: "{name}"' not in rt:
            rt = rt.replace(marker, add + marker)
    registry.write_text(rt)
PY

echo "✅ Forge memory system added."
echo ""
echo "Testing:"
aift-forge remember
echo ""
aift-forge resume
echo ""
aift-forge next
