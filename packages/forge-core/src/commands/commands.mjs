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
