#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧬 Adding Forge service generator"

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/commands/generate.mjs")
text = p.read_text()

# Add toPascalCase import if missing
text = text.replace(
    'import { toCamelCase, toKebabCase } from "../lib/text.mjs";',
    'import { toCamelCase, toKebabCase, toPascalCase } from "../lib/text.mjs";'
)

insert = r'''
function serviceTemplate(serviceName, functionName) {
  return `import { section, ok } from "../lib/logger.mjs";

export class ${serviceName} {
  constructor(context = {}) {
    this.context = context;
  }

  describe() {
    return {
      name: "${serviceName}",
      phase: "generated",
      contextKeys: Object.keys(this.context)
    };
  }
}

export function create${serviceName}(context = {}) {
  return new ${serviceName}(context);
}

export function ${functionName}(context = {}) {
  section("${serviceName}");
  const service = create${serviceName}(context);
  ok("${serviceName} scaffold created.");
  return service.describe();
}
`;
}
'''

if "function serviceTemplate" not in text:
    text = text.replace("function commandTemplate(commandName, functionName) {", insert + "\nfunction commandTemplate(commandName, functionName) {")

old = '''  if (type !== "command") {
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
'''

new = '''  const paths = getForgePaths(import.meta.url);

  if (type === "command") {
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
    return;
  }

  if (type === "service") {
    const serviceName = toPascalCase(name.endsWith("Service") ? name : `${name}Service`);
    const fileName = toKebabCase(serviceName);
    const functionName = `run${serviceName}`;
    const servicePath = join(paths.repoRoot, "packages/forge-core/src/services", `${fileName}.mjs`);

    section("Generate Service");
    console.log(`Service: ${serviceName}`);
    console.log(`Function: ${functionName}`);
    console.log(`File: ${servicePath}`);

    writeFileOnce(servicePath, serviceTemplate(serviceName, functionName));

    ok(`Generated service: ${serviceName}`);
    console.log("");
    console.log("Import with:");
    console.log(`  import { ${serviceName} } from "./services/${fileName}.mjs";`);
    return;
  }

  fail(`Unknown generator type: ${type}`);
  console.log("Available generator types:");
  console.log("  command");
  console.log("  service");
  process.exit(1);
'''

if old in text:
    text = text.replace(old, new)
elif 'if (type === "service")' not in text:
    raise SystemExit("Could not patch generate.mjs safely. Inspect file manually.")

p.write_text(text)
PY

mkdir -p packages/forge-core/src/services

echo "✅ Forge service generator added."
echo ""
echo "Test:"
echo "  aift-forge generate service RepositoryService"
