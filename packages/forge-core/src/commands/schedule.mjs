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
