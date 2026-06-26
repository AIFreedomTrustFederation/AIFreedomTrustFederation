import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { loadMission, saveMission, calculateMissionProgress } from "../mission/state.mjs";
import { ok, warn, fail, section } from "../lib/logger.mjs";
import { getEngineer } from "./engineers/index.mjs";
import { getBlockedTasks, selectNextTask, normalizeTaskDependencies } from "./planner.mjs";
import { EngineerExecutionEngine } from "../execution/engine.mjs";

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

  const mission = normalizeTaskDependencies(loadMission(paths.repoRoot));
  const nextTask = selectNextTask(mission);

  if (!nextTask) {
    const blocked = getBlockedTasks(mission);

    if (blocked.length) {
      section("Blocked Tasks");
      for (const task of blocked) {
        console.log(`${task.title} blocked by: ${(task.dependsOn ?? []).join(", ")}`);
      }
    }

    ok("No executable task is ready.");
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

export async function engineerStage(paths, state) {
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

  const executor = new EngineerExecutionEngine({ paths });
  const result = await executor.run({
    paths,
    mission,
    task,
    osRoot,
    webRoot
  });

  if (!result.ok) {
    warn(`Engineer execution failed for task: ${task.id}`);
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
