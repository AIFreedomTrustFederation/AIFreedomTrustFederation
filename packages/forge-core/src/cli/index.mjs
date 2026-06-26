#!/usr/bin/env node

import { doctor } from "../commands/doctor.mjs";
import { manifest } from "../commands/manifest.mjs";

const command = process.argv[2] ?? "help";

function help() {
  console.log("AIFT Forge CLI");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge <command>");
  console.log("");
  console.log("Commands:");
  console.log("  doctor     Check federation tools, repos, and AIFT-Forge structure");
  console.log("  manifest   Show AIFT Forge and root federation manifests");
  console.log("  help       Show this help");
}

switch (command) {
  case "doctor":
    doctor();
    break;
  case "manifest":
    manifest();
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
