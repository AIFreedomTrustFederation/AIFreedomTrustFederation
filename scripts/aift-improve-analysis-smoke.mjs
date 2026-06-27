import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { analyzeScan } from "../packages/forge-core/src/improve/analyzer.mjs";
import { scanRepositoryFiles } from "../packages/forge-core/src/improve/scanner.mjs";
import { listProposals, listReports, listScans } from "../packages/forge-core/src/improve/store.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/improvement", { recursive: true, force: true });

const scan = scanRepositoryFiles(paths, { limit: 2000 });

assert.ok(scan.summary.totalFiles > 0);

const analysis = analyzeScan(paths, scan);

assert.ok(analysis.report.id);
assert.ok(Array.isArray(analysis.report.findings));
assert.ok(Array.isArray(analysis.proposals));
assert.ok(listScans(paths).length >= 1);
assert.ok(listReports(paths).length >= 1);
assert.ok(listProposals(paths).length >= 1);

console.log("✅ Self-analysis smoke test passed.");
