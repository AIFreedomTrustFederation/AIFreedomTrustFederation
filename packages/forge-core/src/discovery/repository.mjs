import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { listEngineers } from "../pipeline/engineers/index.mjs";

const ignored = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage"
]);

function exists(path) {
  return existsSync(path);
}

function walk(root, options = {}) {
  const maxFiles = options.maxFiles ?? 800;
  const out = [];

  function scan(dir) {
    if (out.length >= maxFiles || !exists(dir)) return;

    for (const entry of readdirSync(dir)) {
      if (ignored.has(entry)) continue;

      const abs = join(dir, entry);
      const stat = statSync(abs);

      if (stat.isDirectory()) {
        scan(abs);
      } else {
        out.push(relative(root, abs));
      }
    }
  }

  scan(root);
  return out.sort();
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function classify(files) {
  return {
    hasNextApp: files.some((f) => f.startsWith("apps/web-os/app/")),
    hasComponents: files.some((f) => f.includes("/components/")),
    hasLib: files.some((f) => f.includes("/lib/")),
    hasApi: files.some((f) => f.includes("/api/")),
    hasRoadmap: files.some((f) => f.startsWith("docs/roadmaps/")),
    hasPackageJson: files.includes("package.json") || files.some((f) => f.endsWith("/package.json"))
  };
}

function featureTask(id, title, files, dependsOn = []) {
  return {
    id,
    title,
    status: "queued",
    dependsOn,
    files
  };
}

export async function discoverRepository(paths, targetRepository = "BookSmith-Federation-OS") {
  const root = join(paths.aiftRoot, targetRepository);
  const files = walk(root);
  const facts = classify(files);
  const engineers = await listEngineers();
  const available = new Set(engineers.map((e) => e.taskId));

  const packageJson = readJson(join(root, "package.json"));

  const candidates = [
    featureTask("terminal-surface", "Build Terminal Surface", [
      "apps/web-os/components/TerminalSurface.tsx",
      "apps/web-os/lib/terminal-commands.ts"
    ], ["file-explorer"]),

    featureTask("search-palette", "Build Search Palette", [
      "apps/web-os/components/SearchPalette.tsx",
      "apps/web-os/lib/search-index.ts"
    ], ["terminal-surface"]),

    featureTask("status-bar", "Build Status Bar", [
      "apps/web-os/components/StatusBar.tsx",
      "apps/web-os/lib/status-registry.ts"
    ], ["search-palette"])
  ];

  const tasks = candidates
    .map((task) => {
      const complete = task.files.every((file) => exists(join(root, file)));
      return {
        ...task,
        status: complete ? "complete" : task.status,
        engineer: available.has(task.id) ? task.id : null
      };
    })
    .filter((task) => task.status !== "complete");

  const firstReady = tasks.find((task) => task.engineer);
  if (firstReady) firstReady.status = "ready";

  return {
    targetRepository,
    root,
    files,
    facts,
    packageJsonName: packageJson?.name ?? null,
    engineers,
    tasks
  };
}
