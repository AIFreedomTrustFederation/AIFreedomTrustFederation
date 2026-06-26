import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ignoredFiles = new Set([
  "index.mjs",
  "shared.mjs"
]);

let registry = null;

async function loadRegistry() {
  if (registry) return registry;

  registry = new Map();

  if (!existsSync(__dirname)) {
    return registry;
  }

  const files = readdirSync(__dirname)
    .filter((file) => file.endsWith(".mjs"))
    .filter((file) => !ignoredFiles.has(file))
    .sort();

  for (const file of files) {
    const modulePath = join(__dirname, file);
    const mod = await import(pathToFileURL(modulePath).href);

    const taskId = mod.task ?? file.replace(/\.mjs$/, "");
    const runner = mod.run ?? mod.default;

    if (typeof runner === "function") {
      registry.set(taskId, {
        taskId,
        file,
        run: runner,
        description: mod.description ?? ""
      });
    }
  }

  return registry;
}

export async function getEngineer(taskId) {
  const engineers = await loadRegistry();
  return engineers.get(taskId)?.run ?? null;
}

export async function listEngineers() {
  const engineers = await loadRegistry();

  return [...engineers.values()]
    .map((entry) => ({
      taskId: entry.taskId,
      file: entry.file,
      description: entry.description
    }))
    .sort((a, b) => a.taskId.localeCompare(b.taskId));
}
