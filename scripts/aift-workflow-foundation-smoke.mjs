import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  createWorkflow,
  createWorkflowRun,
  finishWorkflowRun,
  listWorkflowRuns,
  listWorkflows,
  readWorkflow
} from "../packages/forge-core/src/workflows/store.mjs";
import { interpolate, interpolateObject } from "../packages/forge-core/src/workflows/interpolate.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/workflows/test-workflow-foundation.json", { force: true });

assert.equal(
  interpolate("Hello {{inputs.name}}", { inputs: { name: "Forge" } }),
  "Hello Forge"
);

assert.deepEqual(
  interpolateObject({ text: "Project {{inputs.project}}" }, { inputs: { project: "AIFT" } }),
  { text: "Project AIFT" }
);

const workflow = createWorkflow(paths, {
  id: "test-workflow-foundation",
  title: "Test Workflow Foundation",
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
    }
  ]
});

assert.equal(workflow.id, "test-workflow-foundation");

const found = readWorkflow(paths, "test-workflow-foundation");
assert.equal(found.title, "Test Workflow Foundation");

const run = createWorkflowRun(paths, {
  id: "test-workflow-run-foundation",
  workflowId: workflow.id,
  inputs: { name: "Forge" }
});

assert.equal(run.workflowId, workflow.id);

const finished = finishWorkflowRun(paths, run.id, {
  status: "complete",
  outputs: { start: { output: "Hello Forge" } }
});

assert.equal(finished.status, "complete");

const workflows = listWorkflows(paths);
assert.ok(workflows.some((item) => item.id === "test-workflow-foundation"));

const runs = listWorkflowRuns(paths);
assert.ok(runs.some((item) => item.id === "test-workflow-run-foundation"));

console.log("✅ Workflow foundation smoke test passed.");
