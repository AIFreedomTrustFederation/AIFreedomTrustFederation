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
