#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "📋 AIFT-Forge Phase 4: Autonomous Task Scheduler"

mkdir -p packages/forge-core/src/scheduler
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/scheduler
mkdir -p .forge/tasks

cat > packages/forge-core/src/scheduler/store.mjs <<'JS'
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
JS

cat > packages/forge-core/src/scheduler/runtime.mjs <<'JS'
import {
  isDue,
  listScheduledTasks,
  markTaskRun,
  readScheduledTask
} from "./store.mjs";
import { runAgentTask } from "../agents/runtime.mjs";

export function dueScheduledTasks(paths, now = new Date()) {
  return listScheduledTasks(paths).filter((task) => isDue(task, now));
}

export async function runScheduledTask(paths, id) {
  const scheduled = readScheduledTask(paths, id);

  if (!scheduled) {
    return {
      ok: false,
      error: `Scheduled task not found: ${id}`
    };
  }

  if (!scheduled.enabled) {
    return {
      ok: false,
      error: `Scheduled task disabled: ${id}`
    };
  }

  const result = await runAgentTask(
    paths,
    scheduled.agentId,
    scheduled.title,
    scheduled.prompt
  );

  markTaskRun(paths, scheduled, {
    ok: result.ok,
    taskId: result.taskId,
    conversationId: result.conversationId,
    error: result.error ?? null
  });

  return {
    ...result,
    scheduledTaskId: scheduled.id
  };
}

export async function runDueScheduledTasks(paths, now = new Date()) {
  const due = dueScheduledTasks(paths, now);
  const results = [];

  for (const task of due) {
    results.push(await runScheduledTask(paths, task.id));
  }

  return results;
}
JS

cat > packages/forge-core/src/commands/schedule.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  createScheduledTask,
  disableScheduledTask,
  enableScheduledTask,
  listScheduledTasks,
  readScheduledTask
} from "../scheduler/store.mjs";
import {
  dueScheduledTasks,
  runDueScheduledTasks,
  runScheduledTask
} from "../scheduler/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function stripFlags(args, flags = []) {
  return args
    .filter((arg, index) => {
      const previous = args[index - 1];
      return !flags.includes(arg) && !flags.includes(previous);
    })
    .join(" ")
    .trim();
}

export default async function schedule(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "create") {
    const id = args[1];
    const agentId = readFlag(args, "--agent");
    const title = readFlag(args, "--title", id);
    const cadence = readFlag(args, "--cadence", "manual");
    const everyMinutes = Number(readFlag(args, "--every-minutes", "0"));
    const runAt = readFlag(args, "--run-at", null);
    const maxRunsRaw = readFlag(args, "--max-runs", null);
    const maxRuns = maxRunsRaw === null ? null : Number(maxRunsRaw);

    const prompt = stripFlags(args.slice(2), [
      "--agent",
      "--title",
      "--cadence",
      "--every-minutes",
      "--run-at",
      "--max-runs"
    ]);

    if (!id || !agentId || !prompt) {
      console.log("Usage:");
      console.log("  aift-forge schedule create daily-review --agent steward --cadence interval --every-minutes 1440 \"Review repo health.\"");
      console.log("  aift-forge schedule create one-shot --agent steward --cadence once --run-at 2026-06-27T12:00:00.000Z \"Run once.\"");
      return;
    }

    const task = createScheduledTask(paths, {
      id,
      agentId,
      title,
      prompt,
      cadence,
      everyMinutes,
      runAt,
      maxRuns
    });

    console.log("✅ Scheduled task created");
    console.log(`id: ${task.id}`);
    console.log(`agent: ${task.agentId}`);
    console.log(`cadence: ${task.cadence}`);
    console.log(`nextRunAt: ${task.nextRunAt ?? "manual"}`);
    return;
  }

  if (action === "list") {
    const tasks = listScheduledTasks(paths);

    console.log("📋 Forge Scheduled Tasks");
    console.log("");

    if (tasks.length === 0) {
      console.log("No scheduled tasks yet.");
      return;
    }

    for (const task of tasks) {
      console.log(`${task.enabled ? "✅" : "⬜"} ${task.id} — ${task.title}`);
      console.log(`   agent: ${task.agentId}`);
      console.log(`   cadence: ${task.cadence}`);
      console.log(`   nextRunAt: ${task.nextRunAt ?? "manual"}`);
      console.log(`   runCount: ${task.runCount}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const task = readScheduledTask(paths, id);

    if (!task) {
      console.log(`❌ Scheduled task not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(task, null, 2));
    return;
  }

  if (action === "due") {
    const tasks = dueScheduledTasks(paths);

    console.log("⏰ Due Scheduled Tasks");
    console.log("");

    if (tasks.length === 0) {
      console.log("No tasks due.");
      return;
    }

    for (const task of tasks) {
      console.log(`🟡 ${task.id} — ${task.title}`);
      console.log(`   agent: ${task.agentId}`);
      console.log(`   nextRunAt: ${task.nextRunAt}`);
    }

    return;
  }

  if (action === "run") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge schedule run daily-review");
      return;
    }

    const result = await runScheduledTask(paths, id);

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      return;
    }

    console.log(result.text);
    console.log("");
    console.log(`scheduledTask: ${result.scheduledTaskId}`);
    console.log(`task: ${result.taskId}`);
    console.log(`conversation: ${result.conversationId}`);
    return;
  }

  if (action === "run-due") {
    const results = await runDueScheduledTasks(paths);

    if (results.length === 0) {
      console.log("No scheduled tasks due.");
      return;
    }

    for (const result of results) {
      console.log(`${result.ok ? "✅" : "❌"} ${result.scheduledTaskId}`);
      if (result.ok) {
        console.log(`   task: ${result.taskId}`);
        console.log(`   conversation: ${result.conversationId}`);
      } else {
        console.log(`   ${result.error}`);
      }
    }

    return;
  }

  if (action === "enable") {
    const id = args[1];
    const task = enableScheduledTask(paths, id);

    console.log(`✅ Enabled scheduled task: ${task.id}`);
    return;
  }

  if (action === "disable") {
    const id = args[1];
    const task = disableScheduledTask(paths, id);

    console.log(`⬜ Disabled scheduled task: ${task.id}`);
    return;
  }

  console.log("Forge Task Scheduler");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge schedule list");
  console.log("  aift-forge schedule create daily-review --agent steward --cadence interval --every-minutes 1440 \"Review repo health.\"");
  console.log("  aift-forge schedule due");
  console.log("  aift-forge schedule run daily-review");
  console.log("  aift-forge schedule run-due");
  console.log("  aift-forge schedule enable daily-review");
  console.log("  aift-forge schedule disable daily-review");
}
JS

cat > scripts/aift-scheduler-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  createScheduledTask,
  isDue,
  listScheduledTasks,
  markTaskRun,
  readScheduledTask
} from "../packages/forge-core/src/scheduler/store.mjs";
import { dueScheduledTasks } from "../packages/forge-core/src/scheduler/runtime.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/scheduler/test-scheduled.json", { force: true });

const now = new Date("2026-01-01T00:00:00.000Z");

const task = createScheduledTask(paths, {
  id: "test-scheduled",
  agentId: "test-agent",
  title: "Test scheduled task",
  prompt: "Test prompt",
  cadence: "interval",
  everyMinutes: 1,
  nextRunAt: now.toISOString()
});

assert.equal(task.id, "test-scheduled");
assert.equal(task.agentId, "test-agent");

const found = readScheduledTask(paths, "test-scheduled");
assert.equal(found.id, "test-scheduled");

assert.equal(isDue(found, now), true);

const due = dueScheduledTasks(paths, now);
assert.ok(due.some((item) => item.id === "test-scheduled"));

const marked = markTaskRun(paths, found, {
  ok: true,
  taskId: "task-test",
  conversationId: "conv-test"
});

assert.equal(marked.runCount, 1);
assert.equal(marked.lastStatus, "complete");

const all = listScheduledTasks(paths);
assert.ok(all.some((item) => item.id === "test-scheduled"));

console.log("✅ Scheduler smoke test passed.");
JS

cat > docs/SCHEDULER_PHASE_4.md <<'MD'
# AIFT-Forge Phase 4: Autonomous Task Scheduler

Phase 4 adds a local task scheduler for persistent Forge agents.

Scheduled tasks are stored as inspectable JSON under:

    .forge/scheduler/

## Scheduled Task Object

Each scheduled task contains:

- id
- agent id
- title
- prompt
- enabled state
- cadence
- interval timing
- next run time
- last run result
- run count

## Commands

List scheduled tasks:

    aift-forge schedule list

Create a manual task:

    aift-forge schedule create repo-review --agent steward "Review the repo health."

Create an interval task:

    aift-forge schedule create daily-review --agent steward --cadence interval --every-minutes 1440 "Review repo health."

Create a one-time scheduled task:

    aift-forge schedule create one-shot --agent steward --cadence once --run-at 2026-06-27T12:00:00.000Z "Run once."

Show due tasks:

    aift-forge schedule due

Run one task:

    aift-forge schedule run daily-review

Run all due tasks:

    aift-forge schedule run-due

Enable or disable a task:

    aift-forge schedule enable daily-review
    aift-forge schedule disable daily-review

## Governance

The scheduler does not run hidden background activity by default.

It is local-first, inspectable, and explicit:

- tasks are JSON files
- agent prompts are visible
- run history is visible
- no cloud fallback
- no silent network use
- no writes without local records
MD

node --check packages/forge-core/src/scheduler/store.mjs
node --check packages/forge-core/src/scheduler/runtime.mjs
node --check packages/forge-core/src/commands/schedule.mjs
node --check scripts/aift-scheduler-smoke.mjs
node scripts/aift-scheduler-smoke.mjs

echo ""
echo "✅ Phase 4 Autonomous Task Scheduler complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  schedule -> packages/forge-core/src/commands/schedule.mjs"
echo ""
echo "Then test:"
echo "  aift-forge schedule list"
echo "  aift-forge schedule create repo-review --agent steward \"Review the repo health.\""
echo "  aift-forge schedule due"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 4 autonomous task scheduler\""
echo "  git push origin main"
