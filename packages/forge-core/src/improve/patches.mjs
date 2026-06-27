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
