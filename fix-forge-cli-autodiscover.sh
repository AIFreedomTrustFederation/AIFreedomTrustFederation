#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧭 Rebuilding Forge CLI with automatic command discovery"

mkdir -p packages/forge-core/src/cli

cat > packages/forge-core/src/cli/index.mjs <<'JS'
#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsDir = join(__dirname, "../commands");

function commandName(file) {
  return file.replace(/\.mjs$/, "");
}

function listCommands() {
  if (!existsSync(commandsDir)) return [];

  return readdirSync(commandsDir)
    .filter((file) => file.endsWith(".mjs"))
    .map(commandName)
    .sort();
}

function printHelp(commands) {
  console.log("AIFT Forge CLI");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge <command> [...args]");
  console.log("");
  console.log("Commands:");
  for (const command of commands) {
    console.log(`  ${command}`);
  }
}

async function loadCommand(command) {
  const path = join(commandsDir, `${command}.mjs`);

  if (!existsSync(path)) return null;

  const mod = await import(pathToFileURL(path).href);
  return mod[command] ?? mod.default ?? null;
}

async function main() {
  const commands = listCommands();
  const command = process.argv[2] ?? "help";
  const args = process.argv.slice(3);

  if (command === "help" || command === "--help" || command === "-h" || command === "commands") {
    printHelp(commands);
    return;
  }

  const handler = await loadCommand(command);

  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error("");
    printHelp(commands);
    process.exit(1);
  }

  await handler(args);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
JS

chmod +x packages/forge-core/src/cli/index.mjs

mkdir -p "$HOME/.local/bin"

cat > "$HOME/.local/bin/aift-forge" <<'WRAP'
#!/data/data/com.termux/files/usr/bin/bash
exec "$HOME/Projects/AIFT/AIFT-Forge/packages/forge-core/src/cli/index.mjs" "$@"
WRAP

chmod +x "$HOME/.local/bin/aift-forge"

grep -q 'HOME/.local/bin' ~/.bashrc || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.local/bin:$PATH"

echo "✅ CLI repaired."
aift-forge help
