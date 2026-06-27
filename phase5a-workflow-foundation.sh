#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🔁 AIFT-Forge Phase 5A: Workflow Foundation"

mkdir -p packages/forge-core/src/workflows
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/workflows
mkdir -p .forge/workflow-runs

cat > packages/forge-core/src/workflows/store.mjs <<'JS'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function workflowDir(paths) {
  return join(paths.repoRoot, ".forge", "workflows");
}

export function workflowRunDir(paths) {
  return join(paths.repoRoot, ".forge", "workflow-runs");
}

export function ensureWorkflowStore(paths) {
  mkdirSync(workflowDir(paths), { recursive: true });
  mkdirSync(workflowRunDir(paths), { recursive: true });
}

export function normalizeWorkflowId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function workflowFile(paths, id) {
  return join(workflowDir(paths), `${normalizeWorkflowId(id)}.json`);
}

export function workflowRunFile(paths, id) {
  return join(workflowRunDir(paths), `${normalizeWorkflowId(id)}.json`);
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function validateWorkflow(workflow) {
  if (!workflow.id) throw new Error("Workflow id is required.");
  if (!Array.isArray(workflow.steps)) throw new Error("Workflow steps must be an array.");

  const stepIds = new Set();

  for (const [index, step] of workflow.steps.entries()) {
    if (!step.id) throw new Error(`Workflow step ${index} is missing id.`);
    if (stepIds.has(step.id)) throw new Error(`Duplicate workflow step id: ${step.id}`);

    stepIds.add(step.id);

    if (!step.type) throw new Error(`Workflow step ${step.id} is missing type.`);

    const allowed = ["agent", "prompt", "note", "assert"];
    if (!allowed.includes(step.type)) {
      throw new Error(`Unsupported workflow step type: ${step.type}`);
    }
  }

  return true;
}

export function createWorkflow(paths, workflow) {
  ensureWorkflowStore(paths);

  const id = normalizeWorkflowId(workflow.id ?? `workflow-${Date.now()}`);

  if (!id) throw new Error("Workflow id is required.");

  const next = {
    schema: "aift.forge.workflow.v1",
    id,
    title: workflow.title ?? id,
    description: workflow.description ?? "",
    enabled: workflow.enabled ?? true,
    inputs: workflow.inputs ?? {},
    steps: Array.isArray(workflow.steps) ? workflow.steps : [],
    permissions: workflow.permissions ?? {
      filesystem: "read",
      git: "read",
      network: "local-only",
      write: "explicit-approval"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  validateWorkflow(next);
  writeJson(workflowFile(paths, id), next);

  return next;
}

export function readWorkflow(paths, id) {
  ensureWorkflowStore(paths);

  const file = workflowFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listWorkflows(paths) {
  ensureWorkflowStore(paths);

  return readdirSync(workflowDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(workflowDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function updateWorkflow(paths, id, patch) {
  const existing = readWorkflow(paths, id);
  if (!existing) throw new Error(`Workflow not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  validateWorkflow(next);
  writeJson(workflowFile(paths, next.id), next);

  return next;
}

export function createWorkflowRun(paths, run) {
  ensureWorkflowStore(paths);

  const id = normalizeWorkflowId(run.id ?? `run-${Date.now()}`);

  const next = {
    schema: "aift.forge.workflow-run.v1",
    id,
    workflowId: run.workflowId,
    status: run.status ?? "running",
    inputs: run.inputs ?? {},
    outputs: run.outputs ?? {},
    steps: run.steps ?? [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  writeJson(workflowRunFile(paths, id), next);
  return next;
}

export function readWorkflowRun(paths, id) {
  ensureWorkflowStore(paths);

  const file = workflowRunFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listWorkflowRuns(paths) {
  ensureWorkflowStore(paths);

  return readdirSync(workflowRunDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(workflowRunDir(paths), file)))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export function updateWorkflowRun(paths, id, patch) {
  const existing = readWorkflowRun(paths, id);
  if (!existing) throw new Error(`Workflow run not found: ${id}`);

  const next = {
    ...existing,
    ...patch
  };

  writeJson(workflowRunFile(paths, id), next);
  return next;
}

export function finishWorkflowRun(paths, id, patch = {}) {
  return updateWorkflowRun(paths, id, {
    ...patch,
    status: patch.status ?? "complete",
    finishedAt: new Date().toISOString()
  });
}
JS

cat > packages/forge-core/src/workflows/interpolate.mjs <<'JS'
export function interpolate(value, context = {}) {
  if (typeof value !== "string") return value;

  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const parts = key.split(".");
    let current = context;

    for (const part of parts) {
      current = current?.[part];
    }

    if (current === undefined || current === null) return "";
    if (typeof current === "object") return JSON.stringify(current);

    return String(current);
  });
}

export function interpolateObject(value, context = {}) {
  if (typeof value === "string") return interpolate(value, context);

  if (Array.isArray(value)) {
    return value.map((item) => interpolateObject(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateObject(item, context)])
    );
  }

  return value;
}
JS

cat > scripts/aift-workflow-foundation-smoke.mjs <<'JS'
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
JS

cat > docs/WORKFLOW_ENGINE_PHASE_5A.md <<'MD'
# AIFT-Forge Phase 5A: Workflow Foundation

Phase 5A adds workflow storage, validation, interpolation, and workflow run records.

## Storage

Workflow definitions:

    .forge/workflows/

Workflow run records:

    .forge/workflow-runs/

## Supported Step Types

- `note`
- `assert`
- `prompt`
- `agent`

Phase 5A validates these step types but does not execute agent or prompt steps yet.

## Interpolation

Workflow fields can use simple template variables:

    {{inputs.project}}
    {{workflow.id}}
    {{steps.review.output}}

## Governance

Workflow definitions and runs are:

- local-first
- JSON-backed
- inspectable
- replayable
- no cloud fallback
- explicit records
MD

node --check packages/forge-core/src/workflows/store.mjs
node --check packages/forge-core/src/workflows/interpolate.mjs
node --check scripts/aift-workflow-foundation-smoke.mjs
node scripts/aift-workflow-foundation-smoke.mjs

echo ""
echo "✅ Phase 5A Workflow Foundation complete."
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 5A workflow foundation\""
echo "  git push origin main"
