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
