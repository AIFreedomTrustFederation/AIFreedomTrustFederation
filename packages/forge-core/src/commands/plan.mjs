import { existsSync } from "node:fs";
import { join } from "node:path";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok } from "../lib/logger.mjs";

const milestones = [
  {
    name: "Workspace Discovery",
    files: ["packages/forge-core/src/lib/workspace.mjs"]
  },
  {
    name: "Manifest Loader",
    files: ["packages/forge-core/src/lib/manifest.mjs"]
  },
  {
    name: "Doctor Command",
    files: ["packages/forge-core/src/commands/doctor.mjs"]
  },
  {
    name: "Manifest Command",
    files: ["packages/forge-core/src/commands/manifest.mjs"]
  },
  {
    name: "Federation Graph",
    files: [
      "packages/forge-core/src/lib/repositories.mjs",
      "packages/forge-core/src/commands/graph.mjs"
    ]
  },
  {
    name: "Command Generator",
    files: ["packages/forge-core/src/commands/generate.mjs"]
  },
  {
    name: "Service Generator",
    files: ["packages/forge-core/src/services/repository-service.mjs"]
  },
  {
    name: "Model Generator",
    files: ["packages/forge-core/src/models/repository.mjs"],
    nextCommand: "aift-forge generate model Repository"
  },
  {
    name: "Repository Status Command",
    files: ["packages/forge-core/src/commands/status.mjs"],
    nextCommand: "aift-forge generate command status"
  },
  {
    name: "Package Generator",
    files: ["packages/forge-core/src/templates/package-template.mjs"],
    nextCommand: "aift-forge generate package Example"
  }
];

function isMilestoneComplete(repoRoot, milestone) {
  return milestone.files.every((file) => existsSync(join(repoRoot, file)));
}

export function plan() {
  const paths = getForgePaths(import.meta.url);

  console.log("🧭 AIFT Forge Plan");

  section("Phase 0 Progress");

  const completed = [];
  const remaining = [];

  for (const milestone of milestones) {
    if (isMilestoneComplete(paths.repoRoot, milestone)) {
      completed.push(milestone);
      console.log(`✅ ${milestone.name}`);
    } else {
      remaining.push(milestone);
      console.log(`⬜ ${milestone.name}`);
    }
  }

  section("Summary");
  console.log(`Completed: ${completed.length}`);
  console.log(`Remaining: ${remaining.length}`);
  console.log(`Progress: ${Math.round((completed.length / milestones.length) * 100)}%`);

  const next = remaining[0];

  if (!next) {
    section("Next Recommended Task");
    ok("Phase 0 plan complete.");
    return;
  }

  section("Next Recommended Task");
  console.log(next.name);

  section("Missing Files");
  for (const file of next.files) {
    if (!existsSync(join(paths.repoRoot, file))) {
      console.log(`  - ${file}`);
    }
  }

  section("Suggested Command");
  console.log(next.nextCommand ?? "Review architecture and add next generator.");
}
