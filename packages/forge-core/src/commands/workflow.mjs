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
