import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { getForgePaths } from "../lib/paths.mjs";
import { FEDERATION_REPOSITORIES } from "../lib/repositories.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

function gitStatus(repoPath) {
  try {
    const branch = execSync("git branch --show-current", {
      cwd: repoPath,
      encoding: "utf8"
    }).trim();

    const status = execSync("git status --short", {
      cwd: repoPath,
      encoding: "utf8"
    }).trim();

    return {
      branch: branch || "unknown",
      clean: status.length === 0,
      changes: status ? status.split("\n").length : 0
    };
  } catch {
    return {
      branch: "unknown",
      clean: false,
      changes: -1
    };
  }
}

function scoreRepo(repoPath) {
  let score = 0;
  const checks = [
    "README.md",
    "package.json",
    ".git"
  ];

  for (const check of checks) {
    if (existsSync(join(repoPath, check))) score += 20;
  }

  if (
    existsSync(join(repoPath, "aift-manifest.json")) ||
    existsSync(join(repoPath, "aift-forge-manifest.json")) ||
    existsSync(join(repoPath, "aift-root-manifest.json")) ||
    existsSync(join(repoPath, "federation.config.json"))
  ) {
    score += 25;
  }

  if (existsSync(join(repoPath, "docs"))) score += 15;

  return Math.min(score, 100);
}

function bar(score) {
  const blocks = Math.round(score / 10);
  return "█".repeat(blocks) + "░".repeat(10 - blocks);
}

export function dashboard() {
  const paths = getForgePaths(import.meta.url);

  console.log("📊 AIFT Federation Dashboard");

  section("Root");
  console.log(paths.aiftRoot);

  section("Repositories");

  const reports = FEDERATION_REPOSITORIES.map((repo) => {
    const repoPath = join(paths.aiftRoot, repo.name);
    const exists = existsSync(repoPath);
    const git = exists ? gitStatus(repoPath) : null;
    const health = exists ? scoreRepo(repoPath) : 0;

    return {
      ...repo,
      path: repoPath,
      exists,
      git,
      health
    };
  });

  for (const report of reports) {
    const icon = report.health >= 90 ? "🟢" : report.health >= 70 ? "🟡" : "🔴";

    console.log(`${icon} ${report.name}`);
    console.log(`   Role:   ${report.role}`);
    console.log(`   Health: ${bar(report.health)} ${report.health}%`);

    if (!report.exists) {
      console.log(`   Status: missing`);
      console.log("");
      continue;
    }

    console.log(`   Branch: ${report.git.branch}`);
    console.log(`   Git:    ${report.git.clean ? "clean" : `${report.git.changes} change(s)`}`);
    console.log("");
  }

  section("Overall Health");

  const total = reports.reduce((sum, report) => sum + report.health, 0);
  const average = Math.round(total / reports.length);

  console.log(`${bar(average)} ${average}%`);

  if (average >= 90) {
    ok("Federation health is strong.");
  } else if (average >= 70) {
    warn("Federation health is usable but needs cleanup.");
  } else {
    warn("Federation health needs attention.");
  }
}
