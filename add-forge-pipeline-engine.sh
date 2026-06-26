#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🏗️ Adding Forge engineering pipeline"

mkdir -p packages/forge-core/src/pipeline
mkdir -p packages/forge-core/src/commands
mkdir -p .forge/history

cat > packages/forge-core/src/pipeline/stages.mjs <<'JS'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { loadMission, saveMission, calculateMissionProgress } from "../mission/state.mjs";
import { ok, warn, fail, section } from "../lib/logger.mjs";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeFileOnce(path, content) {
  if (existsSync(path)) {
    warn(`exists ${path}`);
    return false;
  }

  ensureDir(dirname(path));
  writeFileSync(path, content);
  ok(`write ${path}`);
  return true;
}

function gitStatus(repoPath) {
  try {
    return execSync("git status --short", { cwd: repoPath, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function appendHistory(repoRoot, event) {
  const dir = join(repoRoot, ".forge", "history");
  ensureDir(dir);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(dir, `${stamp}.json`);

  writeFileSync(path, JSON.stringify(event, null, 2) + "\n");
  return path;
}

export function planStage(paths) {
  section("Planner");

  const mission = loadMission(paths.repoRoot);
  const nextTask =
    mission.tasks.find((task) => task.status === "ready") ??
    mission.tasks.find((task) => task.status === "queued") ??
    null;

  if (!nextTask) {
    ok("No remaining task.");
    return { mission, task: null };
  }

  console.log(`Mission: ${mission.title}`);
  console.log(`Task: ${nextTask.title}`);
  console.log(`Authority: ${mission.authorityLevel}`);
  console.log(`Target: ${mission.targetRepository}`);
  console.log("");

  console.log("Will:");
  console.log(`${mission.limits.mayCreateFiles ? "✓" : "✗"} Create files`);
  console.log(`${mission.limits.mayModifyExistingUi ? "✓" : "✗"} Modify UI`);
  console.log(`${mission.limits.mayModifyExistingApi ? "✓" : "✗"} Modify API`);
  console.log(`${mission.limits.mayDeleteFiles ? "✓" : "✗"} Delete files`);
  console.log(`${mission.limits.mayTouchOtherRepositories ? "✓" : "✗"} Touch other repositories`);
  console.log(`${mission.limits.mayCommitAutomatically ? "✓" : "✗"} Commit automatically`);

  return { mission, task: nextTask };
}

export function engineerStage(paths, state) {
  section("Engineer");

  const { mission, task } = state;

  if (!task) return state;

  if (mission.state !== "approved") {
    fail(`Mission is not approved: ${mission.state}`);
    return { ...state, blocked: true };
  }

  if (mission.authorityLevel < 2) {
    fail("Authority level too low for engineering.");
    return { ...state, blocked: true };
  }

  if (mission.limits.mayDeleteFiles) {
    fail("Refusing mission because delete permission is enabled.");
    return { ...state, blocked: true };
  }

  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  const webRoot = join(osRoot, "apps/web-os");

  if (task.id === "dock-manager") {
    writeFileOnce(
      join(webRoot, "lib/dock-registry.ts"),
      `export type DockItem = {
  id: string;
  label: string;
  icon: string;
  targetWindow: string;
  status: "active" | "planned";
};

export const dockRegistry: DockItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", targetWindow: "dashboard", status: "active" },
  { id: "booksmith", label: "BookSmith", icon: "📚", targetWindow: "booksmith", status: "planned" },
  { id: "ai-studio", label: "AI", icon: "🤖", targetWindow: "ai-studio", status: "planned" },
  { id: "federation", label: "Federation", icon: "🌐", targetWindow: "federation-hub", status: "planned" }
];
`
    );

    writeFileOnce(
      join(webRoot, "components/DockManager.tsx"),
      `import { dockRegistry } from "../lib/dock-registry";

export function DockManager() {
  return (
    <nav className="panel dock" aria-label="BookSmith Federation OS dock manager">
      {dockRegistry.map((item) => (
        <button key={item.id} title={item.targetWindow}>
          <span aria-hidden="true">{item.icon}</span> {item.label}
        </button>
      ))}
    </nav>
  );
}
`
    );
  } else {
    warn(`No engineer handler yet for task: ${task.id}`);
    return { ...state, blocked: true };
  }

  return { ...state, engineered: true };
}

export function verifierStage(paths, state) {
  section("Verifier");

  const { mission, task } = state;
  if (!task || state.blocked) return state;

  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  let failed = 0;

  for (const file of task.files) {
    const path = join(osRoot, file);
    if (existsSync(path)) ok(file);
    else {
      fail(file);
      failed += 1;
    }
  }

  return { ...state, verified: failed === 0 };
}

export function reviewerStage(paths, state) {
  section("Reviewer");

  const { mission } = state;
  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  const status = gitStatus(osRoot);

  if (!status) {
    ok("No working tree changes detected.");
  } else {
    console.log(status);
  }

  return { ...state, review: status };
}

export function memoryStage(paths, state) {
  section("Memory");

  const { mission, task } = state;
  if (!task || !state.verified) return state;

  mission.tasks = mission.tasks.map((item) =>
    item.id === task.id ? { ...item, status: "complete" } : item
  );

  const next = mission.tasks.find((item) => item.status === "queued");
  if (next) next.status = "ready";

  mission.progress = calculateMissionProgress(mission);
  mission.events.push({
    type: "pipeline-task-complete",
    taskId: task.id,
    title: task.title,
    at: new Date().toISOString()
  });

  saveMission(paths.repoRoot, mission);

  const historyPath = appendHistory(paths.repoRoot, {
    type: "pipeline-run",
    missionId: mission.id,
    taskId: task.id,
    taskTitle: task.title,
    verified: state.verified,
    review: state.review,
    at: new Date().toISOString()
  });

  ok(`history ${historyPath}`);
  ok(`mission progress ${mission.progress}%`);

  return { ...state, remembered: true };
}

export function publisherStage(paths, state, options = {}) {
  section("Publisher");

  if (!options.publish) {
    warn("Publishing not requested. No commit or push performed.");
    console.log("Use:");
    console.log("  aift-forge pipeline run --publish");
    return state;
  }

  warn("Publish mode requested, but automatic publishing remains disabled by governance.");
  return state;
}
JS

cat > packages/forge-core/src/pipeline/engine.mjs <<'JS'
import {
  planStage,
  engineerStage,
  verifierStage,
  reviewerStage,
  memoryStage,
  publisherStage
} from "./stages.mjs";
import { ok, section } from "../lib/logger.mjs";

export class PipelineEngine {
  constructor(context = {}) {
    this.paths = context.paths;
  }

  run(options = {}) {
    console.log("🏗️ Forge Engineering Pipeline");

    let state = planStage(this.paths);

    if (!state.task) {
      section("Result");
      ok("Pipeline complete. No task selected.");
      return;
    }

    state = engineerStage(this.paths, state);
    state = verifierStage(this.paths, state);
    state = reviewerStage(this.paths, state);
    state = memoryStage(this.paths, state);
    state = publisherStage(this.paths, state, options);

    section("Result");

    if (state.blocked) {
      console.log("Pipeline stopped at governance or implementation boundary.");
      return;
    }

    if (state.verified) {
      ok("Pipeline completed successfully.");
      console.log("");
      console.log("Next:");
      console.log("  cd ~/Projects/AIFT/BookSmith-Federation-OS");
      console.log("  git status");
      console.log("  npm --prefix apps/web-os run typecheck");
      return;
    }

    console.log("Pipeline finished, but verification did not pass.");
  }
}
JS

cat > packages/forge-core/src/commands/pipeline.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { PipelineEngine } from "../pipeline/engine.mjs";

export function pipeline(args = []) {
  const action = args[0] ?? "status";
  const publish = args.includes("--publish");
  const paths = getForgePaths(import.meta.url);
  const engine = new PipelineEngine({ paths });

  if (action === "run") {
    engine.run({ publish });
    return;
  }

  console.log("Forge Engineering Pipeline");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge pipeline run");
  console.log("  aift-forge pipeline run --publish");
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

if 'import { pipeline } from "../commands/pipeline.mjs";' not in text:
    last = [line for line in text.splitlines() if line.startswith("import ")][-1]
    text = text.replace(last, last + '\nimport { pipeline } from "../commands/pipeline.mjs";')

if 'console.log("  pipeline' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  pipeline   Run Forge engineering pipeline");\n  console.log("  help'
    )

if 'case "pipeline":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "pipeline":\n    pipeline(process.argv.slice(3));
cd ~/Projects/AIFT/AIFT-Forge

cat > add-forge-pipeline-engine.sh <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🏗️ Adding Forge engineering pipeline"

mkdir -p packages/forge-core/src/pipeline
mkdir -p packages/forge-core/src/commands
mkdir -p .forge/history

cat > packages/forge-core/src/pipeline/stages.mjs <<'JS'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { loadMission, saveMission, calculateMissionProgress } from "../mission/state.mjs";
import { ok, warn, fail, section } from "../lib/logger.mjs";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeFileOnce(path, content) {
  if (existsSync(path)) {
    warn(`exists ${path}`);
    return false;
  }

  ensureDir(dirname(path));
  writeFileSync(path, content);
  ok(`write ${path}`);
  return true;
}

function gitStatus(repoPath) {
  try {
    return execSync("git status --short", { cwd: repoPath, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function appendHistory(repoRoot, event) {
  const dir = join(repoRoot, ".forge", "history");
  ensureDir(dir);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(dir, `${stamp}.json`);

  writeFileSync(path, JSON.stringify(event, null, 2) + "\n");
  return path;
}

export function planStage(paths) {
  section("Planner");

  const mission = loadMission(paths.repoRoot);
  const nextTask =
    mission.tasks.find((task) => task.status === "ready") ??
    mission.tasks.find((task) => task.status === "queued") ??
    null;

  if (!nextTask) {
    ok("No remaining task.");
    return { mission, task: null };
  }

  console.log(`Mission: ${mission.title}`);
  console.log(`Task: ${nextTask.title}`);
  console.log(`Authority: ${mission.authorityLevel}`);
  console.log(`Target: ${mission.targetRepository}`);
  console.log("");

  console.log("Will:");
  console.log(`${mission.limits.mayCreateFiles ? "✓" : "✗"} Create files`);
  console.log(`${mission.limits.mayModifyExistingUi ? "✓" : "✗"} Modify UI`);
  console.log(`${mission.limits.mayModifyExistingApi ? "✓" : "✗"} Modify API`);
  console.log(`${mission.limits.mayDeleteFiles ? "✓" : "✗"} Delete files`);
  console.log(`${mission.limits.mayTouchOtherRepositories ? "✓" : "✗"} Touch other repositories`);
  console.log(`${mission.limits.mayCommitAutomatically ? "✓" : "✗"} Commit automatically`);

  return { mission, task: nextTask };
}

export function engineerStage(paths, state) {
  section("Engineer");

  const { mission, task } = state;

  if (!task) return state;

  if (mission.state !== "approved") {
    fail(`Mission is not approved: ${mission.state}`);
    return { ...state, blocked: true };
  }

  if (mission.authorityLevel < 2) {
    fail("Authority level too low for engineering.");
    return { ...state, blocked: true };
  }

  if (mission.limits.mayDeleteFiles) {
    fail("Refusing mission because delete permission is enabled.");
    return { ...state, blocked: true };
  }

  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  const webRoot = join(osRoot, "apps/web-os");

  if (task.id === "dock-manager") {
    writeFileOnce(
      join(webRoot, "lib/dock-registry.ts"),
      `export type DockItem = {
  id: string;
  label: string;
  icon: string;
  targetWindow: string;
  status: "active" | "planned";
};

export const dockRegistry: DockItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", targetWindow: "dashboard", status: "active" },
  { id: "booksmith", label: "BookSmith", icon: "📚", targetWindow: "booksmith", status: "planned" },
  { id: "ai-studio", label: "AI", icon: "🤖", targetWindow: "ai-studio", status: "planned" },
  { id: "federation", label: "Federation", icon: "🌐", targetWindow: "federation-hub", status: "planned" }
];
`
    );

    writeFileOnce(
      join(webRoot, "components/DockManager.tsx"),
      `import { dockRegistry } from "../lib/dock-registry";

export function DockManager() {
  return (
    <nav className="panel dock" aria-label="BookSmith Federation OS dock manager">
      {dockRegistry.map((item) => (
        <button key={item.id} title={item.targetWindow}>
          <span aria-hidden="true">{item.icon}</span> {item.label}
        </button>
      ))}
    </nav>
  );
}
`
    );
  } else {
    warn(`No engineer handler yet for task: ${task.id}`);
    return { ...state, blocked: true };
  }

  return { ...state, engineered: true };
}

export function verifierStage(paths, state) {
  section("Verifier");

  const { mission, task } = state;
  if (!task || state.blocked) return state;

  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  let failed = 0;

  for (const file of task.files) {
    const path = join(osRoot, file);
    if (existsSync(path)) ok(file);
    else {
      fail(file);
      failed += 1;
    }
  }

  return { ...state, verified: failed === 0 };
}

export function reviewerStage(paths, state) {
  section("Reviewer");

  const { mission } = state;
  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  const status = gitStatus(osRoot);

  if (!status) {
    ok("No working tree changes detected.");
  } else {
    console.log(status);
  }

  return { ...state, review: status };
}

export function memoryStage(paths, state) {
  section("Memory");

  const { mission, task } = state;
  if (!task || !state.verified) return state;

  mission.tasks = mission.tasks.map((item) =>
    item.id === task.id ? { ...item, status: "complete" } : item
  );

  const next = mission.tasks.find((item) => item.status === "queued");
  if (next) next.status = "ready";

  mission.progress = calculateMissionProgress(mission);
  mission.events.push({
    type: "pipeline-task-complete",
    taskId: task.id,
    title: task.title,
    at: new Date().toISOString()
  });

  saveMission(paths.repoRoot, mission);

  const historyPath = appendHistory(paths.repoRoot, {
    type: "pipeline-run",
    missionId: mission.id,
    taskId: task.id,
    taskTitle: task.title,
    verified: state.verified,
    review: state.review,
    at: new Date().toISOString()
  });

  ok(`history ${historyPath}`);
  ok(`mission progress ${mission.progress}%`);

  return { ...state, remembered: true };
}

export function publisherStage(paths, state, options = {}) {
  section("Publisher");

  if (!options.publish) {
    warn("Publishing not requested. No commit or push performed.");
    console.log("Use:");
    console.log("  aift-forge pipeline run --publish");
    return state;
  }

  warn("Publish mode requested, but automatic publishing remains disabled by governance.");
  return state;
}
JS

cat > packages/forge-core/src/pipeline/engine.mjs <<'JS'
import {
  planStage,
  engineerStage,
  verifierStage,
  reviewerStage,
  memoryStage,
  publisherStage
} from "./stages.mjs";
import { ok, section } from "../lib/logger.mjs";

export class PipelineEngine {
  constructor(context = {}) {
    this.paths = context.paths;
  }

  run(options = {}) {
    console.log("🏗️ Forge Engineering Pipeline");

    let state = planStage(this.paths);

    if (!state.task) {
      section("Result");
      ok("Pipeline complete. No task selected.");
      return;
    }

    state = engineerStage(this.paths, state);
    state = verifierStage(this.paths, state);
    state = reviewerStage(this.paths, state);
    state = memoryStage(this.paths, state);
    state = publisherStage(this.paths, state, options);

    section("Result");

    if (state.blocked) {
      console.log("Pipeline stopped at governance or implementation boundary.");
      return;
    }

    if (state.verified) {
      ok("Pipeline completed successfully.");
      console.log("");
      console.log("Next:");
      console.log("  cd ~/Projects/AIFT/BookSmith-Federation-OS");
      console.log("  git status");
      console.log("  npm --prefix apps/web-os run typecheck");
      return;
    }

    console.log("Pipeline finished, but verification did not pass.");
  }
}
JS

cat > packages/forge-core/src/commands/pipeline.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { PipelineEngine } from "../pipeline/engine.mjs";

export function pipeline(args = []) {
  const action = args[0] ?? "status";
  const publish = args.includes("--publish");
  const paths = getForgePaths(import.meta.url);
  const engine = new PipelineEngine({ paths });

  if (action === "run") {
    engine.run({ publish });
    return;
  }

  console.log("Forge Engineering Pipeline");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge pipeline run");
  console.log("  aift-forge pipeline run --publish");
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

if 'import { pipeline } from "../commands/pipeline.mjs";' not in text:
    last = [line for line in text.splitlines() if line.startswith("import ")][-1]
    text = text.replace(last, last + '\nimport { pipeline } from "../commands/pipeline.mjs";')

if 'console.log("  pipeline' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  pipeline   Run Forge engineering pipeline");\n  console.log("  help'
    )

if 'case "pipeline":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "pipeline":\n    pipeline(process.argv.slice(3));\n    break;\n  case "help":'
    )

cli.write_text(text)

registry = Path("packages/forge-core/src/registry/commands.mjs")
if registry.exists():
    rt = registry.read_text()
    if 'name: "pipeline"' not in rt:
        insert = '''  {
    name: "pipeline",
    description: "Run the mission-aware Forge engineering pipeline.",
    category: "orchestration",
    phase: "1",
    status: "active"
  },
'''
        rt = rt.replace("];", insert + "];")
        registry.write_text(rt)
PY

echo "✅ Forge pipeline engine added."
echo ""
echo "Test:"
aift-forge pipeline
