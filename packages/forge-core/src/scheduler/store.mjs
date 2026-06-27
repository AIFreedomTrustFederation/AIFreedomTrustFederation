import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function schedulerDir(paths) {
  return join(paths.repoRoot, ".forge", "scheduler");
}

export function schedulerFile(paths, id) {
  return join(schedulerDir(paths), `${id}.json`);
}

export function ensureSchedulerStore(paths) {
  mkdirSync(schedulerDir(paths), { recursive: true });
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function normalizeTaskId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createScheduledTask(paths, task) {
  ensureSchedulerStore(paths);

  const id = normalizeTaskId(task.id ?? `scheduled-${Date.now()}`);

  if (!id) throw new Error("Scheduled task id is required.");
  if (!task.agentId) throw new Error("Scheduled task agentId is required.");
  if (!task.prompt) throw new Error("Scheduled task prompt is required.");

  const next = {
    schema: "aift.forge.scheduled-task.v1",
    id,
    agentId: task.agentId,
    title: task.title ?? id,
    prompt: task.prompt,
    enabled: task.enabled ?? true,
    cadence: task.cadence ?? "manual",
    everyMinutes: Number(task.everyMinutes ?? 0),
    runAt: task.runAt ?? null,
    lastRunAt: null,
    nextRunAt: task.nextRunAt ?? computeNextRunAt({
      cadence: task.cadence ?? "manual",
      everyMinutes: Number(task.everyMinutes ?? 0),
      runAt: task.runAt ?? null
    }),
    runCount: 0,
    maxRuns: task.maxRuns ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(schedulerFile(paths, id), next);
  return next;
}

export function readScheduledTask(paths, id) {
  ensureSchedulerStore(paths);

  const file = schedulerFile(paths, normalizeTaskId(id));
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listScheduledTasks(paths) {
  ensureSchedulerStore(paths);

  return readdirSync(schedulerDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(schedulerDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function updateScheduledTask(paths, id, patch) {
  const existing = readScheduledTask(paths, id);
  if (!existing) throw new Error(`Scheduled task not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  writeJson(schedulerFile(paths, next.id), next);
  return next;
}

export function enableScheduledTask(paths, id) {
  return updateScheduledTask(paths, id, { enabled: true });
}

export function disableScheduledTask(paths, id) {
  return updateScheduledTask(paths, id, { enabled: false });
}

export function computeNextRunAt(task, now = new Date()) {
  if (task.cadence === "manual") return null;

  if (task.cadence === "once") {
    return task.runAt ?? null;
  }

  if (task.cadence === "interval") {
    const minutes = Number(task.everyMinutes ?? 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;

    return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  }

  return null;
}

export function isDue(task, now = new Date()) {
  if (!task.enabled) return false;
  if (!task.nextRunAt) return false;
  if (task.maxRuns !== null && task.maxRuns !== undefined && task.runCount >= task.maxRuns) return false;

  return new Date(task.nextRunAt).getTime() <= now.getTime();
}

export function markTaskRun(paths, task, result) {
  const now = new Date();

  const nextRunAt = computeNextRunAt(task, now);

  const shouldDisable =
    task.cadence === "once" ||
    (task.maxRuns !== null &&
      task.maxRuns !== undefined &&
      task.runCount + 1 >= task.maxRuns);

  return updateScheduledTask(paths, task.id, {
    enabled: shouldDisable ? false : task.enabled,
    lastRunAt: now.toISOString(),
    nextRunAt,
    runCount: task.runCount + 1,
    lastResult: result,
    lastStatus: result?.ok ? "complete" : "failed"
  });
}
