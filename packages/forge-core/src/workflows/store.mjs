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
