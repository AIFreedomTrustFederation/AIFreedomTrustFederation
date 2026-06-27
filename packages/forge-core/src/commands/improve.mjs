import { getForgePaths } from "../lib/paths.mjs";
import {
  listProposals,
  listReports,
  listScans,
  readProposal
} from "../improve/store.mjs";
import { scanRepositoryFiles } from "../improve/scanner.mjs";
import { analyzeScan } from "../improve/analyzer.mjs";

export default async function improve(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

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

  if (action === "status") {
    console.log("🧠 Forge Self-Analysis Engine");
    console.log("");
    console.log(`scans: ${listScans(paths).length}`);
    console.log(`reports: ${listReports(paths).length}`);
    console.log(`proposals: ${listProposals(paths).length}`);
    return;
  }

  console.log("Forge Self-Analysis Engine");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge improve status");
  console.log("  aift-forge improve scan");
  console.log("  aift-forge improve analyze");
  console.log("  aift-forge improve scans");
  console.log("  aift-forge improve reports");
  console.log("  aift-forge improve proposals");
  console.log("  aift-forge improve proposal-show proposal-id");
}
