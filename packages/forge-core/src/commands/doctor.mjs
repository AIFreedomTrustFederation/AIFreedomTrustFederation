import { join } from "node:path";
import { execSync } from "node:child_process";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, fail } from "../lib/logger.mjs";
import { checkCommand, printVersion, checkDir, checkFile } from "../lib/checks.mjs";

export function doctor() {
  const paths = getForgePaths(import.meta.url);

  console.log("🔥 AIFT Forge Doctor");

  section("Paths");
  console.log(`Repo root: ${paths.repoRoot}`);
  console.log(`AIFT root: ${paths.aiftRoot}`);
  console.log(`Forge core: ${paths.forgeCoreRoot}`);

  section("Tools");
  checkCommand("git");
  checkCommand("node");
  checkCommand("npm");
  checkCommand("pnpm");

  section("Versions");
  printVersion("git");
  printVersion("node", ["-v"]);
  printVersion("npm", ["-v"]);
  printVersion("pnpm", ["-v"]);

  section("AIFT repos");
  checkDir(join(paths.aiftRoot, "AIFT-Forge"));
  checkDir(join(paths.aiftRoot, "BookSmith-Federation-OS"));
  checkDir(join(paths.aiftRoot, "booksmith-ai"));
  checkDir(join(paths.aiftRoot, "AI-Freedom-Trust"));
  checkDir(join(paths.aiftRoot, "Aether_Coin_biozonecurrency"));

  section("AIFT-Forge structure");
  checkDir(join(paths.repoRoot, "apps"));
  checkDir(join(paths.repoRoot, "packages"));
  checkDir(join(paths.repoRoot, "packages/forge-core"));
  checkDir(join(paths.repoRoot, "scripts"));
  checkDir(join(paths.repoRoot, "docs"));
  checkDir(join(paths.repoRoot, "agents"));

  section("Core files");
  checkFile(join(paths.repoRoot, "README.md"));
  checkFile(join(paths.repoRoot, "package.json"));
  checkFile(join(paths.repoRoot, "aift-forge-manifest.json"));
  checkFile(join(paths.repoRoot, "aift-root-manifest.json"));

  section("Git status");
  try {
    const status = execSync("git status --short", {
      cwd: paths.repoRoot,
      encoding: "utf8"
    }).trim();

    console.log(status || "clean");
  } catch {
    fail("Could not read git status");
  }

  ok("Forge doctor complete.");
}
