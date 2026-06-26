import { getForgePaths } from "../lib/paths.mjs";
import { loadMission, saveMission } from "../mission/state.mjs";
import { listEngineers } from "../pipeline/engineers/index.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export async function assign() {
  const paths = getForgePaths(import.meta.url);
  const mission = loadMission(paths.repoRoot);
  const engineers = await listEngineers();
  const available = new Set(engineers.map((engineer) => engineer.taskId));

  console.log("🧠 Forge Engineer Assignment");

  let assigned = 0;

  mission.tasks = mission.tasks.map((task) => {
    if (available.has(task.id)) {
      assigned += 1;
      return {
        ...task,
        engineer: task.id
      };
    }

    return task;
  });

  saveMission(paths.repoRoot, mission);

  section("Assignments");
  for (const task of mission.tasks) {
    if (task.engineer) ok(`${task.id} -> ${task.engineer}`);
    else warn(`${task.id} has no engineer`);
  }

  section("Summary");
  console.log(`Assigned: ${assigned}`);
  console.log(`Tasks: ${mission.tasks.length}`);
}

export default assign;
