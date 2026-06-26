import { getForgePaths } from "../lib/paths.mjs";
import { loadMission } from "../mission/state.mjs";
import {
  getReadyTasks,
  getBlockedTasks,
  normalizeTaskDependencies
} from "../pipeline/planner.mjs";
import { section, ok } from "../lib/logger.mjs";

export function planDeps() {
  const paths = getForgePaths(import.meta.url);
  const mission = normalizeTaskDependencies(loadMission(paths.repoRoot));

  console.log("🧠 Forge Dependency Plan");

  section("Tasks");
  for (const task of mission.tasks) {
    const deps = task.dependsOn?.length ? task.dependsOn.join(", ") : "none";
    console.log(`${task.status === "complete" ? "✅" : "⬜"} ${task.id}`);
    console.log(`   title: ${task.title}`);
    console.log(`   status: ${task.status}`);
    console.log(`   dependsOn: ${deps}`);
  }

  section("Ready");
  const ready = getReadyTasks(mission);
  if (!ready.length) ok("No ready tasks.");
  for (const task of ready) {
    ok(task.id);
  }

  section("Blocked");
  const blocked = getBlockedTasks(mission);
  if (!blocked.length) ok("No blocked tasks.");
  for (const task of blocked) {
    console.log(`${task.id} waits for ${(task.dependsOn ?? []).join(", ")}`);
  }
}

export default planDeps;
