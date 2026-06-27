import { getForgePaths } from "../lib/paths.mjs";
import {
  ensureProviderRegistry,
  readProviders,
  addProvider,
  providerHealth,
  bestProvider
} from "../providers/registry.mjs";

function parseAdd(args) {
  const id = args[1];
  const endpoint = args[2];
  const type = args[3] ?? "ollama";

  return { id, endpoint, type };
}

export default async function provider(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  ensureProviderRegistry(paths);

  if (action === "status" || action === "list") {
    console.log("🧭 Forge Provider Registry");
    console.log("");
    console.log("Policy:");
    console.log("✅ Local/private LAN only");
    console.log("✅ No API keys");
    console.log("✅ No cloud fallback");
    console.log("✅ JSON provider registry");
    console.log("");

    for (const provider of readProviders(paths)) {
      console.log(`${provider.enabled ? "✅" : "⬜"} ${provider.id} — ${provider.label}`);
      console.log(`   type: ${provider.type}`);
      console.log(`   endpoint: ${provider.endpoint}`);
      console.log(`   priority: ${provider.priority ?? 0}`);
    }

    return;
  }

  if (action === "health") {
    console.log("🩺 Forge Provider Health");
    console.log("");

    const health = await providerHealth(paths);

    for (const provider of health) {
      console.log(`${provider.ok ? "✅" : "⚠️"} ${provider.id}`);
      console.log(`   endpoint: ${provider.endpoint}`);
      console.log(`   ${provider.reason}`);
    }

    const best = await bestProvider(paths);

    console.log("");

    if (best) {
      console.log(`✅ Selected provider: ${best.id}`);
      console.log(`export FORGE_PROVIDER_ID="${best.id}"`);
      console.log(`export FORGE_PROVIDER_ENDPOINT="${best.endpoint}"`);
    } else {
      console.log("❌ No reachable local provider.");
      console.log("Add one manually:");
      console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
    }

    return;
  }

  if (action === "add") {
    const { id, endpoint, type } = parseAdd(args);

    if (!id || !endpoint) {
      console.log("Usage:");
      console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
      return;
    }

    const added = addProvider(paths, { id, endpoint, type });

    console.log("✅ Provider added");
    console.log(`id: ${added.id}`);
    console.log(`type: ${added.type}`);
    console.log(`endpoint: ${added.endpoint}`);
    return;
  }

  if (action === "init") {
    ensureProviderRegistry(paths);
    console.log("✅ Provider registry initialized.");
    console.log(".forge/providers/");
    return;
  }

  console.log("Forge Provider Registry");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge provider status");
  console.log("  aift-forge provider health");
  console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
}
