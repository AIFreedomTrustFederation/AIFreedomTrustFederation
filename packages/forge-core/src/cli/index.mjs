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
import { bootstrap } from "../commands/bootstrap.mjs";
import { build } from "../commands/build.mjs";
import { verify } from "../commands/verify.mjs";
import { dashboard } from "../commands/dashboard.mjs";
import { remember } from "../commands/remember.mjs";
import { resume } from "../commands/resume.mjs";
import { next } from "../commands/next.mjs";
import { work } from "../commands/work.mjs";
import { cycle } from "../commands/cycle.mjs";
import { mission } from "../commands/mission.mjs";

async function main() {
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
  console.log("  bootstrap  Bootstrap federation systems");
  console.log("  build      Build federation targets");
  console.log("  verify     Verify federation targets");
  console.log("  dashboard  Show federation health dashboard");
  console.log("  remember   Show Forge memory state");
  console.log("  resume     Resume from last known Forge task");
  console.log("  next       Show or approve next Forge task");
  console.log("  cycle      Run Forge observe-think-build-verify-learn cycle");
  console.log("  mission    Manage Forge mission authorization");
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
  case "bootstrap":
    bootstrap(process.argv.slice(3));
    break;
  case "build":
    build(process.argv.slice(3));
    break;
  case "verify":
    await verify(process.argv.slice(3));
    break;
  case "dashboard":
    dashboard();
    break;
  case "remember":
    remember();
    break;
  case "resume":
    resume();
    break;
  case "next":
    next(process.argv.slice(3));
    break;
  case "work":
    work(process.argv.slice(3));
    break;
  case "cycle":
    cycle(process.argv.slice(3));
    break;
  case "mission":
    mission(process.argv.slice(3));
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});