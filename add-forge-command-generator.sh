#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧬 Adding Forge command generator"

mkdir -p packages/forge-core/src/lib
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/lib/filesystem.mjs <<'JS'
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function writeFileOnce(path, content) {
  if (existsSync(path)) {
    throw new Error(`Refusing to overwrite existing file: ${path}`);
  }

  ensureDir(dirname(path));
  writeFileSync(path, content);
  return path;
}

export function writeFileForce(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content);
  return path;
}
JS

cat > packages/forge-core/src/lib/text.mjs <<'JS'
export function toKebabCase(input) {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function toCamelCase(input) {
  const kebab = toKebabCase(input);
  return kebab.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

export function toPascalCase(input) {
  const camel = toCamelCase(input);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
JS

cat > packages/forge-core/src/commands/generate.mjs <<'JS'
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { getForgePaths } from "../lib/paths.mjs";
import { writeFileOnce } from "../lib/filesystem.mjs";
import { toCamelCase, toKebabCase } from "../lib/text.mjs";
import { ok, fail, section } from "../lib/logger.mjs";

function commandTemplate(commandName, functionName) {
  return `import { section, ok } from "../lib/logger.mjs";

export function ${functionName}() {
  section("${commandName}");
  ok("${commandName} command scaffold created.");
}
`;
}

function wireCliCommand(cliPath, commandName, functionName) {
  let text = readFileSync(cliPath, "utf8");

  const importLine = `import { ${functionName} } from "../commands/${commandName}.mjs";`;

  if (!text.includes(importLine)) {
    const lastImport = text.match(/import .+;\n/g)?.at(-1);

    if (lastImport) {
      text = text.replace(lastImport, `${lastImport}${importLine}\n`);
    } else {
      text = `${importLine}\n${text}`;
    }
  }

  const helpLine = `  console.log("  ${commandName.padEnd(10)} Scaffolded command");`;

  if (!text.includes(helpLine)) {
    text = text.replace(
      '  console.log("  help       Show this help");',
      `${helpLine}\n  console.log("  help       Show this help");`
    );
  }

  const caseBlock = `  case "${commandName}":
    ${functionName}();
    break;`;

  if (!text.includes(`case "${commandName}":`)) {
    text = text.replace(
      '  case "help":',
      `${caseBlock}
  case "help":`
    );
  }

  writeFileSync(cliPath, text);
}

export function generate(args = []) {
  const type = args[0];
  const name = args[1];

  if (!type || !name) {
    fail("Usage: aift-forge generate command <name>");
    process.exit(1);
  }

  if (type !== "command") {
    fail(`Unknown generator type: ${type}`);
    console.log("Available generator types:");
    console.log("  command");
    process.exit(1);
  }

  const paths = getForgePaths(import.meta.url);
  const commandName = toKebabCase(name);
  const functionName = toCamelCase(commandName);
  const commandPath = join(paths.repoRoot, "packages/forge-core/src/commands", `${commandName}.mjs`);
  const cliPath = join(paths.repoRoot, "packages/forge-core/src/cli/index.mjs");

  section("Generate Command");
  console.log(`Command: ${commandName}`);
  console.log(`Function: ${functionName}`);
  console.log(`File: ${commandPath}`);

  writeFileOnce(commandPath, commandTemplate(commandName, functionName));
  wireCliCommand(cliPath, commandName, functionName);

  ok(`Generated command: ${commandName}`);
  console.log("");
  console.log("Test with:");
  console.log(`  aift-forge ${commandName}`);
}
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/cli/index.mjs")
text = p.read_text()

if 'import { generate } from "../commands/generate.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    if last_imports:
        last = last_imports[-1]
        text = text.replace(last, last + '\nimport { generate } from "../commands/generate.mjs";')
    else:
        text = 'import { generate } from "../commands/generate.mjs";\n' + text

if 'console.log("  generate' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  generate   Generate Forge code from templates");\n  console.log("  help'
    )

if 'case "generate":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "generate":\n    generate(process.argv.slice(3));\n    break;\n  case "help":'
    )

p.write_text(text)
PY

echo "✅ Forge command generator added."
echo ""
echo "Test:"
echo "  aift-forge generate command status"
echo "  aift-forge status"
