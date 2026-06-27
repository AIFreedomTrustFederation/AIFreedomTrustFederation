import {
  ensureProviderRegistry,
  readProviders,
  providerHealth,
  bestProvider
} from "../packages/forge-core/src/providers/registry.mjs";

const paths = { repoRoot: process.cwd() };

ensureProviderRegistry(paths);

const providers = readProviders(paths);

if (!Array.isArray(providers)) throw new Error("readProviders did not return an array");
if (providers.length < 3) throw new Error("Expected at least 3 providers");

for (const id of ["ollama-localhost", "llama-cpp-localhost", "local-openai-compatible"]) {
  if (!providers.some((provider) => provider.id === id)) {
    throw new Error(`Missing provider: ${id}`);
  }
}

await providerHealth(paths);
await bestProvider(paths);

console.log("✅ Provider registry smoke test passed.");
