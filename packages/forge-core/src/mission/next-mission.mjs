import { existsSync } from "node:fs";
import { join } from "node:path";
import { saveMission, calculateMissionProgress } from "./state.mjs";
import { missionTemplate as booksmithDesktopLayer2 } from "./templates/booksmith-desktop-next.mjs";
import { listEngineers } from "../pipeline/engineers/index.mjs";

function fileExists(root, file) {
  return existsSync(join(root, file));
}

function hydrateTemplate(template, targetRoot, engineers) {
  const available = new Set(engineers.map((engineer) => engineer.taskId));

  const tasks = template.tasks.map((task) => {
    const complete = task.files.every((file) => fileExists(targetRoot, file));

    return {
      ...task,
      status: complete ? "complete" : task.status,
      engineer: available.has(task.id) ? task.id : null
    };
  });

  const firstExecutable = tasks.find((task) => task.status !== "complete");
  if (firstExecutable && firstExecutable.status !== "ready") {
    firstExecutable.status = "ready";
  }

  return {
    ...template,
    state: "needs-review",
    progress: calculateMissionProgress({ tasks }),
    tasks,
    approvals: [],
    events: [
      {
        type: "mission-generated",
        templateId: template.id,
        at: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export async function generateNextMission(paths, targetRepository = "BookSmith-Federation-OS") {
  const targetRoot = join(paths.aiftRoot, targetRepository);
  const engineers = await listEngineers();

  const mission = hydrateTemplate(booksmithDesktopLayer2, targetRoot, engineers);

  const incomplete = mission.tasks.filter((task) => task.status !== "complete");

  if (!incomplete.length) {
    return null;
  }

  return saveMission(paths.repoRoot, mission);
}
