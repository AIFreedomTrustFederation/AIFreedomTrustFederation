import { listAgentBackends } from "../agent/capabilities.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export function agents() {
  console.log("🤖 Forge Agent Backends");

  section("Backends");

  for (const backend of listAgentBackends()) {
    const marker = backend.enabled ? "✅" : "⬜";
    console.log(`${marker} ${backend.id} — ${backend.label}`);
    console.log(`   mode: ${backend.mode}`);
    console.log(`   priority: ${backend.priority}`);
    console.log(`   capabilities: ${backend.capabilities.join(", ")}`);

    if (backend.enabled) ok("enabled");
    else warn("disabled");
  }
}

export default agents;
