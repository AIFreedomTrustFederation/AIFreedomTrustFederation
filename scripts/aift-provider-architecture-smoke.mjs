import { strict as assert } from "node:assert";
import { CAPABILITIES, inferCapabilities } from "../packages/forge-core/src/providers/capabilities/schema.mjs";
import { createProviderAdapter } from "../packages/forge-core/src/providers/adapters/index.mjs";
import { configuredProviders } from "../packages/forge-core/src/providers/router.mjs";
import { ensureProviderRegistry } from "../packages/forge-core/src/providers/registry.mjs";

const paths = { repoRoot: process.cwd() };

ensureProviderRegistry(paths);

assert.equal(CAPABILITIES.CHAT, "chat");
assert.equal(CAPABILITIES.EMBEDDINGS, "embeddings");

const ollama = {
  id: "test-ollama",
  type: "ollama",
  endpoint: "http://127.0.0.1:11434",
  enabled: true
};

assert.ok(inferCapabilities(ollama).includes("chat"));
assert.ok(inferCapabilities(ollama).includes("models"));

const adapter = createProviderAdapter(ollama);
assert.equal(typeof adapter.health, "function");
assert.equal(typeof adapter.chat, "function");
assert.equal(typeof adapter.completion, "function");
assert.equal(typeof adapter.embeddings, "function");

const providers = configuredProviders(paths);
assert.ok(providers.length >= 3);
assert.ok(providers.every((provider) => Array.isArray(provider.capabilities)));

console.log("✅ Provider architecture smoke test passed.");
