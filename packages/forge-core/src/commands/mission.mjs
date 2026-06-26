import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, warn } from "../lib/logger.mjs";
import {
  approveMission,
  calculateMissionProgress,
  ensureMission,
  getNextMissionTask,
  setMissionState,
  missionPath
} from "../mission/state.mjs";

function printMission(mission, paths = null) {
  if (paths) {
    section("Mission File");
    console.log(missionPath(paths.repoRoot));
  }

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
    printMission(current, paths);
    return;
  }

  if (action === "approve") {
    const approved = approveMission(paths.repoRoot);
    console.log("✅ Forge Mission Approved");
    printMission(approved, paths);
    return;
  }

  if (action === "pause") {
    const paused = setMissionState(paths.repoRoot, "paused");
    console.log("⏸️ Forge Mission Paused");
    printMission(paused, paths);
    return;
  }

  if (action === "resume") {
    const resumed = setMissionState(paths.repoRoot, "approved");
    console.log("▶️ Forge Mission Resumed");
    printMission(resumed, paths);
    return;
  }

  if (action === "cancel") {
    const cancelled = setMissionState(paths.repoRoot, "cancelled");
    console.log("🛑 Forge Mission Cancelled");
    printMission(cancelled, paths);
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
