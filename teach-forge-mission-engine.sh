#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🛡️ Teaching Forge mission authorization engine"

mkdir -p packages/forge-core/src/mission
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/mission/state.mjs <<'JS'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function defaultMission() {
  return {
    schema: "aift.forge.mission.v1",
    id: "build-booksmith-desktop",
    title: "Build BookSmith Desktop Environment",
    authorityLevel: 2,
    state: "awaiting-approval",
    targetRepository: "BookSmith-Federation-OS",
    risk: "low",
    progress: 0,
    estimatedTasks: 12,
    estimatedFiles: 18,
    scope: [
      "Window Manager",
      "Dock Manager",
      "App Registry",
      "Launcher Routing",
      "Settings Surface",
      "Taskbar Foundation"
    ],
    limits: {
      mayCreateFiles: true,
      mayModifyExistingUi: true,
      mayModifyExistingApi: false,
      mayDeleteFiles: false,
      mayTouchOtherRepositories: false,
      mayInstallDependencies: false,
      mayCommitAutomatically: false
    },
    tasks: [
      {
        id: "window-manager",
        title: "Build Desktop Window Manager",
        status: "complete",
        files: [
          "apps/web-os/components/WindowManager.tsx",
          "apps/web-os/components/Window.tsx",
          "apps/web-os/lib/window-registry.ts"
        ]
      },
      {
        id: "dock-manager",
        title: "Build Dock Manager",
        status: "ready",
        files: [
          "apps/web-os/components/DockManager.tsx",
          "apps/web-os/lib/dock-registry.ts"
        ]
      },
      {
        id: "app-registry",
        title: "Build App Registry",
        status: "queued",
        files: [
          "apps/web-os/lib/app-registry.ts"
        ]
      },
      {
        id: "launcher-routing",
        title: "Build Launcher Routing",
        status: "queued",
        files: [
          "apps/web-os/components/LauncherRouter.tsx"
        ]
      },
      {
        id: "settings-surface",
        title: "Build Settings Surface",
        status: "queued",
        files: [
          "apps/web-os/components/SettingsSurface.tsx"
        ]
      }
    ],
    approvals: [],
    events: [],
    updatedAt: new Date().toISOString()
  };
}

export function missionPath(repoRoot) {
  return join(repoRoot, ".forge", "mission.json");
}

export function loadMission(repoRoot) {
  const path = missionPath(repoRoot);

  if (!existsSync(path)) {
    return defaultMission();
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    const recovered = defaultMission();
    recovered.state = "needs-review";
    recovered.events.push({
      type: "mission-json-recovered",
      at: new Date().toISOString()
    });
    return recovered;
  }
}

export function saveMission(repoRoot, mission) {
  const path = missionPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });

  const next = {
    ...mission,
    updatedAt: new Date().toISOString()
  };

  writeFileSync(path, JSON.stringify(next, null, 2) + "\\n");
  return next;
}

export function ensureMission(repoRoot) {
  return saveMission(repoRoot, loadMission(repoRoot));
}

export function approveMission(repoRoot) {
  const mission = loadMission(repoRoot);

  mission.state = "approved";
  mission.approvals.push({
    authorityLevel: mission.authorityLevel,
    approvedAt: new Date().toISOString(),
    approvedBy: "human-local-operator",
    scope: mission.scope
  });

  mission.events.push({
    type: "mission-approved",
    at: new Date().toISOString()
  });

  return saveMission(repoRoot, mission);
}

export function setMissionState(repoRoot, state) {
  const mission = loadMission(repoRoot);

  mission.state = state;
  mission.events.push({
    type: `mission-${state}`,
    at: new Date().toISOString()
  });

  return saveMission(repoRoot, mission);
}

export function getNextMissionTask(mission) {
  return mission.tasks.find((task) => task.status === "ready") ??
    mission.tasks.find((task) => task.status === "queued") ??
    null;
}

export function calculateMissionProgress(mission) {
  if (!mission.tasks.length) return 0;

  const complete = mission.tasks.filter((task) => task.status === "complete").length;
  return Math.round((complete / mission.tasks.length) * 100);
}
JS

cat > packages/forge-core/src/commands/mission.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, warn } from "../lib/logger.mjs";
import {
  approveMission,
  calculateMissionProgress,
  ensureMission,
  getNextMissionTask,
  setMissionState
} from "../mission/state.mjs";

function printMission(mission) {
  section("Mission");
  console.log(mission.title);
  console.log(`ID: ${mission.id}`);
  console.log(`State: ${mission.state}`);
  console.log(`Authority Level: ${mission.authorityLevel}`);
  console.log(`Target: ${mission.targetRepository}`);
  console.log(`Risk: ${mission.risk}`);
  console.log(`Progress: ${calculateMissionProgress(mission)}%`);

  section("Scope");
  for (const item of mission.scope) {
    console.log(`✓ ${item}`);
  }

  section("Limits");
  console.log(`${mission.limits.mayCreateFiles ? "✓" : "✗"} May create files`);
  console.log(`${mission.limits.mayModifyExistingUi ? "✓" : "✗"} May modify existing UI`);
  console.log(`${mission.limits.mayModifyExistingApi ? "✓" : "✗"} May modify existing API`);
  console.log(`${mission.limits.mayDeleteFiles ? "✓" : "✗"} May delete files`);
  console.log(`${mission.limits.mayTouchOtherRepositories ? "✓" : "✗"} May touch other repositories`);
  console.log(`${mission.limits.mayInstallDependencies ? "✓" : "✗"} May install dependencies`);
  console.log(`${mission.limits.mayCommitAutomatically ? "✓" : "✗"} May commit automatically`);

  section("Tasks");
  for (const task of mission.tasks) {
    const mark = task.status === "complete" ? "✅" : task.status === "ready" ? "⬜" : "⏳";
    console.log(`${mark} ${task.title} — ${task.status}`);
  }

  const next = getNextMissionTask(mission);

  section("Next Task");
  if (next) {
    console.log(next.title);
    console.log(`Status: ${next.status}`);
  } else {
    ok("No remaining mission tasks.");
  }
}

export function mission(args = []) {
  const action = args[0] ?? "show";
  const paths = getForgePaths(import.meta.url);

  if (action === "show" || action === "status") {
    const current = ensureMission(paths.repoRoot);
    console.log("🛡️ Forge Mission");
    printMission(current);
    return;
  }

  if (action === "approve") {
    const approved = approveMission(paths.repoRoot);
    console.log("✅ Forge Mission Approved");
    printMission(approved);
    return;
  }

  if (action === "pause") {
    const paused = setMissionState(paths.repoRoot, "paused");
    console.log("⏸️ Forge Mission Paused");
    printMission(paused);
    return;
  }

  if (action === "resume") {
    const resumed = setMissionState(paths.repoRoot, "approved");
    console.log("▶️ Forge Mission Resumed");
    printMission(resumed);
    return;
  }

  if (action === "cancel") {
    const cancelled = setMissionState(paths.repoRoot, "cancelled");
    console.log("🛑 Forge Mission Cancelled");
    printMission(cancelled);
    return;
  }

  warn(`Unknown mission action: ${action}`);
  console.log("Usage:");
  console.log("  aift-forge mission");
  console.log("  aift-forge mission approve");
  console.log("  aift-forge mission status");
  console.log("  aift-forge mission pause");
  console.log("  aift-forge mission resume");
  console.log("  aift-forge mission cancel");
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

if 'import { mission } from "../commands/mission.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { mission } from "../commands/mission.mjs";')

if 'console.log("  mission' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  mission    Manage Forge mission authorization");\n  console.log("  help'
    )

if 'case "mission":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "mission":\n    mission(process.argv.slice(3));\n    break;\n  case "help":'
    )

cli.write_text(text)

registry = Path("packages/forge-core/src/registry/commands.mjs")
if registry.exists():
    rt = registry.read_text()
    if 'name: "mission"' not in rt:
        marker = '  {\n    name: "cycle",'
        insert = '''  {
    name: "mission",
    description: "Manage mission-level authorization, scope, limits, and progress.",
    category: "governance",
    phase: "1",
    status: "active"
  },
'''
        rt = rt.replace(marker, insert + marker)
        registry.write_text(rt)
PY

echo "✅ Forge mission engine added."
echo ""
echo "Testing:"
aift-forge mission
echo ""
aift-forge mission approve
