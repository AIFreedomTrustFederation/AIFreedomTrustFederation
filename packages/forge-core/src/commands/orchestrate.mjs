import { ForgeMissionOrchestrator } from "../orchestrator/engine.mjs";

function parseMax(args) {
  const maxIndex = args.indexOf("--max");
  if (maxIndex >= 0) return Number(args[maxIndex + 1] ?? 1);
  if (args.includes("--continuous")) return 50;
  return 1;
}

export async function orchestrate(args = []) {
  const action = args[0] ?? "status";
  const orchestrator = new ForgeMissionOrchestrator();

  if (action === "status") {
    orchestrator.status();
    return;
  }

  if (action === "discover") {
    await orchestrator.discover(args[1]);
    return;
  }

  if (action === "next") {
    await orchestrator.nextMission({
      targetRepository: args[1],
      approve: !args.includes("--no-approve")
    });
    return;
  }

  if (action === "run") {
    await orchestrator.run({
      maxRuns: parseMax(args),
      lifecycle: !args.includes("--no-lifecycle"),
      publish: args.includes("--publish")
    });
    return;
  }

  if (action === "agent-task") {
    await orchestrator.agentTask();
    return;
  }

  if (action === "review") {
    orchestrator.reviewPatch(args[1]);
    return;
  }

  if (action === "codegen") {
    orchestrator.codegenFeature(args[1] ?? "orchestrator-panel");
    return;
  }

  console.log("Forge Mission Orchestrator");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge orchestrate status");
  console.log("  aift-forge orchestrate discover BookSmith-Federation-OS");
  console.log("  aift-forge orchestrate next BookSmith-Federation-OS");
  console.log("  aift-forge orchestrate run --max 3");
  console.log("  aift-forge orchestrate agent-task");
  console.log("  aift-forge orchestrate review .forge/agent-patches/PATCH.diff");
  console.log("  aift-forge orchestrate codegen sample-panel");
}

export default orchestrate;
