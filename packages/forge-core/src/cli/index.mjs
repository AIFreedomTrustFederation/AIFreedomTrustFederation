#!/usr/bin/env node

import { doctor } from "../commands/doctor.mjs";
import { manifest } from "../commands/manifest.mjs";
import { graph } from "../commands/graph.mjs";
import { generate } from "../commands/generate.mjs";
import { status } from "../commands/status.mjs";
import { plan } from "../commands/plan.mjs";
import { workspace } from "../commands/workspace.mjs";
import { commands } from "../commands/commands.mjs";
import { backlog } from "../commands/backlog.mjs";

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
  console.log("  graph      Show local federation repository topology");
  console.log("  generate   Generate Forge code from templates");
  console.log("  status     Scaffolded command");
  console.log("  plan       Show Forge development plan");
  console.log("  workspace  Scan or list the local federation workspace");
  console.log("  commands   List registered Forge commands");
  console.log("  backlog   Show Forge development backlog");
  console.log("  help       Show this help");
}

switch (command) {
  case "doctor":
    doctor();
    break;
  case "manifest":
    manifest();
    break;
  case "graph":
    graph();
    break;
  case "generate":
    generate(process.argv.slice(3));
    break;
  case "status":
    status();
    break;
  case "plan":
    plan();
    break;
  case "workspace":
    workspace(process.argv.slice(3));
    break;
  case "commands":
    commands(process.argv.slice(3));
    break;
  case "backlog":
    backlog(process.argv.slice(3));
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
