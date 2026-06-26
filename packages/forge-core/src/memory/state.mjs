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

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const backupPath = `${path}.corrupt-${Date.now()}`;
    try {
      writeFileSync(backupPath, readFileSync(path, "utf8"));
    } catch {
      // Best-effort backup only.
    }

    const repaired = defaultMemory();
    repaired.recoveredFromCorruption = true;
    repaired.corruptBackupPath = backupPath;
    return repaired;
  }
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
