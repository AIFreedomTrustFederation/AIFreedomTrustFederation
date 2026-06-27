import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function toolsDir(paths) {
  return join(paths.repoRoot, ".forge", "tools");
}

export function toolRunsDir(paths) {
  return join(toolsDir(paths), "runs");
}

export function approvalsDir(paths) {
  return join(toolsDir(paths), "approvals");
}

export function policiesDir(paths) {
  return join(toolsDir(paths), "policies");
}

export function ensureToolStore(paths) {
  mkdirSync(toolsDir(paths), { recursive: true });
  mkdirSync(toolRunsDir(paths), { recursive: true });
  mkdirSync(approvalsDir(paths), { recursive: true });
  mkdirSync(policiesDir(paths), { recursive: true });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function toolRunFile(paths, id) {
  return join(toolRunsDir(paths), `${normalizeId(id)}.json`);
}

export function approvalFile(paths, id) {
  return join(approvalsDir(paths), `${normalizeId(id)}.json`);
}

export function policyFile(paths, id = "default") {
  return join(policiesDir(paths), `${normalizeId(id)}.json`);
}

export function defaultToolPolicy() {
  return {
    schema: "aift.forge.tool-policy.v1",
    id: "default",
    mode: "local-first",
    network: "local-only",
    defaultDecision: "deny",
    allowReadOnlyTools: true,
    requireApprovalForWrite: true,
    requireApprovalForShell: true,
    allowedTools: [
      "repo.status",
      "repo.files",
      "repo.read",
      "git.status",
      "git.diff",
      "git.log",
      "knowledge.search",
      "knowledge.status"
    ],
    deniedTools: [
      "shell.exec",
      "git.commit",
      "git.push",
      "file.write"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function ensureDefaultToolPolicy(paths) {
  ensureToolStore(paths);

  const file = policyFile(paths, "default");

  if (!existsSync(file)) {
    writeJson(file, defaultToolPolicy());
  }

  return readJson(file);
}

export function readToolPolicy(paths, id = "default") {
  ensureToolStore(paths);

  const file = policyFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function writeToolPolicy(paths, policy) {
  ensureToolStore(paths);

  const next = {
    ...policy,
    schema: "aift.forge.tool-policy.v1",
    id: policy.id ?? "default",
    updatedAt: new Date().toISOString()
  };

  if (!next.createdAt) next.createdAt = new Date().toISOString();

  writeJson(policyFile(paths, next.id), next);
  return next;
}

export function createToolRun(paths, run) {
  ensureToolStore(paths);

  const id = normalizeId(run.id ?? `tool-run-${Date.now()}`);

  const next = {
    schema: "aift.forge.tool-run.v1",
    id,
    toolId: run.toolId,
    actor: run.actor ?? "local-user",
    status: run.status ?? "running",
    input: run.input ?? {},
    output: run.output ?? null,
    error: run.error ?? null,
    approvalId: run.approvalId ?? null,
    startedAt: new Date().toISOString(),
    finishedAt: null
  };

  writeJson(toolRunFile(paths, id), next);
  return next;
}

export function readToolRun(paths, id) {
  ensureToolStore(paths);

  const file = toolRunFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function finishToolRun(paths, id, patch = {}) {
  const existing = readToolRun(paths, id);
  if (!existing) throw new Error(`Tool run not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    status: patch.status ?? "complete",
    finishedAt: new Date().toISOString()
  };

  writeJson(toolRunFile(paths, id), next);
  return next;
}

export function listToolRuns(paths) {
  ensureToolStore(paths);

  return readdirSync(toolRunsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(toolRunsDir(paths), file)))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export function createApproval(paths, approval) {
  ensureToolStore(paths);

  const id = normalizeId(approval.id ?? `approval-${Date.now()}`);

  const next = {
    schema: "aift.forge.tool-approval.v1",
    id,
    toolId: approval.toolId,
    actor: approval.actor ?? "local-user",
    decision: approval.decision ?? "pending",
    reason: approval.reason ?? "",
    input: approval.input ?? {},
    createdAt: new Date().toISOString(),
    decidedAt: approval.decision && approval.decision !== "pending" ? new Date().toISOString() : null
  };

  writeJson(approvalFile(paths, id), next);
  return next;
}

export function readApproval(paths, id) {
  ensureToolStore(paths);

  const file = approvalFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function decideApproval(paths, id, decision, reason = "") {
  const existing = readApproval(paths, id);
  if (!existing) throw new Error(`Approval not found: ${id}`);

  const next = {
    ...existing,
    decision,
    reason,
    decidedAt: new Date().toISOString()
  };

  writeJson(approvalFile(paths, id), next);
  return next;
}

export function listApprovals(paths) {
  ensureToolStore(paths);

  return readdirSync(approvalsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(approvalsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
