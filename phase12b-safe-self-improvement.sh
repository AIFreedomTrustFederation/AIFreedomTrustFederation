#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🛡️ AIFT-Forge Phase 12B: Safe Self-Improvement Workflow"

mkdir -p packages/forge-core/src/improve
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/improvement/patches
mkdir -p .forge/improvement/approvals
mkdir -p .forge/improvement/snapshots
mkdir -p .forge/improvement/history

cat > packages/forge-core/src/improve/patches.mjs <<'JS'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  improvementDir,
  normalizeId,
  readJson,
  readProposal,
  writeJson
} from "./store.mjs";

export function patchesDir(paths) {
  return join(improvementDir(paths), "patches");
}

export function approvalsDir(paths) {
  return join(improvementDir(paths), "approvals");
}

export function snapshotsDir(paths) {
  return join(improvementDir(paths), "snapshots");
}

export function ensurePatchStore(paths) {
  mkdirSync(patchesDir(paths), { recursive: true });
  mkdirSync(approvalsDir(paths), { recursive: true });
  mkdirSync(snapshotsDir(paths), { recursive: true });
}

export function patchFile(paths, id) {
  return join(patchesDir(paths), `${normalizeId(id)}.json`);
}

export function approvalFile(paths, id) {
  return join(approvalsDir(paths), `${normalizeId(id)}.json`);
}

export function snapshotFile(paths, id) {
  return join(snapshotsDir(paths), `${normalizeId(id)}.json`);
}

export function createPatch(paths, patch) {
  ensurePatchStore(paths);

  const id = normalizeId(patch.id ?? `patch-${Date.now()}`);

  const next = {
    schema: "aift.forge.improvement-patch.v1",
    id,
    proposalId: patch.proposalId ?? null,
    title: patch.title ?? "Improvement Patch",
    risk: patch.risk ?? "low",
    status: patch.status ?? "draft",
    operations: patch.operations ?? [],
    rationale: patch.rationale ?? "",
    validation: patch.validation ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(patchFile(paths, id), next);
  return next;
}

export function readPatch(paths, id) {
  ensurePatchStore(paths);

  const file = patchFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listPatches(paths) {
  ensurePatchStore(paths);

  return readdirSync(patchesDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(patchesDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function updatePatch(paths, id, patch) {
  const existing = readPatch(paths, id);
  if (!existing) throw new Error(`Patch not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  writeJson(patchFile(paths, id), next);
  return next;
}

export function createApproval(paths, approval) {
  ensurePatchStore(paths);

  const id = normalizeId(approval.id ?? `improve-approval-${Date.now()}`);

  const next = {
    schema: "aift.forge.improvement-approval.v1",
    id,
    patchId: approval.patchId,
    decision: approval.decision ?? "pending",
    reason: approval.reason ?? "",
    createdAt: new Date().toISOString(),
    decidedAt: null
  };

  writeJson(approvalFile(paths, id), next);
  return next;
}

export function readApproval(paths, id) {
  ensurePatchStore(paths);

  const file = approvalFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listApprovals(paths) {
  ensurePatchStore(paths);

  return readdirSync(approvalsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(approvalsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
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

export function generatePatchFromProposal(paths, proposalId) {
  const proposal = readProposal(paths, proposalId);

  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);

  const content = [
    `# Improvement Plan: ${proposal.title}`,
    "",
    `Category: ${proposal.category}`,
    `Priority: ${proposal.priority}`,
    `Risk: ${proposal.risk}`,
    "",
    "## Summary",
    "",
    proposal.summary,
    "",
    "## Recommended Action",
    "",
    proposal.recommendedAction,
    "",
    "## Evidence",
    "",
    ...(proposal.evidence ?? []).map((item, index) => `${index + 1}. ${JSON.stringify(item)}`)
  ].join("\n");

  return createPatch(paths, {
    proposalId: proposal.id,
    title: proposal.title,
    risk: proposal.risk,
    rationale: "Generated from improvement proposal. This default patch writes a review plan only.",
    operations: [
      {
        type: "write-file",
        path: `docs/improvement-plans/${proposal.id}.md`,
        content
      }
    ],
    validation: [
      {
        type: "node-check",
        path: "packages/forge-core/src/improve/patches.mjs"
      }
    ]
  });
}

export function createSnapshot(paths, patch) {
  ensurePatchStore(paths);

  const id = normalizeId(`snapshot-${patch.id}-${Date.now()}`);

  const files = [];

  for (const op of patch.operations ?? []) {
    if (!op.path) continue;

    const absolute = join(paths.repoRoot, op.path);

    files.push({
      path: op.path,
      existed: existsSync(absolute),
      content: existsSync(absolute) ? readFileSync(absolute, "utf8") : null
    });
  }

  const snapshot = {
    schema: "aift.forge.improvement-snapshot.v1",
    id,
    patchId: patch.id,
    files,
    createdAt: new Date().toISOString()
  };

  writeJson(snapshotFile(paths, id), snapshot);
  return snapshot;
}

export function applyPatch(paths, patchId, options = {}) {
  const patch = readPatch(paths, patchId);

  if (!patch) {
    return {
      ok: false,
      error: `Patch not found: ${patchId}`
    };
  }

  const approval = options.approvalId ? readApproval(paths, options.approvalId) : null;

  if (!approval || approval.patchId !== patch.id || approval.decision !== "approved") {
    const pending = createApproval(paths, {
      patchId: patch.id,
      reason: "Patch requires explicit approval before application."
    });

    updatePatch(paths, patch.id, {
      status: "approval-required"
    });

    return {
      ok: false,
      status: "approval-required",
      approvalId: pending.id,
      error: "Patch requires explicit approval."
    };
  }

  const snapshot = createSnapshot(paths, patch);

  for (const op of patch.operations ?? []) {
    if (op.type === "write-file") {
      const target = join(paths.repoRoot, op.path);

      if (!target.startsWith(paths.repoRoot)) {
        return {
          ok: false,
          error: `Refusing to write outside repo: ${op.path}`
        };
      }

      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, op.content ?? "", "utf8");
    } else {
      return {
        ok: false,
        error: `Unsupported patch operation: ${op.type}`
      };
    }
  }

  updatePatch(paths, patch.id, {
    status: "applied",
    snapshotId: snapshot.id,
    appliedAt: new Date().toISOString()
  });

  return {
    ok: true,
    patchId: patch.id,
    snapshotId: snapshot.id,
    operations: patch.operations.length
  };
}

export function validatePatch(paths, patchId) {
  const patch = readPatch(paths, patchId);

  if (!patch) {
    return {
      ok: false,
      error: `Patch not found: ${patchId}`
    };
  }

  const results = [];

  for (const check of patch.validation ?? []) {
    if (check.type === "node-check") {
      const result = spawnSync("node", ["--check", check.path], {
        cwd: paths.repoRoot,
        encoding: "utf8"
      });

      results.push({
        type: check.type,
        path: check.path,
        ok: result.status === 0,
        stdout: result.stdout,
        stderr: result.stderr
      });
    }
  }

  return {
    ok: results.every((result) => result.ok),
    results
  };
}
JS

cat > packages/forge-core/src/commands/improve-patch.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  applyPatch,
  decideApproval,
  generatePatchFromProposal,
  listApprovals,
  listPatches,
  readPatch,
  validatePatch
} from "../improve/patches.mjs";

export default async function improvePatch(args = []) {
  const action = args[0] ?? "patches";
  const paths = getForgePaths(import.meta.url);

  if (action === "generate") {
    const proposalId = args[1];

    if (!proposalId) {
      console.log("Usage:");
      console.log("  aift-forge improve-patch generate proposal-id");
      return;
    }

    const patch = generatePatchFromProposal(paths, proposalId);

    console.log("✅ Patch generated");
    console.log(`patch: ${patch.id}`);
    console.log(`proposal: ${patch.proposalId}`);
    console.log(`operations: ${patch.operations.length}`);
    return;
  }

  if (action === "patches") {
    const patches = listPatches(paths);

    console.log("🧩 Improvement Patches");
    console.log("");

    if (patches.length === 0) {
      console.log("No patches yet.");
      return;
    }

    for (const patch of patches) {
      console.log(`${patch.status === "applied" ? "✅" : patch.status === "approval-required" ? "🟡" : "⬜"} ${patch.id}`);
      console.log(`   ${patch.title}`);
      console.log(`   risk: ${patch.risk}`);
      console.log(`   status: ${patch.status}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const patch = readPatch(paths, id);

    if (!patch) {
      console.log(`❌ Patch not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(patch, null, 2));
    return;
  }

  if (action === "validate") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge improve-patch validate patch-id");
      return;
    }

    const result = validatePatch(paths, id);

    console.log(result.ok ? "✅ Patch validation passed" : "❌ Patch validation failed");

    for (const item of result.results ?? []) {
      console.log(`${item.ok ? "✅" : "❌"} ${item.type} ${item.path}`);
      if (item.stderr) console.log(item.stderr);
    }

    return;
  }

  if (action === "apply") {
    const id = args[1];
    const approvalIndex = args.indexOf("--approval");
    const approvalId = approvalIndex === -1 ? null : args[approvalIndex + 1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge improve-patch apply patch-id --approval approval-id");
      return;
    }

    const result = applyPatch(paths, id, { approvalId });

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      if (result.approvalId) {
        console.log(`approval: ${result.approvalId}`);
        console.log(`approve with: aift-forge improve-patch approve ${result.approvalId}`);
      }
      return;
    }

    console.log("✅ Patch applied");
    console.log(`patch: ${result.patchId}`);
    console.log(`snapshot: ${result.snapshotId}`);
    console.log(`operations: ${result.operations}`);
    return;
  }

  if (action === "approvals") {
    const approvals = listApprovals(paths);

    console.log("🧾 Improvement Approvals");
    console.log("");

    if (approvals.length === 0) {
      console.log("No approvals yet.");
      return;
    }

    for (const approval of approvals) {
      console.log(`${approval.decision === "approved" ? "✅" : approval.decision === "denied" ? "❌" : "🟡"} ${approval.id}`);
      console.log(`   patch: ${approval.patchId}`);
      console.log(`   decision: ${approval.decision}`);
    }

    return;
  }

  if (action === "approve") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge improve-patch approve approval-id");
      return;
    }

    const approval = decideApproval(paths, id, "approved", "Approved locally by user.");

    console.log(`✅ Approved: ${approval.id}`);
    return;
  }

  if (action === "reject") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge improve-patch reject approval-id");
      return;
    }

    const approval = decideApproval(paths, id, "denied", "Rejected locally by user.");

    console.log(`❌ Rejected: ${approval.id}`);
    return;
  }

  console.log("Forge Safe Self-Improvement Workflow");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge improve-patch generate proposal-id");
  console.log("  aift-forge improve-patch patches");
  console.log("  aift-forge improve-patch show patch-id");
  console.log("  aift-forge improve-patch validate patch-id");
  console.log("  aift-forge improve-patch apply patch-id");
  console.log("  aift-forge improve-patch approvals");
  console.log("  aift-forge improve-patch approve approval-id");
  console.log("  aift-forge improve-patch reject approval-id");
}
JS

cat > scripts/aift-improve-patch-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { existsSync, rmSync } from "node:fs";
import { createProposal } from "../packages/forge-core/src/improve/store.mjs";
import {
  applyPatch,
  decideApproval,
  generatePatchFromProposal,
  listApprovals,
  listPatches,
  validatePatch
} from "../packages/forge-core/src/improve/patches.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/improvement/patches", { recursive: true, force: true });
rmSync(".forge/improvement/approvals", { recursive: true, force: true });
rmSync(".forge/improvement/snapshots", { recursive: true, force: true });
rmSync("docs/improvement-plans/test-proposal.md", { force: true });

const proposal = createProposal(paths, {
  id: "test-proposal",
  title: "Test Proposal",
  category: "documentation",
  priority: "low",
  risk: "low",
  summary: "Test summary",
  recommendedAction: "Write an improvement plan."
});

const patch = generatePatchFromProposal(paths, proposal.id);

assert.equal(patch.proposalId, proposal.id);
assert.equal(patch.operations.length, 1);

const validation = validatePatch(paths, patch.id);
assert.equal(validation.ok, true);

const firstApply = applyPatch(paths, patch.id);
assert.equal(firstApply.ok, false);
assert.equal(firstApply.status, "approval-required");
assert.ok(firstApply.approvalId);

const approval = decideApproval(paths, firstApply.approvalId, "approved", "Smoke test approval");
assert.equal(approval.decision, "approved");

const secondApply = applyPatch(paths, patch.id, {
  approvalId: approval.id
});

assert.equal(secondApply.ok, true);
assert.ok(existsSync("docs/improvement-plans/test-proposal.md"));

assert.ok(listPatches(paths).length >= 1);
assert.ok(listApprovals(paths).length >= 1);

console.log("✅ Safe self-improvement smoke test passed.");
JS

cat > docs/SAFE_SELF_IMPROVEMENT_PHASE_12B.md <<'MD'
# AIFT-Forge Phase 12B: Safe Self-Improvement Workflow

Phase 12B adds approved patch generation and safe application.

## Commands

Generate patch from proposal:

    aift-forge improve-patch generate proposal-id

List patches:

    aift-forge improve-patch patches

Show patch:

    aift-forge improve-patch show patch-id

Validate patch:

    aift-forge improve-patch validate patch-id

Apply patch:

    aift-forge improve-patch apply patch-id

Approve pending patch:

    aift-forge improve-patch approve approval-id

Apply approved patch:

    aift-forge improve-patch apply patch-id --approval approval-id

## Governance

Phase 12B does not silently modify code.

Every patch requires:

- patch record
- explicit approval
- snapshot
- validation support
- auditable JSON records
MD

node --check packages/forge-core/src/improve/patches.mjs
node --check packages/forge-core/src/commands/improve-patch.mjs
node --check scripts/aift-improve-patch-smoke.mjs
node scripts/aift-improve-patch-smoke.mjs

echo ""
echo "✅ Phase 12B Safe Self-Improvement Workflow complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  improve-patch -> packages/forge-core/src/commands/improve-patch.mjs"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 12B safe self-improvement workflow\""
echo "  git push origin main"
