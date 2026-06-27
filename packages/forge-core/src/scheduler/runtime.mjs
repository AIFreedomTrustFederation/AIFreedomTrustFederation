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
