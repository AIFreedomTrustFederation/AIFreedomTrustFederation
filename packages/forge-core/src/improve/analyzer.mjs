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
