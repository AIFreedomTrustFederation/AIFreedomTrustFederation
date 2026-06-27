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
