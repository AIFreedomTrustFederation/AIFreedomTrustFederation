import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { defaultMission, saveMission, calculateMissionProgress } from "./state.mjs";
import { listEngineers } from "../pipeline/engineers/index.mjs";

function exists(path) {
  return existsSync(path);
}

function listFiles(root, prefix = "", max = 300) {
  const out = [];

  function walk(dir, rel) {
    if (out.length >= max || !exists(dir)) return;

    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".git" || entry === ".next") continue;

      const abs = join(dir, entry);
      const nextRel = rel ? `${rel}/${entry}` : entry;
      const stat = statSync(abs);

      if (stat.isDirectory()) walk(abs, nextRel);
      else out.push(nextRel);
    }
  }

  walk(root, prefix);
  return out;
}

export async function scanMissionCandidate(paths, targetRepository = "BookSmith-Federation-OS") {
  const targetRoot = join(paths.aiftRoot, targetRepository);
  const webRoot = join(targetRoot, "apps/web-os");

  const engineers = await listEngineers();
  const engineerTasks = new Set(engineers.map((engineer) => engineer.taskId));

  const taskSpecs = [
    {
      id: "window-manager",
      title: "Build Desktop Window Manager",
      files: [
        "apps/web-os/components/WindowManager.tsx",
        "apps/web-os/components/Window.tsx",
        "apps/web-os/lib/window-registry.ts"
      ],
      dependsOn: []
    },
    {
      id: "dock-manager",
      title: "Build Dock Manager",
      files: [
        "apps/web-os/components/DockManager.tsx",
        "apps/web-os/lib/dock-registry.ts"
      ],
      dependsOn: ["window-manager"]
    },
    {
      id: "app-registry",
      title: "Build App Registry",
      files: [
        "apps/web-os/lib/app-registry.ts"
      ],
      dependsOn: ["window-manager"]
    },
    {
      id: "launcher-routing",
      title: "Build Launcher Routing",
      files: [
        "apps/web-os/components/LauncherRouter.tsx"
      ],
      dependsOn: ["app-registry", "dock-manager"]
    },
    {
      id: "settings-surface",
      title: "Build Settings Surface",
      files: [
        "apps/web-os/components/SettingsSurface.tsx"
      ],
      dependsOn: ["window-manager"]
    }
  ];

  const tasks = taskSpecs.map((task) => {
    const complete = task.files.every((file) => exists(join(targetRoot, file)));

    return {
      ...task,
      status: complete ? "complete" : "queued",
      engineer: engineerTasks.has(task.id) ? task.id : null
    };
  });

  const firstQueued = tasks.find((task) => task.status === "queued");
  if (firstQueued) firstQueued.status = "ready";

  return {
    targetRepository,
    targetRoot,
    webRoot,
    files: listFiles(webRoot),
    tasks,
    engineers
  };
}

export async function createMissionFromScan(paths, targetRepository = "BookSmith-Federation-OS") {
  const scan = await scanMissionCandidate(paths, targetRepository);
  const base = defaultMission();

  const mission = {
    ...base,
    id: `mission-${targetRepository.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: `Continue ${targetRepository} Engineering`,
    state: "needs-review",
    authorityLevel: 2,
    targetRepository,
    risk: "low",
    tasks: scan.tasks,
    progress: calculateMissionProgress({ tasks: scan.tasks }),
    events: [
      ...(base.events ?? []),
      {
        type: "mission-created-from-scan",
        targetRepository,
        at: new Date().toISOString()
      }
    ]
  };

  return saveMission(paths.repoRoot, mission);
}
