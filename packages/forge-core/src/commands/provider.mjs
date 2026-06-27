import { ForgeAgentRuntime } from "../../../forge-agent-runtime/src/index.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export async function provider(args = []) {
  const action = args[0] ?? "status";
  const runtime = new ForgeAgentRuntime();

  if (action === "status" || action === "list") {
    console.log("🦙 Forge Local Provider Manager");

    section("Policy");
    ok("Local-only providers");
    ok("Open-source first");
    ok("No API keys");
    ok("No remote provider enabled by default");

    section("Providers");
    for (const item of runtime.providers()) {
      console.log(`${item.enabled ? "✅" : "⬜"} ${item.id} — ${item.label}`);
      console.log(`   mode: ${item.mode}`);
      console.log(`   localOnly: ${item.localOnly ? "yes" : "no"}`);
      console.log(`   openSource: ${item.openSource ? "yes" : "no"}`);
      if (item.endpoint) console.log(`   endpoint: ${item.endpoint}`);
      if (item.model) console.log(`   model: ${item.model}`);
    }

    return;
  }

  if (action === "health") {
    console.log("🩺 Forge Local Provider Health");

    const health = await runtime.health();

    for (const item of health) {
      section(item.id);
      if (item.ok) ok(item.status ?? "available");
      else warn(item.reason ?? item.status ?? "unavailable");
      if (item.endpoint) console.log(`endpoint: ${item.endpoint}`);
      if (item.model) console.log(`model: ${item.model}`);
    }

    return;
  }

  console.log("Forge Local Provider Manager");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge provider status");
  console.log("  aift-forge provider health");
}

export default provider;
