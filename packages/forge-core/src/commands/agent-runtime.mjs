import { readFileSync } from "node:fs";
import { ForgeAgentRuntime } from "../../../forge-agent-runtime/src/index.mjs";
import { section, ok, warn, fail } from "../lib/logger.mjs";

export async function agentRuntime(args = []) {
  const action = args[0] ?? "status";
  const runtime = new ForgeAgentRuntime();

  if (action === "status" || action === "providers") {
    console.log("🧠 Forge Agent Runtime");

    section("Policy");
    ok("Local-only / no API keys / open-source first");

    section("Providers");
    for (const provider of runtime.providers()) {
      console.log(`${provider.enabled ? "✅" : "⬜"} ${provider.id} — ${provider.label}`);
      console.log(`   mode: ${provider.mode}`);
      console.log(`   localOnly: ${provider.localOnly ? "yes" : "no"}`);
      console.log(`   openSource: ${provider.openSource ? "yes" : "no"}`);
    }
    return;
  }

  if (action === "health") {
    console.log("🩺 Forge Agent Runtime Health");
    const health = await runtime.health();
    for (const item of health) {
      section(item.id);
      if (item.ok) ok(item.status ?? "available");
      else warn(item.reason ?? item.status ?? "unavailable");
    }
    return;
  }

  if (action === "solve") {
    const packetFile = args[1];

    if (!packetFile) {
      fail("Missing packet file.");
      console.log("Usage:");
      console.log("  aift-forge agent-runtime solve .forge/agent-tasks/TASK.json");
      return;
    }

    const packet = JSON.parse(readFileSync(packetFile, "utf8"));
    const result = await runtime.solve(packet);

    if (!result.ok) {
      fail(result.reason ?? "Provider failed.");
      return;
    }

    console.log("🤖 Agent Runtime Solve");
    section("Provider");
    ok(result.provider);

    section("Result");
    console.log(result.message ?? "No message.");
    return;
  }

  if (action === "review") {
    const patchFile = args[1];

    if (!patchFile) {
      fail("Missing patch file.");
      console.log("Usage:");
      console.log("  aift-forge agent-runtime review .forge/agent-patches/PATCH.diff");
      return;
    }

    const patchText = readFileSync(patchFile, "utf8");
    const review = runtime.reviewPatch(patchText);

    console.log("🧾 Agent Runtime Patch Review");
    section("Score");
    console.log(`Score: ${review.score}`);
    console.log(`Approved: ${review.approved ? "yes" : "no"}`);

    if (review.warnings.length) {
      section("Warnings");
      for (const warning of review.warnings) warn(warning);
    }

    return;
  }

  console.log("Forge Agent Runtime");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge agent-runtime status");
  console.log("  aift-forge agent-runtime solve .forge/agent-tasks/TASK.json");
  console.log("  aift-forge agent-runtime review .forge/agent-patches/PATCH.diff");
}

export default agentRuntime;
