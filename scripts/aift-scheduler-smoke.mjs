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
