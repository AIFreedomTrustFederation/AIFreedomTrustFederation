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
