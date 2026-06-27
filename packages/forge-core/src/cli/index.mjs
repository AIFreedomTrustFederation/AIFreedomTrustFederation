#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

const commandsDir = new URL("../commands/", import.meta.url);

function commandName(file) {
  return basename(file, ".mjs");
}

async function loadCommands() {
  const commands = new Map();

  for (const file of readdirSync(commandsDir)) {
    if (!file.endsWith(".mjs")) continue;

    const name = commandName(file);
    const mod = await import(new URL(file, commandsDir));

    const handler =
      mod.default ??
      mod[name] ??
      Object.values(mod).find((value) => typeof value === "function");

    if (typeof handler === "function") {
      commands.set(name, handler);
    }
  }

  return commands;
}

function printHelp(commands) {
  console.log("AIFT Forge CLI");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge <command> [...args]");
  console.log("");
  console.log("Commands:");
  for (const name of [...commands.keys()].sort()) {
    console.log(`  ${name}`);
  }
}

async function main() {
  const commands = await loadCommands();
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help") {
    printHelp(commands);
    return;
  }

  const handler = commands.get(command);

  if (!handler) {
    console.log(`Unknown command: ${command}`);
    console.log("");
    printHelp(commands);
    process.exitCode = 1;
    return;
  }

  await handler(args);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
