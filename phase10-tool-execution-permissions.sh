#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🛠️ AIFT-Forge Phase 10: Tool Execution and Permission System"

mkdir -p packages/forge-core/src/tools
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/tools/runs
mkdir -p .forge/tools/approvals
mkdir -p .forge/tools/policies

cat > packages/forge-core/src/tools/store.mjs <<'JS'
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
JS

cat > packages/forge-core/src/tools/registry.mjs <<'JS'
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { searchKnowledge } from "../knowledge/indexer.mjs";

function safeLimit(value, fallback = 50) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(number, 500);
}

function listFiles(root, dir = ".", out = [], limit = 200) {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return out;

  for (const name of readdirSync(absolute)) {
    if (out.length >= limit) break;
    if (["node_modules", ".git"].includes(name)) continue;

    const full = join(absolute, name);
    const rel = relative(root, full);

    try {
      const stat = require("node:fs").statSync(full);

      if (stat.isDirectory()) {
        out.push(`${rel}/`);
        listFiles(root, rel, out, limit);
      } else {
        out.push(rel);
      }
    } catch {
      // ignore inaccessible files
    }
  }

  return out;
}

export const TOOL_DEFINITIONS = [
  {
    id: "repo.status",
    title: "Repository Status",
    description: "Return current repository package and file overview.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "repo.files",
    title: "Repository Files",
    description: "List repository files.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "repo.read",
    title: "Read File",
    description: "Read a local repository file.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "git.status",
    title: "Git Status",
    description: "Run git status --short.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "git.diff",
    title: "Git Diff",
    description: "Run git diff --stat.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "git.log",
    title: "Git Log",
    description: "Show recent git commits.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "knowledge.search",
    title: "Knowledge Search",
    description: "Search local Forge knowledge graph.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "knowledge.status",
    title: "Knowledge Status",
    description: "Return local knowledge graph counts.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "shell.exec",
    title: "Shell Exec",
    description: "Run a local shell command. Disabled by default.",
    risk: "write",
    requiresApproval: true
  }
];

export function listTools() {
  return TOOL_DEFINITIONS;
}

export function readToolDefinition(id) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id) ?? null;
}

export async function executeTool(paths, toolId, input = {}) {
  if (toolId === "repo.status") {
    return {
      ok: true,
      output: {
        repoRoot: paths.repoRoot,
        hasPackageJson: existsSync(join(paths.repoRoot, "package.json")),
        hasForgeDir: existsSync(join(paths.repoRoot, ".forge"))
      }
    };
  }

  if (toolId === "repo.files") {
    return {
      ok: true,
      output: {
        files: listFiles(paths.repoRoot, input.dir ?? ".", [], safeLimit(input.limit, 100))
      }
    };
  }

  if (toolId === "repo.read") {
    const file = input.file;
    if (!file) return { ok: false, error: "file is required" };

    const absolute = join(paths.repoRoot, file);

    if (!absolute.startsWith(paths.repoRoot)) {
      return { ok: false, error: "file must stay inside repo root" };
    }

    if (!existsSync(absolute)) {
      return { ok: false, error: `file not found: ${file}` };
    }

    return {
      ok: true,
      output: {
        file,
        text: readFileSync(absolute, "utf8").slice(0, safeLimit(input.maxChars, 20000))
      }
    };
  }

  if (toolId === "git.status") {
    const result = spawnSync("git", ["status", "--short"], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  if (toolId === "git.diff") {
    const result = spawnSync("git", ["diff", "--stat"], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  if (toolId === "git.log") {
    const result = spawnSync("git", ["log", "--oneline", `-${safeLimit(input.limit, 10)}`], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  if (toolId === "knowledge.search") {
    const query = input.query ?? "";

    return {
      ok: true,
      output: {
        query,
        results: searchKnowledge(paths, query, { limit: safeLimit(input.limit, 10) })
      }
    };
  }

  if (toolId === "knowledge.status") {
    const { listNodes, listEdges, listObservations } = await import("../knowledge/store.mjs");

    return {
      ok: true,
      output: {
        nodes: listNodes(paths).length,
        edges: listEdges(paths).length,
        observations: listObservations(paths).length
      }
    };
  }

  if (toolId === "shell.exec") {
    const command = input.command;

    if (!command) return { ok: false, error: "command is required" };

    const result = spawnSync(command, {
      cwd: paths.repoRoot,
      encoding: "utf8",
      shell: true,
      timeout: 30000
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  return {
    ok: false,
    error: `Unknown tool: ${toolId}`
  };
}
JS

python3 - <<'PY'
from pathlib import Path
p = Path("packages/forge-core/src/tools/registry.mjs")
s = p.read_text()
s = s.replace('import { existsSync, readdirSync, readFileSync } from "node:fs";', 'import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";')
s = s.replace("""    try {
      const stat = require("node:fs").statSync(full);

      if (stat.isDirectory()) {
""", """    try {
      const stat = statSync(full);

      if (stat.isDirectory()) {
""")
p.write_text(s)
PY

cat > packages/forge-core/src/tools/policy.mjs <<'JS'
import {
  createApproval,
  ensureDefaultToolPolicy,
  readApproval,
  readToolPolicy
} from "./store.mjs";
import { readToolDefinition } from "./registry.mjs";

export function evaluateToolPermission(paths, toolId, input = {}, options = {}) {
  const policy = readToolPolicy(paths) ?? ensureDefaultToolPolicy(paths);
  const definition = readToolDefinition(toolId);

  if (!definition) {
    return {
      ok: false,
      decision: "deny",
      reason: `Unknown tool: ${toolId}`
    };
  }

  if ((policy.deniedTools ?? []).includes(toolId)) {
    if (options.approvalId) {
      const approval = readApproval(paths, options.approvalId);

      if (approval?.decision === "approved" && approval.toolId === toolId) {
        return {
          ok: true,
          decision: "allow",
          reason: "Approved by explicit approval record.",
          approvalId: approval.id
        };
      }
    }

    if (definition.requiresApproval || definition.risk !== "read") {
      const approval = createApproval(paths, {
        toolId,
        actor: options.actor ?? "local-user",
        input,
        reason: "Tool requires explicit approval."
      });

      return {
        ok: false,
        decision: "approval-required",
        reason: "Tool requires explicit approval.",
        approvalId: approval.id
      };
    }

    return {
      ok: false,
      decision: "deny",
      reason: "Tool is denied by policy."
    };
  }

  if ((policy.allowedTools ?? []).includes(toolId)) {
    return {
      ok: true,
      decision: "allow",
      reason: "Tool is allowed by policy."
    };
  }

  if (definition.risk === "read" && policy.allowReadOnlyTools) {
    return {
      ok: true,
      decision: "allow",
      reason: "Read-only tool allowed by policy."
    };
  }

  if (definition.requiresApproval || definition.risk !== "read") {
    const approval = createApproval(paths, {
      toolId,
      actor: options.actor ?? "local-user",
      input,
      reason: "Tool requires explicit approval."
    });

    return {
      ok: false,
      decision: "approval-required",
      reason: "Tool requires explicit approval.",
      approvalId: approval.id
    };
  }

  return {
    ok: false,
    decision: policy.defaultDecision ?? "deny",
    reason: "No matching allow rule."
  };
}
JS

cat > packages/forge-core/src/tools/runtime.mjs <<'JS'
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
JS

cat > packages/forge-core/src/commands/tool.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  decideApproval,
  ensureDefaultToolPolicy,
  listApprovals,
  listToolRuns,
  readApproval,
  readToolPolicy,
  writeToolPolicy
} from "../tools/store.mjs";
import { listTools, readToolDefinition } from "../tools/registry.mjs";
import { runTool } from "../tools/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function parseInput(raw) {
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

export default async function tool(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "init") {
    const policy = ensureDefaultToolPolicy(paths);

    console.log("✅ Tool policy initialized");
    console.log(`policy: ${policy.id}`);
    return;
  }

  if (action === "policy") {
    const policy = readToolPolicy(paths) ?? ensureDefaultToolPolicy(paths);
    console.log(JSON.stringify(policy, null, 2));
    return;
  }

  if (action === "allow") {
    const toolId = args[1];

    if (!toolId) {
      console.log("Usage:");
      console.log("  aift-forge tool allow shell.exec");
      return;
    }

    const policy = readToolPolicy(paths) ?? ensureDefaultToolPolicy(paths);

    policy.allowedTools = [...new Set([...(policy.allowedTools ?? []), toolId])];
    policy.deniedTools = (policy.deniedTools ?? []).filter((item) => item !== toolId);

    const updated = writeToolPolicy(paths, policy);

    console.log(`✅ Tool allowed: ${toolId}`);
    console.log(`policy: ${updated.id}`);
    return;
  }

  if (action === "deny") {
    const toolId = args[1];

    if (!toolId) {
      console.log("Usage:");
      console.log("  aift-forge tool deny shell.exec");
      return;
    }

    const policy = readToolPolicy(paths) ?? ensureDefaultToolPolicy(paths);

    policy.deniedTools = [...new Set([...(policy.deniedTools ?? []), toolId])];
    policy.allowedTools = (policy.allowedTools ?? []).filter((item) => item !== toolId);

    const updated = writeToolPolicy(paths, policy);

    console.log(`⬜ Tool denied: ${toolId}`);
    console.log(`policy: ${updated.id}`);
    return;
  }

  if (action === "list") {
    console.log("🛠️ Forge Tools");
    console.log("");

    for (const item of listTools()) {
      console.log(`${item.risk === "read" ? "✅" : "⚠️"} ${item.id} — ${item.title}`);
      console.log(`   risk: ${item.risk}`);
      console.log(`   approval: ${item.requiresApproval}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const found = readToolDefinition(id);

    if (!found) {
      console.log(`❌ Tool not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(found, null, 2));
    return;
  }

  if (action === "run") {
    const toolId = args[1];
    const input = parseInput(readFlag(args, "--input", "{}"));
    const approvalId = readFlag(args, "--approval", null);

    if (!toolId) {
      console.log("Usage:");
      console.log("  aift-forge tool run git.status");
      console.log("  aift-forge tool run repo.read --input file=README.md");
      return;
    }

    const result = await runTool(paths, toolId, input, {
      approvalId,
      actor: "local-user"
    });

    if (!result.ok) {
      console.log(`❌ ${result.reason ?? result.error ?? "Tool failed"}`);
      if (result.approvalId) {
        console.log(`approval: ${result.approvalId}`);
        console.log(`approve with: aift-forge tool approve ${result.approvalId}`);
      }
      if (result.runId) console.log(`run: ${result.runId}`);
      return;
    }

    console.log("✅ Tool complete");
    console.log(`run: ${result.runId}`);
    console.log(JSON.stringify(result.output, null, 2));
    return;
  }

  if (action === "runs") {
    const runs = listToolRuns(paths);

    console.log("📜 Tool Runs");
    console.log("");

    if (runs.length === 0) {
      console.log("No tool runs yet.");
      return;
    }

    for (const run of runs) {
      console.log(`${run.status === "complete" ? "✅" : "❌"} ${run.id}`);
      console.log(`   tool: ${run.toolId}`);
      console.log(`   status: ${run.status}`);
      console.log(`   startedAt: ${run.startedAt}`);
    }

    return;
  }

  if (action === "approvals") {
    const approvals = listApprovals(paths);

    console.log("🧾 Tool Approvals");
    console.log("");

    if (approvals.length === 0) {
      console.log("No approvals yet.");
      return;
    }

    for (const approval of approvals) {
      console.log(`${approval.decision === "approved" ? "✅" : approval.decision === "denied" ? "❌" : "🟡"} ${approval.id}`);
      console.log(`   tool: ${approval.toolId}`);
      console.log(`   decision: ${approval.decision}`);
      console.log(`   createdAt: ${approval.createdAt}`);
    }

    return;
  }

  if (action === "approval-show") {
    const id = args[1];
    const approval = readApproval(paths, id);

    if (!approval) {
      console.log(`❌ Approval not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(approval, null, 2));
    return;
  }

  if (action === "approve") {
    const id = args[1];
    const approval = decideApproval(paths, id, "approved", "Approved locally by user.");

    console.log(`✅ Approval granted: ${approval.id}`);
    return;
  }

  if (action === "deny-approval") {
    const id = args[1];
    const approval = decideApproval(paths, id, "denied", "Denied locally by user.");

    console.log(`❌ Approval denied: ${approval.id}`);
    return;
  }

  console.log("Forge Tool Execution and Permissions");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge tool init");
  console.log("  aift-forge tool list");
  console.log("  aift-forge tool policy");
  console.log("  aift-forge tool run git.status");
  console.log("  aift-forge tool run repo.read --input file=README.md");
  console.log("  aift-forge tool approvals");
  console.log("  aift-forge tool approve approval-id");
  console.log("  aift-forge tool runs");
}
JS

cat > scripts/aift-tool-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { ensureDefaultToolPolicy, listApprovals, listToolRuns } from "../packages/forge-core/src/tools/store.mjs";
import { listTools } from "../packages/forge-core/src/tools/registry.mjs";
import { evaluateToolPermission } from "../packages/forge-core/src/tools/policy.mjs";
import { runTool } from "../packages/forge-core/src/tools/runtime.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/tools", { recursive: true, force: true });

const policy = ensureDefaultToolPolicy(paths);
assert.equal(policy.id, "default");

const tools = listTools();
assert.ok(tools.some((tool) => tool.id === "git.status"));

const allowed = evaluateToolPermission(paths, "git.status", {});
assert.equal(allowed.ok, true);

const denied = evaluateToolPermission(paths, "shell.exec", { command: "echo hello" });
assert.equal(denied.ok, false);
assert.equal(denied.decision, "approval-required");
assert.ok(denied.approvalId);

const result = await runTool(paths, "repo.status", {});
assert.equal(result.ok, true);
assert.ok(result.runId);

const approvals = listApprovals(paths);
assert.ok(approvals.length >= 1);

const runs = listToolRuns(paths);
assert.ok(runs.some((run) => run.toolId === "repo.status"));

console.log("✅ Tool execution and permission smoke test passed.");
JS

cat > docs/TOOL_EXECUTION_PHASE_10.md <<'MD'
# AIFT-Forge Phase 10: Tool Execution and Permission System

Phase 10 adds local tool execution with explicit governance.

This lets agents and workflows request tools safely without gaining unrestricted access.

## Storage

Tool records live under:

    .forge/tools/

Subdirectories:

    runs/
    approvals/
    policies/

## Tool Policy

Default policy:

- read-only tools allowed
- write/shell tools require approval
- no cloud fallback
- local-only network posture
- denied-by-default for unknown tools

## Built-In Tools

Read-only:

- `repo.status`
- `repo.files`
- `repo.read`
- `git.status`
- `git.diff`
- `git.log`
- `knowledge.search`
- `knowledge.status`

Restricted:

- `shell.exec`

## Commands

Initialize policy:

    aift-forge tool init

List tools:

    aift-forge tool list

Show policy:

    aift-forge tool policy

Run a read-only tool:

    aift-forge tool run git.status

Read a file:

    aift-forge tool run repo.read --input file=README.md

List approvals:

    aift-forge tool approvals

Approve a pending tool request:

    aift-forge tool approve approval-id

Show runs:

    aift-forge tool runs

## Governance

Tool execution is:

- local-first
- policy-gated
- approval-backed
- JSON recorded
- audit-friendly
- no hidden writes
- no silent shell execution
- no cloud fallback
MD

node --check packages/forge-core/src/tools/store.mjs
node --check packages/forge-core/src/tools/registry.mjs
node --check packages/forge-core/src/tools/policy.mjs
node --check packages/forge-core/src/tools/runtime.mjs
node --check packages/forge-core/src/commands/tool.mjs
node --check scripts/aift-tool-smoke.mjs
node scripts/aift-tool-smoke.mjs

echo ""
echo "✅ Phase 10 Tool Execution and Permission System complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  tool -> packages/forge-core/src/commands/tool.mjs"
echo ""
echo "Then test:"
echo "  aift-forge tool init"
echo "  aift-forge tool list"
echo "  aift-forge tool run git.status"
echo "  aift-forge tool approvals"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 10 tool execution permissions\""
echo "  git push origin main"
