import { createToolRun, finishToolRun } from "./store.mjs";
import { executeTool } from "./registry.mjs";
import { evaluateToolPermission } from "./policy.mjs";

export async function runTool(paths, toolId, input = {}, options = {}) {
  const permission = evaluateToolPermission(paths, toolId, input, options);

  if (!permission.ok) {
    return {
      ok: false,
      status: permission.decision,
      reason: permission.reason,
      approvalId: permission.approvalId ?? null
    };
  }

  const run = createToolRun(paths, {
    toolId,
    actor: options.actor ?? "local-user",
    input,
    approvalId: permission.approvalId ?? options.approvalId ?? null
  });

  try {
    const result = await executeTool(paths, toolId, input);

    finishToolRun(paths, run.id, {
      status: result.ok ? "complete" : "failed",
      output: result.output ?? null,
      error: result.error ?? null
    });

    return {
      ok: result.ok,
      runId: run.id,
      output: result.output ?? null,
      error: result.error ?? null
    };
  } catch (error) {
    finishToolRun(paths, run.id, {
      status: "failed",
      error: error.message
    });

    return {
      ok: false,
      runId: run.id,
      error: error.message
    };
  }
}
