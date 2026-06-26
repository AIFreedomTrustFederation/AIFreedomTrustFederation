#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧪 Teaching Forge how to verify Web OS"

mkdir -p packages/forge-core/src/verifiers
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/verifiers/web-os.mjs <<'JS'
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { section, ok, warn, fail } from "../lib/logger.mjs";

function checkFile(path, label, results) {
  if (existsSync(path)) {
    ok(label);
    results.passed += 1;
    return true;
  }

  fail(label);
  results.failed += 1;
  return false;
}

function tryCommand(command, cwd, label, results) {
  try {
    execSync(command, {
      cwd,
      stdio: "pipe",
      encoding: "utf8"
    });

    ok(label);
    results.passed += 1;
    return true;
  } catch (error) {
    warn(`${label} failed`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    results.failed += 1;
    return false;
  }
}

export function verifyWebOs(paths, options = {}) {
  const osRoot = join(paths.aiftRoot, "BookSmith-Federation-OS");
  const webRoot = join(osRoot, "apps/web-os");

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  console.log("🧪 Verifying BookSmith Web OS");

  section("Required Files");

  checkFile(join(webRoot, "package.json"), "package.json", results);
  checkFile(join(webRoot, "next.config.mjs"), "next.config.mjs", results);
  checkFile(join(webRoot, "tsconfig.json"), "tsconfig.json", results);
  checkFile(join(webRoot, "app/layout.tsx"), "app/layout.tsx", results);
  checkFile(join(webRoot, "app/page.tsx"), "app/page.tsx", results);
  checkFile(join(webRoot, "app/globals.css"), "app/globals.css", results);

  section("Components");

  const components = [
    "Desktop.tsx",
    "AppLauncher.tsx",
    "Dock.tsx",
    "SystemHealth.tsx",
    "RoadmapPanel.tsx",
    "CanonIntakePanel.tsx"
  ];

  for (const component of components) {
    checkFile(join(webRoot, "components", component), `components/${component}`, results);
  }

  section("API Routes");
  checkFile(join(webRoot, "app/api/booksmith/run/route.ts"), "api/booksmith/run/route.ts", results);

  section("Optional Build Checks");

  if (options.skipBuild) {
    warn("Skipping build checks because --skip-build was supplied.");
    results.skipped += 2;
  } else {
    if (existsSync(join(webRoot, "node_modules"))) {
      tryCommand("npm run typecheck", webRoot, "npm run typecheck", results);
      tryCommand("npm run build", webRoot, "npm run build", results);
    } else {
      warn("node_modules missing in apps/web-os. Skipping npm checks.");
      console.log("Run:");
      console.log("  cd ~/Projects/AIFT/BookSmith-Federation-OS/apps/web-os");
      console.log("  npm install");
      results.skipped += 2;
    }
  }

  section("Summary");

  const total = results.passed + results.failed;
  const score = total === 0 ? 0 : Math.round((results.passed / total) * 100);

  console.log(`Passed:  ${results.passed}`);
  console.log(`Failed:  ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Health:  ${score}%`);

  if (results.failed > 0) {
    fail("Web OS verification failed.");
    process.exit(1);
  }

  ok("Web OS verification passed.");
}
JS

cat > packages/forge-core/src/commands/verify.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { verifyWebOs } from "../verifiers/web-os.mjs";
import { fail } from "../lib/logger.mjs";

export function verify(args = []) {
  const target = args[0];
  const skipBuild = args.includes("--skip-build");
  const paths = getForgePaths(import.meta.url);

  if (!target) {
    console.log("Usage:");
    console.log("  aift-forge verify web-os");
    console.log("  aift-forge verify web-os --skip-build");
    process.exit(1);
  }

  if (target === "web-os") {
    verifyWebOs(paths, { skipBuild });
    return;
  }

  fail(`Unknown verify target: ${target}`);
  console.log("Available verify targets:");
  console.log("  web-os");
  process.exit(1);
}
JS

python - <<'PY'
from pathlib import Path

cli = Path("packages/forge-core/src/cli/index.mjs")
text = cli.read_text()

if 'import { verify } from "../commands/verify.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { verify } from "../commands/verify.mjs";')

if 'console.log("  verify' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  verify     Verify federation targets");\n  console.log("  help'
    )

if 'case "verify":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "verify":\n    verify(process.argv.slice(3));\n    break;\n  case "help":'
    )

cli.write_text(text)

registry = Path("packages/forge-core/src/registry/commands.mjs")
if registry.exists():
    rt = registry.read_text()
    if 'name: "verify"' not in rt:
        marker = "  {\n    name: \"build\","
        insert = '''  {
    name: "verify",
    description: "Verify generated federation targets such as the BookSmith Web OS shell.",
    category: "verification",
    phase: "1",
    status: "active"
  },
'''
        if marker in rt:
            rt = rt.replace(marker, insert + marker)
        else:
            rt = rt.replace("];", insert + "];")
        registry.write_text(rt)
PY

echo "✅ Forge now knows how to verify Web OS."
echo ""
echo "Testing:"
aift-forge verify web-os --skip-build

echo ""
echo "✅ Done."
