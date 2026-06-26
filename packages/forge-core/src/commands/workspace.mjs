import { getForgePaths } from "../lib/paths.mjs";
import { FEDERATION_REPOSITORIES } from "../lib/repositories.mjs";
import { createWorkspaceService } from "../services/workspace-service.mjs";
import { section, ok } from "../lib/logger.mjs";

function printRepository(repo) {
  const mark = repo.exists ? "✅" : "⚠️";

  console.log(`${mark} ${repo.name}`);
  console.log(`   Path: ${repo.path}`);
  console.log(`   Git: ${repo.git ? "yes" : "no"}`);
  console.log(`   README: ${repo.readme ? "yes" : "no"}`);
  console.log(`   package.json: ${repo.packageJson ? "yes" : "no"}`);

  if (repo.apps.length) {
    console.log(`   Apps: ${repo.apps.join(", ")}`);
  }

  if (repo.packages.length) {
    console.log(`   Packages: ${repo.packages.join(", ")}`);
  }

  if (repo.agents.length) {
    console.log(`   Agents: ${repo.agents.join(", ")}`);
  }

  console.log(`   Docs: ${repo.docs ? "yes" : "no"}`);
  console.log("");
}

export function workspace(args = []) {
  const subcommand = args[0] ?? "scan";
  const paths = getForgePaths(import.meta.url);
  const service = createWorkspaceService({ aiftRoot: paths.aiftRoot });
  const repoNames = FEDERATION_REPOSITORIES.map((repo) => repo.name);

  if (subcommand !== "scan" && subcommand !== "list") {
    console.log("Usage:");
    console.log("  aift-forge workspace scan");
    console.log("  aift-forge workspace list");
    process.exit(1);
  }

  const result = service.scan(repoNames);

  console.log("🌐 AIFT Workspace");

  section("Root");
  console.log(result.root);

  section("Repositories");

  for (const repo of result.repositories) {
    if (subcommand === "list") {
      console.log(`${repo.exists ? "✅" : "⚠️"} ${repo.name}`);
    } else {
      printRepository(repo);
    }
  }

  ok("Workspace scan complete.");
}
