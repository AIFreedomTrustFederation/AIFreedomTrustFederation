import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function improvementDir(paths) { return join(paths.repoRoot, ".forge", "improvement"); }
export function scansDir(paths) { return join(improvementDir(paths), "scans"); }
export function reportsDir(paths) { return join(improvementDir(paths), "reports"); }
export function proposalsDir(paths) { return join(improvementDir(paths), "proposals"); }
export function metricsDir(paths) { return join(improvementDir(paths), "metrics"); }
export function architectureDir(paths) { return join(improvementDir(paths), "architecture"); }

export function ensureImprovementStore(paths) {
  for (const dir of [scansDir(paths), reportsDir(paths), proposalsDir(paths), metricsDir(paths), architectureDir(paths)]) {
    mkdirSync(dir, { recursive: true });
  }
}

export function normalizeId(id) {
  return String(id).trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function readJson(file) { return JSON.parse(readFileSync(file, "utf8")); }
export function writeJson(file, value) { writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); }

export function scanFile(paths, id) { return join(scansDir(paths), `${normalizeId(id)}.json`); }
export function reportFile(paths, id) { return join(reportsDir(paths), `${normalizeId(id)}.json`); }
export function proposalFile(paths, id) { return join(proposalsDir(paths), `${normalizeId(id)}.json`); }
export function metricFile(paths, id) { return join(metricsDir(paths), `${normalizeId(id)}.json`); }
export function architectureFile(paths, id) { return join(architectureDir(paths), `${normalizeId(id)}.json`); }

export function createScan(paths, scan) {
  ensureImprovementStore(paths);
  const id = normalizeId(scan.id ?? `scan-${Date.now()}`);
  const next = { schema: "aift.forge.improvement-scan.v1", id, status: scan.status ?? "complete", files: scan.files ?? [], summary: scan.summary ?? {}, createdAt: new Date().toISOString() };
  writeJson(scanFile(paths, id), next);
  return next;
}

export function listScans(paths) {
  ensureImprovementStore(paths);
  return readdirSync(scansDir(paths)).filter(f => f.endsWith(".json")).map(f => readJson(join(scansDir(paths), f))).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function createReport(paths, report) {
  ensureImprovementStore(paths);
  const id = normalizeId(report.id ?? `report-${Date.now()}`);
  const next = { schema: "aift.forge.improvement-report.v1", id, scanId: report.scanId ?? null, title: report.title ?? "Improvement Report", metrics: report.metrics ?? {}, findings: report.findings ?? [], score: Number(report.score ?? 0), createdAt: new Date().toISOString() };
  writeJson(reportFile(paths, id), next);
  return next;
}

export function listReports(paths) {
  ensureImprovementStore(paths);
  return readdirSync(reportsDir(paths)).filter(f => f.endsWith(".json")).map(f => readJson(join(reportsDir(paths), f))).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
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
  return readdirSync(proposalsDir(paths)).filter(f => f.endsWith(".json")).map(f => readJson(join(proposalsDir(paths), f))).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function writeMetric(paths, id, metric) {
  ensureImprovementStore(paths);
  const next = { schema: "aift.forge.improvement-metric.v1", id: normalizeId(id), ...metric, updatedAt: new Date().toISOString() };
  writeJson(metricFile(paths, id), next);
  return next;
}

export function writeArchitecture(paths, id, architecture) {
  ensureImprovementStore(paths);
  const next = { schema: "aift.forge.architecture-map.v1", id: normalizeId(id), ...architecture, updatedAt: new Date().toISOString() };
  writeJson(architectureFile(paths, id), next);
  return next;
}
