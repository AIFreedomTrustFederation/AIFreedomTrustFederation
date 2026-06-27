#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "⚙️ AIFT-Forge Phase 5B: Workflow Runtime and CLI"

mkdir -p packages/forge-core/src/workflows
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/workflows
mkdir -p .forge/workflow-runs

cat > packages/forge-core/src/workflows/runtime.mjs <<'JS'
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
JS

cat > packages/forge-core/src/commands/workflow.mjs <<'JS'
import { readFileSync } from "node:fs";
import { getForgePaths } from "../lib/paths.mjs";
import {
  createWorkflow,
  listWorkflowRuns,
  listWorkflows,
  readWorkflow,
  readWorkflowRun,
  updateWorkflow
} from "../workflows/store.mjs";
import { runWorkflow } from "../workflows/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function parseInputs(raw) {
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const entries = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.split("="));

    return Object.fromEntries(entries.map(([key, ...value]) => [key, value.join("=")]));
  }
}

export default async function workflow(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "create") {
    const id = args[1];
    const agentId = readFlag(args, "--agent", "steward");
    const title = readFlag(args, "--title", id);
    const prompt = readFlag(args, "--prompt", "Review the current Forge mission and recommend the next practical step.");

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge workflow create repo-review --agent steward --title \"Repo Review\"");
      return;
    }

    const created = createWorkflow(paths, {
      id,
      title,
      description: "Generated basic agent workflow.",
      steps: [
        {
          id: "start",
          type: "note",
          text: "Starting workflow {{workflow.id}}"
        },
        {
          id: "agent-review",
          type: "agent",
          agentId,
          prompt
        },
        {
          id: "summary",
          type: "note",
          text: "{{steps.agent-review.output}}"
        }
      ]
    });

    console.log("✅ Workflow created");
    console.log(`id: ${created.id}`);
    console.log(`title: ${created.title}`);
    console.log(`steps: ${created.steps.length}`);
    return;
  }

  if (action === "import") {
    const file = args[1];

    if (!file) {
      console.log("Usage:");
      console.log("  aift-forge workflow import ./workflow.json");
      return;
    }

    const imported = JSON.parse(readFileSync(file, "utf8"));
    const created = createWorkflow(paths, imported);

    console.log("✅ Workflow imported");
    console.log(`id: ${created.id}`);
    console.log(`title: ${created.title}`);
    return;
  }

  if (action === "list") {
    const workflows = listWorkflows(paths);

    console.log("🔁 Forge Workflows");
    console.log("");

    if (workflows.length === 0) {
      console.log("No workflows yet.");
      console.log("Create one:");
      console.log("  aift-forge workflow create repo-review --agent steward");
      return;
    }

    for (const item of workflows) {
      console.log(`${item.enabled ? "✅" : "⬜"} ${item.id} — ${item.title}`);
      console.log(`   steps: ${item.steps.length}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const item = readWorkflow(paths, id);

    if (!item) {
      console.log(`❌ Workflow not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(item, null, 2));
    return;
  }

  if (action === "run") {
    const id = args[1];
    const inputs = parseInputs(readFlag(args, "--inputs", "{}"));

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge workflow run repo-review");
      console.log("  aift-forge workflow run repo-review --inputs project=AIFT-Forge");
      return;
    }

    const result = await runWorkflow(paths, id, inputs);

    if (!result.ok) {
      console.log(`❌ Workflow failed: ${result.error}`);
      console.log(`run: ${result.runId ?? "none"}`);
      return;
    }

    console.log("✅ Workflow complete");
    console.log(`workflow: ${result.workflowId}`);
    console.log(`run: ${result.runId}`);

    for (const step of result.steps) {
      console.log("");
      console.log(`${step.ok ? "✅" : "❌"} ${step.stepId}`);
      if (step.output) console.log(String(step.output));
      if (step.error) console.log(step.error);
    }

    return;
  }

  if (action === "runs") {
    const runs = listWorkflowRuns(paths);

    console.log("📜 Workflow Runs");
    console.log("");

    if (runs.length === 0) {
      console.log("No workflow runs yet.");
      return;
    }

    for (const run of runs) {
      console.log(`${run.status === "complete" ? "✅" : "🟡"} ${run.id}`);
      console.log(`   workflow: ${run.workflowId}`);
      console.log(`   status: ${run.status}`);
      console.log(`   startedAt: ${run.startedAt}`);
    }

    return;
  }

  if (action === "run-show") {
    const id = args[1];
    const run = readWorkflowRun(paths, id);

    if (!run) {
      console.log(`❌ Workflow run not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(run, null, 2));
    return;
  }

  if (action === "enable") {
    const id = args[1];
    const item = updateWorkflow(paths, id, { enabled: true });

    console.log(`✅ Enabled workflow: ${item.id}`);
    return;
  }

  if (action === "disable") {
    const id = args[1];
    const item = updateWorkflow(paths, id, { enabled: false });

    console.log(`⬜ Disabled workflow: ${item.id}`);
    return;
  }

  console.log("Forge Workflow Engine");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge workflow list");
  console.log("  aift-forge workflow create repo-review --agent steward");
  console.log("  aift-forge workflow import ./workflow.json");
  console.log("  aift-forge workflow show repo-review");
  console.log("  aift-forge workflow run repo-review");
  console.log("  aift-forge workflow runs");
  console.log("  aift-forge workflow run-show run-id");
  console.log("  aift-forge workflow enable repo-review");
  console.log("  aift-forge workflow disable repo-review");
}
JS

cat > scripts/aift-workflow-runtime-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { createWorkflow, listWorkflowRuns } from "../packages/forge-core/src/workflows/store.mjs";
import { runWorkflow } from "../packages/forge-core/src/workflows/runtime.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/workflows/test-workflow-runtime.json", { force: true });

createWorkflow(paths, {
  id: "test-workflow-runtime",
  title: "Test Workflow Runtime",
  steps: [
    {
      id: "start",
      type: "note",
      text: "Hello {{inputs.name}}"
    },
    {
      id: "check",
      type: "assert",
      value: "ok",
      equals: "ok"
    },
    {
      id: "summary",
      type: "note",
      text: "{{steps.start.output}}"
    }
  ]
});

const result = await runWorkflow(paths, "test-workflow-runtime", { name: "Forge" });

assert.equal(result.ok, true);
assert.equal(result.outputs.start.output, "Hello Forge");
assert.equal(result.outputs.summary.output, "Hello Forge");

const runs = listWorkflowRuns(paths);
assert.ok(runs.some((item) => item.workflowId === "test-workflow-runtime"));

console.log("✅ Workflow runtime smoke test passed.");
JS

cat > docs/WORKFLOW_ENGINE_PHASE_5B.md <<'MD'
# AIFT-Forge Phase 5B: Workflow Runtime and CLI

Phase 5B adds workflow execution and the workflow command.

## Runtime

The runtime executes workflows step-by-step and writes run records after every step.

Supported step types:

- `note`
- `assert`
- `prompt`
- `agent`

## Commands

List workflows:

    aift-forge workflow list

Create a starter workflow:

    aift-forge workflow create repo-review --agent steward

Run workflow:

    aift-forge workflow run repo-review

Run with inputs:

    aift-forge workflow run repo-review --inputs project=AIFT-Forge

Show runs:

    aift-forge workflow runs

Show a run:

    aift-forge workflow run-show run-id

## Router Wiring

Wire:

    workflow -> packages/forge-core/src/commands/workflow.mjs
MD

node --check packages/forge-core/src/workflows/runtime.mjs
node --check packages/forge-core/src/commands/workflow.mjs
node --check scripts/aift-workflow-runtime-smoke.mjs
node scripts/aift-workflow-runtime-smoke.mjs

echo ""
echo "✅ Phase 5B Workflow Runtime and CLI complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  workflow -> packages/forge-core/src/commands/workflow.mjs"
echo ""
echo "Then test:"
echo "  aift-forge workflow list"
echo "  aift-forge workflow create repo-review --agent steward"
echo "  aift-forge workflow run repo-review --inputs project=AIFT-Forge"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 5B workflow runtime and CLI\""
echo "  git push origin main"
