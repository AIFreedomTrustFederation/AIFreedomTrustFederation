#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "⏳ Teaching Forge progress runner"

mkdir -p packages/forge-core/src/lib

cat > packages/forge-core/src/lib/progress.mjs <<'JS'
import { spawn } from "node:child_process";

function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }

  return `${secs}s`;
}

export async function runWithProgress(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    label = command,
    heartbeatMs = 5000,
    quiet = false
  } = options;

  const startedAt = Date.now();

  console.log(`▶ ${label}`);
  console.log(`  cwd: ${cwd}`);
  console.log(`  cmd: ${command} ${args.join(" ")}`);

  return await new Promise((resolve) => {
    let lastOutputAt = Date.now();
    let heartbeatCount = 0;

    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: process.env
    });

    const heartbeat = setInterval(() => {
      const now = Date.now();
      const elapsed = formatElapsed(now - startedAt);
      const quietFor = formatElapsed(now - lastOutputAt);
      heartbeatCount += 1;

      console.log(`⏳ ${label} still running... elapsed ${elapsed}, quiet ${quietFor}`);
    }, heartbeatMs);

    child.stdout.on("data", (chunk) => {
      lastOutputAt = Date.now();
      const text = chunk.toString();
      if (!quiet) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      lastOutputAt = Date.now();
      const text = chunk.toString();
      if (!quiet) {
        process.stderr.write(text);
      }
    });

    child.on("error", (error) => {
      clearInterval(heartbeat);
      console.log(`❌ ${label} failed to start: ${error.message}`);
      resolve({
        ok: false,
        code: 1,
        error,
        elapsedMs: Date.now() - startedAt,
        heartbeatCount
      });
    });

    child.on("close", (code) => {
      clearInterval(heartbeat);

      const elapsedMs = Date.now() - startedAt;
      const elapsed = formatElapsed(elapsedMs);

      if (code === 0) {
        console.log(`✅ ${label} finished in ${elapsed}`);
      } else {
        console.log(`❌ ${label} failed with exit code ${code} after ${elapsed}`);
      }

      resolve({
        ok: code === 0,
        code,
        elapsedMs,
        heartbeatCount
      });
    });
  });
}
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/verifiers/web-os.mjs")
text = p.read_text()

# Add progress import.
if 'import { runWithProgress } from "../lib/progress.mjs";' not in text:
    lines = text.splitlines()
    last_import_idx = max(i for i, line in enumerate(lines) if line.startswith("import "))
    lines.insert(last_import_idx + 1, 'import { runWithProgress } from "../lib/progress.mjs";')
    text = "\n".join(lines) + "\n"

# Replace tryCommand function with async progress version.
start = text.find("function tryCommand(")
if start == -1:
    start = text.find("async function tryCommand(")

if start == -1:
    raise SystemExit("Could not find tryCommand function.")

end = text.find("\n}\n\nexport function verifyWebOs", start)
if end == -1:
    raise SystemExit("Could not find end of tryCommand function.")

new_try = r'''async function tryCommand(command, args, cwd, label, results) {
  const result = await runWithProgress(command, args, {
    cwd,
    label,
    heartbeatMs: 5000
  });

  if (result.ok) {
    results.passed += 1;
    return true;
  }

  results.failed += 1;
  return false;
}
'''

text = text[:start] + new_try + text[end+3:]

# Make verify async.
text = text.replace(
    "export function verifyWebOs(paths, options = {}) {",
    "export async function verifyWebOs(paths, options = {}) {"
)

# Replace old execSync command calls.
text = text.replace(
    'tryCommand("npm run typecheck", webRoot, "npm run typecheck", results);',
    'await tryCommand("npm", ["run", "typecheck"], webRoot, "npm run typecheck", results);'
)

text = text.replace(
    'tryCommand("npm run build", webRoot, "npm run build", results);',
    'await tryCommand("npm", ["run", "build"], webRoot, "npm run build", results);'
)

p.write_text(text)

cmd = Path("packages/forge-core/src/commands/verify.mjs")
ct = cmd.read_text()

ct = ct.replace(
    "export function verify(args = []) {",
    "export async function verify(args = []) {"
)

ct = ct.replace(
    "verifyWebOs(paths, { skipBuild, repair });",
    "await verifyWebOs(paths, { skipBuild, repair });"
)

cmd.write_text(ct)

cli = Path("packages/forge-core/src/cli/index.mjs")
cl = cli.read_text()

cl = cl.replace(
    "    verify(process.argv.slice(3));\n    break;",
    "    await verify(process.argv.slice(3));\n    break;"
)

preamble = "#!/usr/bin/env node\n\n"
if cl.startswith(preamble) and "async function main()" not in cl:
    cl = cl.replace(preamble, preamble + "async function main() {\n")
    cl = cl.rstrip() + "\n}\n\nmain().catch((error) => {\n  console.error(error);\n  process.exit(1);\n});\n"

# If we wrapped the whole file, imports are now inside main, which is invalid.
# Fix by only wrapping command dispatch, not imports.
if "async function main() {\nimport " in cl:
    lines = cl.splitlines()
    shebang = lines[0]
    import_lines = []
    other_lines = []
    for line in lines[1:]:
        if line.startswith("import "):
            import_lines.append(line)
        else:
            other_lines.append(line)
    # Remove accidentally inserted main wrapper line if present.
    other_lines = [line for line in other_lines if line != "async function main() {"]
    body = "\n".join(other_lines).strip()
    cl = shebang + "\n\n" + "\n".join(import_lines) + "\n\nasync function main() {\n" + body
    if not cl.rstrip().endswith("});"):
        cl = cl.rstrip() + "\n}\n\nmain().catch((error) => {\n  console.error(error);\n  process.exit(1);\n});\n"

cli.write_text(cl)
PY

echo "✅ Progress runner added."
echo ""
echo "Test without build:"
aift-forge verify web-os --repair --skip-build

echo ""
echo "Test with build heartbeat:"
echo "  aift-forge verify web-os --repair"
echo ""
echo "If build takes long, you should now see heartbeat lines every 5 seconds."
