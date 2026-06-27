import { askLocalAI, extractText } from "../ai/runtime.mjs";
import { runAgent } from "../agents/runtime.mjs";
import { interpolateObject } from "./interpolate.mjs";
import {
  createWorkflowRun,
  finishWorkflowRun,
  readWorkflow,
  updateWorkflowRun
} from "./store.mjs";

export async function runWorkflow(paths, workflowId, inputs = {}) {
  const workflow = readWorkflow(paths, workflowId);

  if (!workflow) {
    return {
      ok: false,
      error: `Workflow not found: ${workflowId}`
    };
  }

  if (!workflow.enabled) {
    return {
      ok: false,
      error: `Workflow disabled: ${workflowId}`
    };
  }

  const run = createWorkflowRun(paths, {
    workflowId: workflow.id,
    inputs,
    status: "running"
  });

  const context = {
    inputs,
    workflow: {
      id: workflow.id,
      title: workflow.title
    },
    steps: {}
  };

  const stepResults = [];

  try {
    for (const step of workflow.steps) {
      const result = await runWorkflowStep(paths, step, context);

      context.steps[step.id] = result;

      stepResults.push({
        stepId: step.id,
        type: step.type,
        ok: result.ok,
        output: result.output ?? null,
        conversationId: result.conversationId ?? null,
        error: result.error ?? null,
        createdAt: new Date().toISOString()
      });

      updateWorkflowRun(paths, run.id, {
        steps: stepResults,
        outputs: context.steps
      });

      if (!result.ok) {
        finishWorkflowRun(paths, run.id, {
          status: "failed",
          error: result.error,
          steps: stepResults,
          outputs: context.steps
        });

        return {
          ok: false,
          runId: run.id,
          workflowId: workflow.id,
          error: result.error,
          steps: stepResults
        };
      }
    }

    finishWorkflowRun(paths, run.id, {
      status: "complete",
      steps: stepResults,
      outputs: context.steps
    });

    return {
      ok: true,
      runId: run.id,
      workflowId: workflow.id,
      outputs: context.steps,
      steps: stepResults
    };
  } catch (error) {
    finishWorkflowRun(paths, run.id, {
      status: "failed",
      error: error.message,
      steps: stepResults,
      outputs: context.steps
    });

    return {
      ok: false,
      runId: run.id,
      workflowId: workflow.id,
      error: error.message,
      steps: stepResults
    };
  }
}

export async function runWorkflowStep(paths, step, context) {
  const prepared = interpolateObject(step, context);

  if (prepared.type === "note") {
    return {
      ok: true,
      output: prepared.text ?? prepared.note ?? ""
    };
  }

  if (prepared.type === "assert") {
    const value = prepared.value;
    const expected = prepared.equals;

    if (expected !== undefined && value !== expected) {
      return {
        ok: false,
        error: `Assertion failed for ${prepared.id}: expected ${expected}, got ${value}`
      };
    }

    if (prepared.truthy && !value) {
      return {
        ok: false,
        error: `Assertion failed for ${prepared.id}: value was not truthy`
      };
    }

    return {
      ok: true,
      output: value
    };
  }

  if (prepared.type === "prompt") {
    const result = await askLocalAI({
      model: prepared.model ?? process.env.FORGE_MODEL ?? "llama3.2",
      system: prepared.system,
      prompt: prepared.prompt,
      mode: prepared.mode ?? "chat"
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "Prompt step failed"
      };
    }

    return {
      ok: true,
      output: extractText(result)
    };
  }

  if (prepared.type === "agent") {
    const result = await runAgent(paths, prepared.agentId, prepared.prompt, {
      model: prepared.model,
      mode: prepared.mode ?? "chat"
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "Agent step failed"
      };
    }

    return {
      ok: true,
      output: result.text,
      conversationId: result.conversationId
    };
  }

  return {
    ok: false,
    error: `Unsupported workflow step type: ${prepared.type}`
  };
}
