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
