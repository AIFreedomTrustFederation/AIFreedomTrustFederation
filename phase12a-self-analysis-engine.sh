#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🧠 AIFT-Forge Phase 12A: Self-Analysis Engine"

mkdir -p packages/forge-core/src/improve
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/improvement/scans
mkdir -p .forge/improvement/reports
mkdir -p .forge/improvement/proposals
mkdir -p .forge/improvement/metrics
mkdir -p .forge/improvement/architecture
mkdir -p .forge/improvement/history

cat > packages/forge-core/src/improve/store.mjs <<'JS'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function improvementDir(paths) {
  return join(paths.repoRoot, ".forge", "improvement");
}

export function scansDir(paths) {
  return join(improvementDir(paths), "scans");
}

export function reportsDir(paths) {
  return join(improvementDir(paths), "reports");
}

export function proposalsDir(paths) {
  return join(improvementDir(paths), "proposals");
}

export function metricsDir(paths) {
  return join(improvementDir(paths), "metrics");
}

export function architectureDir(paths) {
  return join(improvementDir(paths), "architecture");
}

export function historyDir(paths) {
  return join(improvementDir(paths), "history");
}

export function ensureImprovementStore(paths) {
  mkdirSync(scansDir(paths), { recursive: true });
  mkdirSync(reportsDir(paths), { recursive: true });
  mkdirSync(proposalsDir(paths), { recursive: true });
  mkdirSync(metricsDir(paths), { recursive: true });
  mkdirSync(architectureDir(paths), { recursive: true });
  mkdirSync(historyDir(paths), { recursive: true });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function scanFile(paths, id) {
  return join(scansDir(paths), `${normalizeId(id)}.json`);
}

export function reportFile(paths, id) {
  return join(reportsDir(paths), `${normalizeId(id)}.json`);
}

export function proposalFile(paths, id) {
  return join(proposalsDir(paths), `${normalizeId(id)}.json`);
}

export function metricFile(paths, id) {
  return join(metricsDir(paths), `${normalizeId(id)}.json`);
}

export function architectureFile(paths, id) {
  return join(architectureDir(paths), `${normalizeId(id)}.json`);
}

export function createScan(paths, scan) {
  ensureImprovementStore(paths);

  const id = normalizeId(scan.id ?? `scan-${Date.now()}`);

  const next = {
    schema: "aift.forge.improvement-scan.v1",
    id,
    status: scan.status ?? "complete",
    files: scan.files ?? [],
    summary: scan.summary ?? {},
    createdAt: new Date().toISOString()
  };

  writeJson(scanFile(paths, id), next);
  return next;
}

export function readScan(paths, id) {
  ensureImprovementStore(paths);

  const file = scanFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listScans(paths) {
  ensureImprovementStore(paths);

  return readdirSync(scansDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(scansDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function createReport(paths, report) {
  ensureImprovementStore(paths);

  const id = normalizeId(report.id ?? `report-${Date.now()}`);

  const next = {
    schema: "aift.forge.improvement-report.v1",
    id,
    scanId: report.scanId ?? null,
    title: report.title ?? "Improvement Report",
    metrics: report.metrics ?? {},
    findings: report.findings ?? [],
    score: Number(report.score ?? 0),
    createdAt: new Date().toISOString()
  };

  writeJson(reportFile(paths, id), next);
  return next;
}

export function listReports(paths) {
  ensureImprovementStore(paths);

  return readdirSync(reportsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(reportsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function createProposal(paths, proposal) {
  ensureImprovementStore(paths);

  const id = normalizeId(proposal.id ?? `proposal-${Date.now()}`);

  const next = {
    schema: "aift.forge.improvement-proposal.v1",
    id,
    title: proposal.title ?? "Improvement Proposal",
    category: proposal.category ?? "general",
    priority: proposal.priority ?? "medium",
    risk: proposal.risk ?? "low",
    summary: proposal.summary ?? "",
    evidence: proposal.evidence ?? [],
    recommendedAction: proposal.recommendedAction ?? "",
    status: proposal.status ?? "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(proposalFile(paths, id), next);
  return next;
}

export function readProposal(paths, id) {
  ensureImprovementStore(paths);

  const file = proposalFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listProposals(paths) {
  ensureImprovementStore(paths);

  return readdirSync(proposalsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(proposalsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function writeMetric(paths, id, metric) {
  ensureImprovementStore(paths);

  const next = {
    schema: "aift.forge.improvement-metric.v1",
    id: normalizeId(id),
    ...metric,
    updatedAt: new Date().toISOString()
  };

  writeJson(metricFile(paths, id), next);
  return next;
}

export function writeArchitecture(paths, id, architecture) {
  ensureImprovementStore(paths);

  const next = {
    schema: "aift.forge.architecture-map.v1",
    id: normalizeId(id),
    ...architecture,
    updatedAt: new Date().toISOString()
  };

  writeJson(architectureFile(paths, id), next);
  return next;
}
JS

cat > packages/forge-core/src/improve/scanner.mjs <<'JS'
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import crypto from "node:crypto";
import { createScan } from "./store.mjs";

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage"
]);

const CODE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".sh"
]);

export function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function scanRepositoryFiles(paths, options = {}) {
  const limit = Number(options.limit ?? 2000);
  const files = [];

  walk(paths.repoRoot, paths.repoRoot, files, limit);

  const summary = {
    totalFiles: files.length,
    byExtension: {},
    totalLines: 0,
    totalBytes: 0
  };

  for (const file of files) {
    summary.byExtension[file.extension] ??= 0;
    summary.byExtension[file.extension] += 1;
    summary.totalLines += file.lines;
    summary.totalBytes += file.bytes;
  }

  return createScan(paths, {
    files,
    summary
  });
}

function walk(root, dir, files, limit) {
  if (files.length >= limit) return;

  for (const name of readdirSync(dir)) {
    if (files.length >= limit) return;
    if (DEFAULT_IGNORES.has(name)) continue;

    const full = join(dir, name);
    const rel = relative(root, full);

    let stat;

    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walk(root, full, files, limit);
      continue;
    }

    const extension = extname(name) || "none";
    if (!CODE_EXTENSIONS.has(extension)) continue;

    let text = "";

    try {
      text = readFileSync(full, "utf8");
    } catch {
      continue;
    }

    const lines = text.split("\n").length;

    files.push({
      path: rel,
      extension,
      bytes: stat.size,
      lines,
      sha256: hashText(text),
      imports: extractImports(text),
      exports: extractExports(text),
      todos: extractTodos(text),
      functions: extractFunctions(text),
      textPreview: text.slice(0, 500)
    });
  }
}

export function extractImports(text) {
  const imports = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    const esm = trimmed.match(/^import\s+.*?from\s+["'](.+)["']/);
    const bare = trimmed.match(/^import\s+["'](.+)["']/);
    const req = trimmed.match(/require\(["'](.+)["']\)/);

    if (esm) imports.push(esm[1]);
    else if (bare) imports.push(bare[1]);
    else if (req) imports.push(req[1]);
  }

  return imports;
}

export function extractExports(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export "))
    .slice(0, 100);
}

export function extractTodos(text) {
  return text
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((item) => /TODO|FIXME|HACK|XXX/i.test(item.text));
}

export function extractFunctions(text) {
  const found = [];

  for (const line of text.split("\n")) {
    const fn = line.match(/(?:export\s+)?function\s+([a-zA-Z0-9_]+)/);
    const arrow = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/);

    if (fn) found.push(fn[1]);
    else if (arrow) found.push(arrow[1]);
  }

  return found.slice(0, 100);
}

export function latestScan(paths) {
  const { listScans } = awaitImportStore();
  return listScans(paths)[0] ?? scanRepositoryFiles(paths);
}

function awaitImportStore() {
  return globalThis.__aiftImproveStore ??= {
    listScans: () => []
  };
}
JS

python3 - <<'PY'
from pathlib import Path
p = Path("packages/forge-core/src/improve/scanner.mjs")
s = p.read_text()
s = s.replace('import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";', 'import { readdirSync, readFileSync, statSync } from "node:fs";')
s = s.replace("""
export function latestScan(paths) {
  const { listScans } = awaitImportStore();
  return listScans(paths)[0] ?? scanRepositoryFiles(paths);
}

function awaitImportStore() {
  return globalThis.__aiftImproveStore ??= {
    listScans: () => []
  };
}
""", "")
p.write_text(s)
PY

cat > packages/forge-core/src/improve/analyzer.mjs <<'JS'
import { createProposal, createReport, writeArchitecture, writeMetric } from "./store.mjs";
import { scanRepositoryFiles } from "./scanner.mjs";

export function buildArchitectureMap(paths, scan) {
  const packages = {};
  const commandFiles = [];
  const modules = [];

  for (const file of scan.files) {
    const parts = file.path.split("/");

    if (file.path.endsWith("package.json")) {
      packages[file.path] = {
        path: file.path,
        preview: file.textPreview
      };
    }

    if (file.path.includes("/src/commands/")) {
      commandFiles.push(file.path);
    }

    if (file.path.includes("/src/")) {
      modules.push({
        path: file.path,
        imports: file.imports,
        exports: file.exports,
        functions: file.functions
      });
    }

    if (parts[0] === "packages" || parts[0] === "apps") {
      packages[parts.slice(0, 2).join("/")] ??= {
        path: parts.slice(0, 2).join("/"),
        files: 0
      };
      packages[parts.slice(0, 2).join("/")].files += 1;
    }
  }

  return writeArchitecture(paths, `architecture-${Date.now()}`, {
    scanId: scan.id,
    packages,
    commandFiles,
    modules,
    moduleCount: modules.length,
    commandCount: commandFiles.length
  });
}

export function analyzeScan(paths, scan = null) {
  const currentScan = scan ?? scanRepositoryFiles(paths);
  const architecture = buildArchitectureMap(paths, currentScan);

  const findings = [
    ...findLargeFiles(currentScan),
    ...findTodos(currentScan),
    ...findDuplicatePreviews(currentScan),
    ...findMissingDocs(currentScan),
    ...findCommandCoverage(currentScan)
  ];

  const metrics = {
    totalFiles: currentScan.summary.totalFiles,
    totalLines: currentScan.summary.totalLines,
    totalBytes: currentScan.summary.totalBytes,
    findingCount: findings.length,
    largeFileCount: findings.filter((item) => item.category === "complexity").length,
    todoCount: findings.filter((item) => item.category === "todo").length,
    duplicateCount: findings.filter((item) => item.category === "duplication").length,
    docFindingCount: findings.filter((item) => item.category === "documentation").length
  };

  const score = computeDebtScore(metrics);

  writeMetric(paths, `metrics-${Date.now()}`, metrics);

  const report = createReport(paths, {
    scanId: currentScan.id,
    title: "Forge Self-Analysis Report",
    metrics,
    findings,
    score
  });

  const proposals = generateProposals(paths, report, findings);

  return {
    scan: currentScan,
    architecture,
    report,
    proposals
  };
}

export function computeDebtScore(metrics) {
  const raw =
    metrics.findingCount * 3 +
    metrics.largeFileCount * 5 +
    metrics.todoCount * 2 +
    metrics.duplicateCount * 4 +
    metrics.docFindingCount * 2;

  return Math.min(100, raw);
}

export function findLargeFiles(scan) {
  return scan.files
    .filter((file) => file.lines > 400)
    .map((file) => ({
      category: "complexity",
      severity: file.lines > 800 ? "high" : "medium",
      path: file.path,
      message: `Large file with ${file.lines} lines.`,
      recommendation: "Consider splitting this module into smaller focused files."
    }));
}

export function findTodos(scan) {
  return scan.files.flatMap((file) =>
    file.todos.map((todo) => ({
      category: "todo",
      severity: "low",
      path: file.path,
      line: todo.line,
      message: todo.text,
      recommendation: "Review TODO/FIXME and convert to tracked issue or planned task."
    }))
  );
}

export function findDuplicatePreviews(scan) {
  const byHash = new Map();

  for (const file of scan.files) {
    if (file.lines < 20) continue;
    const key = file.sha256;
    byHash.set(key, [...(byHash.get(key) ?? []), file.path]);
  }

  return [...byHash.values()]
    .filter((paths) => paths.length > 1)
    .map((paths) => ({
      category: "duplication",
      severity: "medium",
      paths,
      message: `Duplicate file content detected across ${paths.length} files.`,
      recommendation: "Inspect duplication and consolidate if appropriate."
    }));
}

export function findMissingDocs(scan) {
  const hasReadme = scan.files.some((file) => file.path.toLowerCase() === "readme.md");
  const hasDocs = scan.files.some((file) => file.path.startsWith("docs/"));

  const findings = [];

  if (!hasReadme) {
    findings.push({
      category: "documentation",
      severity: "high",
      message: "Repository README.md not found.",
      recommendation: "Add a root README explaining purpose, setup, and governance."
    });
  }

  if (!hasDocs) {
    findings.push({
      category: "documentation",
      severity: "medium",
      message: "No docs directory detected.",
      recommendation: "Add docs for architecture and operating policy."
    });
  }

  return findings;
}

export function findCommandCoverage(scan) {
  const commandFiles = scan.files.filter((file) => file.path.includes("/src/commands/"));
  const docs = scan.files.filter((file) => file.path.startsWith("docs/"));
  const docsText = docs.map((file) => file.textPreview).join("\n").toLowerCase();

  return commandFiles
    .filter((file) => {
      const command = file.path.split("/").pop().replace(/\.(mjs|js|ts)$/, "");
      return !docsText.includes(command.toLowerCase());
    })
    .map((file) => ({
      category: "documentation",
      severity: "low",
      path: file.path,
      message: "Command may not be documented in docs preview scan.",
      recommendation: "Ensure command usage appears in docs."
    }));
}

export function generateProposals(paths, report, findings) {
  const proposals = [];

  const groups = new Map();

  for (const finding of findings) {
    groups.set(finding.category, [...(groups.get(finding.category) ?? []), finding]);
  }

  for (const [category, items] of groups.entries()) {
    const priority = items.some((item) => item.severity === "high")
      ? "high"
      : items.some((item) => item.severity === "medium")
        ? "medium"
        : "low";

    proposals.push(createProposal(paths, {
      title: `Improve ${category}`,
      category,
      priority,
      risk: category === "documentation" ? "low" : "medium",
      summary: `${items.length} ${category} finding(s) detected.`,
      evidence: items.slice(0, 10),
      recommendedAction: items[0]?.recommendation ?? "Review findings and plan improvement."
    }));
  }

  if (proposals.length === 0) {
    proposals.push(createProposal(paths, {
      title: "Maintain current architecture health",
      category: "maintenance",
      priority: "low",
      risk: "low",
      summary: "No major findings detected.",
      evidence: [],
      recommendedAction: "Continue running regular self-analysis scans."
    }));
  }

  return proposals;
}
JS

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
JS

cat > scripts/aift-improve-analysis-smoke.mjs <<'JS'
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
JS

cat > docs/SELF_ANALYSIS_PHASE_12A.md <<'MD'
# AIFT-Forge Phase 12A: Self-Analysis Engine

Phase 12A teaches Forge to inspect itself without modifying code.

## Storage

Records live under:

    .forge/improvement/

Subdirectories:

    scans/
    reports/
    proposals/
    metrics/
    architecture/
    history/

## Commands

Status:

    aift-forge improve status

Scan repository:

    aift-forge improve scan

Analyze repository:

    aift-forge improve analyze

List scans:

    aift-forge improve scans

List reports:

    aift-forge improve reports

List proposals:

    aift-forge improve proposals

Show proposal:

    aift-forge improve proposal-show proposal-id

## Governance

Phase 12A is read-only.

It creates:

- scans
- metrics
- architecture maps
- reports
- proposals

It does not change repository source code.
MD

node --check packages/forge-core/src/improve/store.mjs
node --check packages/forge-core/src/improve/scanner.mjs
node --check packages/forge-core/src/improve/analyzer.mjs
node --check packages/forge-core/src/commands/improve.mjs
node --check scripts/aift-improve-analysis-smoke.mjs
node scripts/aift-improve-analysis-smoke.mjs

echo ""
echo "✅ Phase 12A Self-Analysis Engine complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  improve -> packages/forge-core/src/commands/improve.mjs"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 12A self-analysis engine\""
echo "  git push origin main"
