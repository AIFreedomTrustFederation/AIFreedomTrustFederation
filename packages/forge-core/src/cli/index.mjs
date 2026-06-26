#!/usr/bin/env node

import { doctor } from "../commands/doctor.mjs";

const command = process.argv[2] ?? "help";

function help() {
  console.log("AIFT Forge CLI");
  console.log("");
  console.log("Usage:");
  console.log("  node packages/forge-core/src/cli/index.mjs <command>");
  console.log("");
  console.log("Commands:");
  console.log("  doctor   Check federation tools, repos, and AIFT-Forge structure");
  console.log("  help     Show this help");
}

switch (command) {
  case "doctor":
    doctor();
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    help();
    process.exit(1);
}
