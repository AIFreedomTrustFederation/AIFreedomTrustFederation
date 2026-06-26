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
