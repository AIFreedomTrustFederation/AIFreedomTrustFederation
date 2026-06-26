#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🕸️ Adding Forge graph command"

mkdir -p packages/forge-core/src/lib
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/lib/repositories.mjs <<'JS'
import { existsSync } from "node:fs";
import { join } from "node:path";

export const FEDERATION_REPOSITORIES = [
  {
    name: "AIFT-Forge",
    role: "Federation runtime, SDK, CLI, templates, agents, and shared infrastructure"
  },
  {
    name: "BookSmith-Federation-OS",
    role: "User-facing web operating system and knowledge desktop"
  },
  {
    name: "booksmith-ai",
    role: "Publishing engine, manuscript tooling, figures, citations, proofing, and release pipeline"
  },
  {
    name: "AI-Freedom-Trust",
    role: "Constitution, doctrine, governance, trust principles, and alignment"
  },
  {
    name: "Aether_Coin_biozonecurrency",
    role: "Federation economy, accounting, treasury, wallet, and settlement protocol"
  }
];

export function inspectFederationRepositories(aiftRoot) {
  return FEDERATION_REPOSITORIES.map((repo) => {
    const path = join(aiftRoot, repo.name);

    return {
      ...repo,
      path,
      exists: existsSync(path),
      hasGit: existsSync(join(path, ".git")),
      hasPackageJson: existsSync(join(path, "package.json")),
      hasReadme: existsSync(join(path, "README.md"))
    };
  });
}
JS

cat > packages/forge-core/src/commands/graph.mjs <<'JS'
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
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/cli/index.mjs")
text = p.read_text()

if 'import { graph } from "../commands/graph.mjs";' not in text:
    text = text.replace(
        'import { manifest } from "../commands/manifest.mjs";',
        'import { manifest } from "../commands/manifest.mjs";\nimport { graph } from "../commands/graph.mjs";'
    )

if 'console.log("  graph' not in text:
    text = text.replace(
        'console.log("  manifest   Show AIFT Forge and root federation manifests");',
        'console.log("  manifest   Show AIFT Forge and root federation manifests");\n  console.log("  graph      Show local federation repository topology");'
    )

if 'case "graph":' not in text:
    text = text.replace(
        '  case "manifest":\n    manifest();\n    break;',
        '  case "manifest":\n    manifest();\n    break;\n  case "graph":\n    graph();\n    break;'
    )

p.write_text(text)
PY

echo "✅ Graph command added."
echo ""
echo "Test:"
echo "  ./scripts/forge graph"
echo "  aift-forge graph"
