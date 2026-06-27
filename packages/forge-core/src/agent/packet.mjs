import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadMission, getNextMissionTask } from "../mission/state.mjs";
import { getForgePaths } from "../lib/paths.mjs";
import { chooseAgentBackend } from "./capabilities.mjs";

function readMaybe(path) {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function inferCapabilities(task) {
  const caps = ["typescript", "local-first"];

  if ((task.files ?? []).some((file) => file.endsWith(".tsx"))) {
    caps.push("react", "tsx");
  }

  if (task.source === "todo") {
    caps.push("todo-resolution");
  }

  if (task.source === "missing-import") {
    caps.push("repo-discovery");
  }

  return caps;
}

export function createAgentPacket() {
  const paths = getForgePaths(import.meta.url);
  const mission = loadMission(paths.repoRoot);
  const task = getNextMissionTask(mission);

  if (!task) {
    return null;
  }

  const targetRoot = join(paths.aiftRoot, mission.targetRepository);
  const requiredCapabilities = inferCapabilities(task);
  const backend = chooseAgentBackend(requiredCapabilities);

  const contextFiles = {};
  for (const file of task.files ?? []) {
    contextFiles[file] = readMaybe(join(targetRoot, file));
  }

  const packet = {
    schema: "aift.forge.agent-task.v2",
    createdAt: new Date().toISOString(),
    backend: backend ? {
      id: backend.id,
      label: backend.label,
      mode: backend.mode,
      capabilities: backend.capabilities
    } : null,
    requiredCapabilities,
    mission: {
      id: mission.id,
      title: mission.title,
      targetRepository: mission.targetRepository,
      authorityLevel: mission.authorityLevel,
      limits: mission.limits
    },
    task,
    contextFiles,
    acceptanceCriteria: [
      "Do not delete files.",
      "Do not install dependencies.",
      "Do not commit or push.",
      "Only modify files inside the target repository.",
      "Return a unified diff or exact file writes.",
      "Preserve local-first, inspectable, sovereign AIFT architecture.",
      "TypeScript should remain valid.",
      "Generated code should be readable and minimal."
    ],
    outputContract: {
      preferred: "unified-diff",
      accepted: [
        "unified-diff",
        "exact-file-writes"
      ],
      patchInbox: ".forge/agent-patches/"
    }
  };

  const dir = join(paths.repoRoot, ".forge", "agent-tasks");
  mkdirSync(dir, { recursive: true });

  const safeId = task.id.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const file = join(dir, `${safeId}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(packet, null, 2) + "\n");

  return { file, packet };
}
