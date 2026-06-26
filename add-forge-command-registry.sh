#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧠 Adding Forge command registry"

mkdir -p packages/forge-core/src/registry
mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/registry/commands.mjs <<'JS'
export const commandRegistry = [
  {
    name: "doctor",
    description: "Check tools, paths, repositories, manifests, and AIFT-Forge structure.",
    category: "health",
    phase: "0",
    status: "active"
  },
  {
    name: "manifest",
    description: "Show AIFT Forge and root federation manifests.",
    category: "manifest",
    phase: "0",
    status: "active"
  },
  {
    name: "graph",
    description: "Show local federation repository topology.",
    category: "federation",
    phase: "0",
    status: "active"
  },
  {
    name: "plan",
    description: "Show Forge development progress and next recommended task.",
    category: "planning",
    phase: "0",
    status: "active"
  },
  {
    name: "workspace",
    description: "Scan or list the local federation workspace.",
    category: "workspace",
    phase: "1",
    status: "active"
  },
  {
    name: "generate",
    description: "Generate Forge commands, services, models, and packages.",
    category: "generator",
    phase: "0",
    status: "active"
  },
  {
    name: "commands",
    description: "List registered Forge commands and metadata.",
    category: "registry",
    phase: "1",
    status: "active"
  }
];

export function getRegisteredCommands() {
  return commandRegistry.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getCommandByName(name) {
  return commandRegistry.find((command) => command.name === name) ?? null;
}

export function getCommandsByCategory(category) {
  return getRegisteredCommands().filter((command) => command.category === category);
}

export function getCommandCategories() {
  return [...new Set(commandRegistry.map((command) => command.category))].sort();
}
JS

cat > packages/forge-core/src/commands/commands.mjs <<'JS'
import {
  getCommandByName,
  getCommandCategories,
  getCommandsByCategory,
  getRegisteredCommands
} from "../registry/commands.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

function printCommand(command) {
  console.log(`${command.name}`);
  console.log(`  Description: ${command.description}`);
  console.log(`  Category:    ${command.category}`);
  console.log(`  Phase:       ${command.phase}`);
  console.log(`  Status:      ${command.status}`);
  console.log("");
}

export function commands(args = []) {
  const name = args[0];

  console.log("🧠 AIFT Forge Command Registry");

  if (name) {
    const command = getCommandByName(name);

    if (!command) {
      warn(`Unknown command: ${name}`);
      return;
    }

    section("Command");
    printCommand(command);
    return;
  }

  section("All Commands");
  for (const command of getRegisteredCommands()) {
    console.log(`✅ ${command.name.padEnd(12)} ${command.description}`);
  }

  section("Categories");
  for (const category of getCommandCategories()) {
    const count = getCommandsByCategory(category).length;
    console.log(`- ${category}: ${count}`);
  }

  ok("Command registry loaded.");
}
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/cli/index.mjs")
text = p.read_text()

if 'import { commands } from "../commands/commands.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { commands } from "../commands/commands.mjs";')

if 'console.log("  commands' not in text:
    text = text.replace(
        'console.log("  help',
        'console.log("  commands   List registered Forge commands");\n  console.log("  help'
    )

if 'case "commands":' not in text:
    text = text.replace(
        '  case "help":',
        '  case "commands":\n    commands(process.argv.slice(3));\n    break;\n  case "help":'
    )

p.write_text(text)
PY

echo "✅ Command registry added."
echo ""
echo "Test:"
echo "  aift-forge commands"
echo "  aift-forge commands workspace"
