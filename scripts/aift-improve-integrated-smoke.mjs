import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { analyzeScan } from "../packages/forge-core/src/improve/analyzer.mjs";
import { scanRepositoryFiles } from "../packages/forge-core/src/improve/scanner.mjs";
import {
  listApprovals,
  listPatches,
  generatePatchFromProposal,
  applyPatch,
  decideApproval
} from "../packages/forge-core/src/improve/patches.mjs";
import { listProposals } from "../packages/forge-core/src/improve/store.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/improvement/integration-test", { recursive: true, force: true });

const scan = scanRepositoryFiles(paths, { limit: 2000 });
assert.ok(scan.summary.totalFiles > 0);

const analysis = analyzeScan(paths, scan);
assert.ok(analysis.report.id);

const proposal = listProposals(paths)[0];
assert.ok(proposal?.id);

const patch = generatePatchFromProposal(paths, proposal.id);
assert.ok(patch.id);

const firstApply = applyPatch(paths, patch.id);
assert.equal(firstApply.ok, false);
assert.equal(firstApply.status, "approval-required");
assert.ok(firstApply.approvalId);

const approval = decideApproval(paths, firstApply.approvalId, "approved", "Integrated smoke approval");
assert.equal(approval.decision, "approved");

const secondApply = applyPatch(paths, patch.id, { approvalId: approval.id });
assert.equal(secondApply.ok, true);

assert.ok(listPatches(paths).length >= 1);
assert.ok(listApprovals(paths).length >= 1);

console.log("✅ Integrated improve command smoke test passed.");
