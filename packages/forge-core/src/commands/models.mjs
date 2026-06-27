import { getForgePaths } from "../lib/paths.mjs";
import { modelInventory } from "../providers/router.mjs";

export default async function models() {
  const paths = getForgePaths(import.meta.url);
  const inventory = await modelInventory(paths);

  console.log("🧠 Forge Model Discovery");
  console.log("");

  if (inventory.length === 0) {
    console.log("❌ No reachable local model providers.");
    console.log("");
    console.log("Start Ollama or add a LAN provider:");
    console.log("  ollama serve");
    console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
    return;
  }

  for (const provider of inventory) {
    console.log(`${provider.ok ? "✅" : "⚠️"} ${provider.providerId}`);
    console.log(`   type: ${provider.providerType}`);
    console.log(`   endpoint: ${provider.endpoint}`);

    if (!provider.ok) {
      console.log(`   ${provider.error ?? "Unable to fetch models."}`);
      continue;
    }

    if (provider.models.length === 0) {
      console.log("   No models reported.");
      continue;
    }

    for (const model of provider.models) {
      console.log(`   - ${model.name ?? model.id ?? model.model ?? JSON.stringify(model)}`);
    }
  }
}
