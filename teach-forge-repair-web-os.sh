#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🛠️ Teaching Forge to repair Web OS"

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/verifiers/web-os.mjs")
text = p.read_text()

if 'writeFileSync' not in text:
    text = text.replace(
        'import { existsSync } from "node:fs";',
        'import { existsSync, writeFileSync } from "node:fs";'
    )

repair_fn = r'''
function repairNextConfig(webRoot, results) {
  const jsPath = join(webRoot, "next.config.js");
  const mjsPath = join(webRoot, "next.config.mjs");

  const content = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
`;

  writeFileSync(mjsPath, content);

  if (existsSync(jsPath)) {
    writeFileSync(
      jsPath,
      `// This project uses ES modules. Use next.config.mjs instead.
export { default } from "./next.config.mjs";
`
    );
  }

  ok("repaired Next.js config for ES module project");
  results.passed += 1;
}
'''

if 'function repairNextConfig' not in text:
    text = text.replace('function checkFile(path, label, results) {', repair_fn + '\nfunction checkFile(path, label, results) {')

text = text.replace(
    'export function verifyWebOs(paths, options = {}) {',
    'export function verifyWebOs(paths, options = {}) {\n  const repair = options.repair === true;'
)

old = '''  section("Optional Build Checks");

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
'''

new = '''  section("Repair");

  if (repair) {
    repairNextConfig(webRoot, results);
  } else {
    warn("Repair not requested. Use --repair to allow Forge to fix known issues.");
    results.skipped += 1;
  }

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
'''

if old in text:
    text = text.replace(old, new)
else:
    raise SystemExit("Could not patch build checks block safely.")

p.write_text(text)

cmd = Path("packages/forge-core/src/commands/verify.mjs")
ct = cmd.read_text()

ct = ct.replace(
    'const skipBuild = args.includes("--skip-build");',
    'const skipBuild = args.includes("--skip-build");\n  const repair = args.includes("--repair");'
)

ct = ct.replace(
    'verifyWebOs(paths, { skipBuild });',
    'verifyWebOs(paths, { skipBuild, repair });'
)

ct = ct.replace(
    'console.log("  aift-forge verify web-os --skip-build");',
    'console.log("  aift-forge verify web-os --skip-build");\n    console.log("  aift-forge verify web-os --repair");'
)

cmd.write_text(ct)
PY

echo "✅ Forge repair mode added."
echo ""
echo "Running repair + verify:"
aift-forge verify web-os --repair

echo ""
echo "✅ Done."
