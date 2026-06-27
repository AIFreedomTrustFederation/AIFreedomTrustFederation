import { getForgePaths } from "../lib/paths.mjs";
import { discoverLanOllama } from "../network/ollama-lan.mjs";

export default async function lanOllama() {
  console.log("🌐 Forge LAN Ollama Discovery");

  const paths = getForgePaths(import.meta.url);
  const result = await discoverLanOllama(paths);

  if (!result.ok) {
    console.log(`❌ ${result.reason}`);
    if (result.prefix) console.log(`Subnet checked: ${result.prefix}.0/24`);
    console.log("");
    console.log("Make sure Ollama is running on another computer:");
    console.log("  ollama serve");
    console.log("");
    console.log("And that it is listening on the LAN, not only localhost.");
    return;
  }

  console.log("✅ Ollama found");
  console.log(`Endpoint: ${result.endpoint}`);
  console.log(`Saved: ${result.envFile}`);
  console.log("");
  console.log("Activate it now:");
  console.log(`  source ${result.envFile}`);
  console.log("");
  console.log("Then test:");
  console.log("  aift-forge provider health");
}
