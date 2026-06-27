import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  createDefaultRoutes,
  listRoutes,
  readRoute
} from "../packages/forge-core/src/models/store.mjs";
import {
  inferModelCapabilities,
  inferModelTags,
  registerManualModel,
  selectModelForRoute
} from "../packages/forge-core/src/models/orchestrator.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/models/test-llama.json", { force: true });
rmSync(".forge/model-routes/chat.json", { force: true });
rmSync(".forge/model-routes/planner.json", { force: true });

const routes = createDefaultRoutes(paths);
assert.ok(routes.length >= 1);

const chatRoute = readRoute(paths, "chat");
assert.equal(chatRoute.capability, "chat");

const tags = inferModelTags({ name: "deepseek-coder" });
assert.ok(tags.includes("coder"));

const capabilities = inferModelCapabilities("ollama", { name: "llama3.2" });
assert.ok(capabilities.includes("chat"));

const model = registerManualModel(paths, {
  id: "test-llama",
  name: "llama3.2",
  providerId: "ollama-localhost",
  providerType: "ollama",
  capabilities: ["chat", "completion", "embeddings"],
  tags: ["chat", "planner"],
  priority: 100
});

assert.equal(model.id, "test-llama");

const selected = selectModelForRoute(paths, "chat");
assert.equal(selected.ok, true);
assert.equal(selected.model.id, "test-llama");

const planner = selectModelForRoute(paths, "planner");
assert.equal(planner.ok, true);

const allRoutes = listRoutes(paths);
assert.ok(allRoutes.some((item) => item.id === "chat"));

console.log("✅ Local model orchestration smoke test passed.");
