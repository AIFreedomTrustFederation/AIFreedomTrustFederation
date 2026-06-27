import { getForgePaths } from "../lib/paths.mjs";
import { bestProvider, providerHealth } from "../providers/registry.mjs";

export default async function inference(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  console.log("🧠 Forge Local Inference");
  console.log("");
  console.log("Policy:");
  console.log("✅ Local/private LAN only");
  console.log("✅ No API keys");
  console.log("✅ No cloud fallback");
  console.log("✅ Provider registry based");
  console.log("");

  if (action === "health") {
    const health = await providerHealth(paths);

    for (const provider of health) {
      console.log(`${provider.ok ? "✅" : "⚠️"} ${provider.id}`);
      console.log(`   ${provider.endpoint}`);
      console.log(`   ${provider.reason}`);
    }

    const best = await bestProvider(paths);

    console.log("");

    if (best) {
      console.log(`✅ Active inference provider: ${best.id}`);
    } else {
      console.log("❌ No active local inference provider.");
    }

    return;
  }

  console.log("Commands:");
  console.log("  aift-forge inference health");
  console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
}
