import { getForgePaths } from "../lib/paths.mjs";
import { inspectFederationRepositories } from "../lib/repositories.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

function marker(value) {
  return value ? "✅" : "⚠️";
}

export function graph() {
  const paths = getForgePaths(import.meta.url);
  const repos = inspectFederationRepositories(paths.aiftRoot);

  console.log("🕸️ AI Freedom Trust Federation Graph");

  section("Root");
  console.log(paths.aiftRoot);

  section("Topology");

  for (const repo of repos) {
    console.log(`${marker(repo.exists)} ${repo.name}`);
    console.log(`   Role: ${repo.role}`);
    console.log(`   Path: ${repo.path}`);
    console.log(`   Git: ${repo.hasGit ? "yes" : "no"}`);
    console.log(`   Package: ${repo.hasPackageJson ? "yes" : "no"}`);
    console.log(`   README: ${repo.hasReadme ? "yes" : "no"}`);
    console.log("");
  }

  const missing = repos.filter((repo) => !repo.exists);

  if (missing.length > 0) {
    section("Missing Repositories");
    for (const repo of missing) {
      warn(repo.name);
    }
  } else {
    ok("All known federation repositories are present.");
  }
}
