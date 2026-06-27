#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🔗 AIFT-Forge Phase 12C: Improve Command Integration"

mkdir -p packages/forge-core/src/improve
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/improvement/history

cat > packages/forge-core/src/commands/improve.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  listProposals,
  listReports,
  listScans,
  readProposal
} from "../improve/store.mjs";
import { scanRepositoryFiles } from "../improve/scanner.mjs";
import { analyzeScan } from "../improve/analyzer.mjs";
import {
  applyPatch,
  decideApproval,
  generatePatchFromProposal,
  listApprovals,
  listPatches,
  readPatch,
  validatePatch
} from "../improve/patches.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

export default async function improve(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  if (action === "status") {
    console.log("🧠 Forge Self-Improvement System");
    console.log("");
    console.log(`scans: ${listScans(paths).length}`);
    console.log(`reports: ${listReports(paths).length}`);
    console.log(`proposals: ${listProposals(paths).length}`);
    console.log(`patches: ${listPatches(paths).length}`);
    console.log(`approvals: ${listApprovals(paths).length}`);
    return;
  }

  if (action === "scan") {
    const scan = scanRepositoryFiles(paths);

    console.log("✅ Repository scan complete");
    console.log(`scan: ${scan.id}`);
    console.log(`files: ${scan.summary.totalFiles}`);
    console.log(`lines: ${scan.summary.totalLines}`);
    return;
  }

  if (action === "analyze") {
    const result = analyzeScan(paths);

    console.log("✅ Self-analysis complete");
    console.log(`scan: ${result.scan.id}`);
    console.log(`report: ${result.report.id}`);
    console.log(`score: ${result.report.score}`);
    console.log(`findings: ${result.report.findings.length}`);
    console.log(`proposals: ${result.proposals.length}`);
    return;
  }

  if (action === "scans") {
    const scans = listScans(paths);

    console.log("🔎 Repository Scans");
    console.log("");

    if (scans.length === 0) {
      console.log("No scans yet.");
      return;
    }

    for (const scan of scans) {
      console.log(`🔎 ${scan.id}`);
      console.log(`   files: ${scan.summary.totalFiles}`);
      console.log(`   lines: ${scan.summary.totalLines}`);
      console.log(`   createdAt: ${scan.createdAt}`);
    }

    return;
  }

  if (action === "reports") {
    const reports = listReports(paths);

    console.log("📊 Improvement Reports");
    console.log("");

    if (reports.length === 0) {
      console.log("No reports yet.");
      return;
    }

    for (const report of reports) {
      console.log(`📊 ${report.id}`);
      console.log(`   score: ${report.score}`);
      console.log(`   findings: ${report.findings.length}`);
      console.log(`   createdAt: ${report.createdAt}`);
    }

    return;
  }

  if (action === "proposals") {
    const proposals = listProposals(paths);

    console.log("💡 Improvement Proposals");
    console.log("");

    if (proposals.length === 0) {
      console.log("No proposals yet.");
      return;
    }

    for (const proposal of proposals) {
      console.log(`${proposal.priority === "high" ? "🔥" : proposal.priority === "medium" ? "🟡" : "✅"} ${proposal.id}`);
      console.log(`   ${proposal.title}`);
      console.log(`   category: ${proposal.category}`);
      console.log(`   risk: ${proposal.risk}`);
      console.log(`   status: ${proposal.status}`);
    }

    return;
  }

  if (action === "proposal-show") {
    const id = args[1];
    const proposal = readProposal(paths, id);

    if (!proposal) {
      console.log(`❌ Proposal not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(proposal, null, 2));
    return;
  }

  if (action === "patch-generate" || action === "generate-patch") {
    const proposalId = args[1];

    if (!proposalId) {
      console.log("Usage:");
      console.log("  aift-forge improve patch-generate proposal-id");
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

  if (action === "patch-show") {
    const id = args[1];
    const patch = readPatch(paths, id);

    if (!patch) {
      console.log(`❌ Patch not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(patch, null, 2));
    return;
  }

  if (action === "patch-validate" || action === "validate") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge improve patch-validate patch-id");
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

  if (action === "patch-apply" || action === "apply") {
    const id = args[1];
    const approvalId = readFlag(args, "--approval", null);

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge improve patch-apply patch-id --approval approval-id");
      return;
    }

    const result = applyPatch(paths, id, { approvalId });

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      if (result.approvalId) {
        console.log(`approval: ${result.approvalId}`);
        console.log(`approve with: aift-forge improve approve ${result.approvalId}`);
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
      console.log("  aift-forge improve approve approval-id");
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
      console.log("  aift-forge improve reject approval-id");
      return;
    }

    const approval = decideApproval(paths, id, "denied", "Rejected locally by user.");

    console.log(`❌ Rejected: ${approval.id}`);
    return;
  }

  if (action === "doctor") {
    console.log("🩺 Forge Improve Doctor");
    console.log("");

    const checks = [
      ["store", async () => Boolean(await import("../improve/store.mjs"))],
      ["scanner", async () => Boolean(await import("../improve/scanner.mjs"))],
      ["analyzer", async () => Boolean(await import("../improve/analyzer.mjs"))],
      ["patches", async () => Boolean(await import("../improve/patches.mjs"))]
    ];

    let failed = 0;

    for (const [label, fn] of checks) {
      try {
        await fn();
        console.log(`✅ ${label}`);
      } catch (error) {
        failed += 1;
        console.log(`❌ ${label}: ${error.message}`);
      }
    }

    if (failed > 0) {
      console.log("");
      console.log(`❌ Improve doctor failed with ${failed} issue(s).`);
      return;
    }

    console.log("");
    console.log("✅ Improve command surface is integrated.");
    return;
  }

  console.log("Forge Self-Improvement System");
  console.log("");
  console.log("Analysis:");
  console.log("  aift-forge improve status");
  console.log("  aift-forge improve scan");
  console.log("  aift-forge improve analyze");
  console.log("  aift-forge improve scans");
  console.log("  aift-forge improve reports");
  console.log("  aift-forge improve proposals");
  console.log("  aift-forge improve proposal-show proposal-id");
  console.log("");
  console.log("Patches:");
  console.log("  aift-forge improve patch-generate proposal-id");
  console.log("  aift-forge improve patches");
  console.log("  aift-forge improve patch-show patch-id");
  console.log("  aift-forge improve patch-validate patch-id");
  console.log("  aift-forge improve patch-apply patch-id --approval approval-id");
  console.log("  aift-forge improve approvals");
  console.log("  aift-forge improve approve approval-id");
  console.log("  aift-forge improve reject approval-id");
  console.log("");
  console.log("Compatibility:");
  console.log("  aift-forge improve-patch ... still works if routed separately");
}
JS

cat > scripts/aift-improve-integrated-smoke.mjs <<'JS'
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
JS

cat > docs/IMPROVE_COMMAND_PHASE_12C.md <<'MD'
# AIFT-Forge Phase 12C: Improve Command Integration

Phase 12C unifies Phase 12A and Phase 12B behind one `improve` command surface.

## Unified Command

Analysis:

    aift-forge improve status
    aift-forge improve scan
    aift-forge improve analyze
    aift-forge improve scans
    aift-forge improve reports
    aift-forge improve proposals
    aift-forge improve proposal-show proposal-id

Patches:

    aift-forge improve patch-generate proposal-id
    aift-forge improve patches
    aift-forge improve patch-show patch-id
    aift-forge improve patch-validate patch-id
    aift-forge improve patch-apply patch-id --approval approval-id
    aift-forge improve approvals
    aift-forge improve approve approval-id
    aift-forge improve reject approval-id

Doctor:

    aift-forge improve doctor

## Compatibility

The separate `improve-patch` command may remain available, but `improve` is now the preferred command surface.
MD

node --check packages/forge-core/src/commands/improve.mjs
node --check scripts/aift-improve-integrated-smoke.mjs
node scripts/aift-improve-integrated-smoke.mjs

echo ""
echo "✅ Phase 12C Improve Command Integration complete."
echo ""
echo "IMPORTANT:"
echo "Wire or keep the command router entry:"
echo "  improve -> packages/forge-core/src/commands/improve.mjs"
echo ""
echo "Recommended tests:"
echo "  aift-forge improve doctor"
echo "  aift-forge improve status"
echo "  aift-forge improve analyze"
echo "  aift-forge improve proposals"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Integrate Phase 12 improve command surface\""
echo "  git push origin main"
