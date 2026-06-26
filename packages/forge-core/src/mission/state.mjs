import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { normalizeTaskDependencies, selectNextTask } from "../pipeline/planner.mjs";

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
        dependsOn: ["window-manager"],
        files: [
          "apps/web-os/components/DockManager.tsx",
          "apps/web-os/lib/dock-registry.ts"
        ]
      },
      {
        id: "app-registry",
        title: "Build App Registry",
        status: "queued",
        dependsOn: ["window-manager"],
        files: [
          "apps/web-os/lib/app-registry.ts"
        ]
      },
      {
        id: "launcher-routing",
        title: "Build Launcher Routing",
        status: "queued",
        dependsOn: ["app-registry", "dock-manager"],
        files: [
          "apps/web-os/components/LauncherRouter.tsx"
        ]
      },
      {
        id: "settings-surface",
        title: "Build Settings Surface",
        status: "queued",
        dependsOn: ["window-manager"],
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

function mergeMission(raw) {
  const base = defaultMission();

  return normalizeTaskDependencies({
    ...base,
    ...raw,
    limits: {
      ...base.limits,
      ...(raw.limits ?? {})
    },
    tasks: Array.isArray(raw.tasks) && raw.tasks.length ? raw.tasks : base.tasks,
    scope: Array.isArray(raw.scope) && raw.scope.length ? raw.scope : base.scope,
    approvals: Array.isArray(raw.approvals) ? raw.approvals : [],
    events: Array.isArray(raw.events) ? raw.events : []
  });
}

export function loadMission(repoRoot) {
  const path = missionPath(repoRoot);

  if (!existsSync(path)) {
    return defaultMission();
  }

  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return mergeMission(raw);
  } catch (error) {
    const backupPath = `${path}.corrupt-${Date.now()}`;

    try {
      writeFileSync(backupPath, readFileSync(path, "utf8"));
    } catch {
      // Best-effort backup only.
    }

    const recovered = defaultMission();
    recovered.state = "needs-review";
    recovered.corruptBackupPath = backupPath;
    recovered.events.push({
      type: "mission-json-recovered",
      backupPath,
      error: error.message,
      at: new Date().toISOString()
    });

    return recovered;
  }
}

export function saveMission(repoRoot, mission) {
  const path = missionPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });

  const next = mergeMission({
    ...mission,
    progress: calculateMissionProgress(mission),
    updatedAt: new Date().toISOString()
  });

  writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
  return next;
}

export function ensureMission(repoRoot) {
  const mission = loadMission(repoRoot);
  return saveMission(repoRoot, mission);
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
  return selectNextTask(normalizeTaskDependencies(mission));
}

export function calculateMissionProgress(mission) {
  if (!mission.tasks?.length) return 0;

  const complete = mission.tasks.filter((task) => task.status === "complete").length;
  return Math.round((complete / mission.tasks.length) * 100);
}
