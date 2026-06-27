import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadMission, getNextMissionTask } from "../mission/state.mjs";
import { getForgePaths } from "../lib/paths.mjs";

export function createAgentPacket() {
  const paths = getForgePaths(import.meta.url);
  const mission = loadMission(paths.repoRoot);
  const task = getNextMissionTask(mission);

  if (!task) {
    return null;
  }

  const packet = {
    schema: "aift.forge.agent-task.v1",
    createdAt: new Date().toISOString(),
    mission: {
      id: mission.id,
      title: mission.title,
      targetRepository: mission.targetRepository,
      authorityLevel: mission.authorityLevel,
      limits: mission.limits
    },
    task,
    instructions: [
      "Do not delete files.",
      "Do not install dependencies.",
      "Do not commit or push.",
      "Only modify files inside the target repository.",
      "Return a unified diff or exact file writes.",
      "Preserve local-first, inspectable, sovereign AIFT architecture."
    ]
  };

  const dir = join(paths.repoRoot, ".forge", "agent-tasks");
  mkdirSync(dir, { recursive: true });

  const file = join(dir, `${task.id}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(packet, null, 2) + "\n");

  return { file, packet };
}
