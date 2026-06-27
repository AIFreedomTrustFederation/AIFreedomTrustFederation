#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🧠 AIFT-Forge Phase 8: Local Model Orchestration"

mkdir -p packages/forge-core/src/models
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/models
mkdir -p .forge/model-routes
mkdir -p .forge/model-runs

cat > packages/forge-core/src/models/store.mjs <<'JS'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function modelDir(paths) {
  return join(paths.repoRoot, ".forge", "models");
}

export function routeDir(paths) {
  return join(paths.repoRoot, ".forge", "model-routes");
}

export function modelRunDir(paths) {
  return join(paths.repoRoot, ".forge", "model-runs");
}

export function ensureModelStore(paths) {
  mkdirSync(modelDir(paths), { recursive: true });
  mkdirSync(routeDir(paths), { recursive: true });
  mkdirSync(modelRunDir(paths), { recursive: true });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function modelFile(paths, id) {
  return join(modelDir(paths), `${normalizeId(id)}.json`);
}

export function routeFile(paths, id) {
  return join(routeDir(paths), `${normalizeId(id)}.json`);
}

export function modelRunFile(paths, id) {
  return join(modelRunDir(paths), `${normalizeId(id)}.json`);
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function upsertModel(paths, model) {
  ensureModelStore(paths);

  const id = normalizeId(model.id ?? model.name);

  if (!id) throw new Error("Model id is required.");

  const existing = existsSync(modelFile(paths, id))
    ? readJson(modelFile(paths, id))
    : null;

  const next = {
    schema: "aift.forge.local-model.v1",
    id,
    name: model.name ?? id,
    providerId: model.providerId ?? existing?.providerId ?? null,
    providerType: model.providerType ?? existing?.providerType ?? null,
    endpoint: model.endpoint ?? existing?.endpoint ?? null,
    capabilities: model.capabilities ?? existing?.capabilities ?? ["chat"],
    tags: model.tags ?? existing?.tags ?? [],
    priority: Number(model.priority ?? existing?.priority ?? 50),
    enabled: model.enabled ?? existing?.enabled ?? true,
    discovered: model.discovered ?? existing?.discovered ?? false,
    metadata: model.metadata ?? existing?.metadata ?? {},
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(modelFile(paths, id), next);
  return next;
}

export function readModel(paths, id) {
  ensureModelStore(paths);

  const file = modelFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listModels(paths) {
  ensureModelStore(paths);

  return readdirSync(modelDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(modelDir(paths), file)))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id));
}

export function createRoute(paths, route) {
  ensureModelStore(paths);

  const id = normalizeId(route.id ?? route.capability ?? "default");

  if (!id) throw new Error("Route id is required.");

  const next = {
    schema: "aift.forge.model-route.v1",
    id,
    capability: route.capability ?? id,
    label: route.label ?? id,
    enabled: route.enabled ?? true,
    strategy: route.strategy ?? "priority",
    preferredModels: route.preferredModels ?? [],
    fallbackModels: route.fallbackModels ?? [],
    requiredTags: route.requiredTags ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(routeFile(paths, id), next);
  return next;
}

export function readRoute(paths, id) {
  ensureModelStore(paths);

  const file = routeFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listRoutes(paths) {
  ensureModelStore(paths);

  return readdirSync(routeDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(routeDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function createDefaultRoutes(paths) {
  ensureModelStore(paths);

  const defaults = [
    {
      id: "chat",
      capability: "chat",
      label: "General chat",
      strategy: "priority"
    },
    {
      id: "completion",
      capability: "completion",
      label: "Text completion",
      strategy: "priority"
    },
    {
      id: "embeddings",
      capability: "embeddings",
      label: "Embeddings",
      strategy: "priority"
    },
    {
      id: "planner",
      capability: "chat",
      label: "Planning model",
      strategy: "priority",
      requiredTags: ["planner"]
    },
    {
      id: "coder",
      capability: "chat",
      label: "Coding model",
      strategy: "priority",
      requiredTags: ["coder"]
    },
    {
      id: "reviewer",
      capability: "chat",
      label: "Review model",
      strategy: "priority",
      requiredTags: ["reviewer"]
    }
  ];

  const created = [];

  for (const route of defaults) {
    if (!readRoute(paths, route.id)) {
      created.push(createRoute(paths, route));
    }
  }

  return created;
}

export function createModelRun(paths, run) {
  ensureModelStore(paths);

  const id = normalizeId(run.id ?? `model-run-${Date.now()}`);

  const next = {
    schema: "aift.forge.model-run.v1",
    id,
    routeId: run.routeId ?? null,
    modelId: run.modelId ?? null,
    providerId: run.providerId ?? null,
    capability: run.capability ?? null,
    status: run.status ?? "running",
    request: run.request ?? {},
    response: run.response ?? null,
    error: run.error ?? null,
    startedAt: new Date().toISOString(),
    finishedAt: null
  };

  writeJson(modelRunFile(paths, id), next);
  return next;
}

export function readModelRun(paths, id) {
  ensureModelStore(paths);

  const file = modelRunFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function updateModelRun(paths, id, patch) {
  const existing = readModelRun(paths, id);
  if (!existing) throw new Error(`Model run not found: ${id}`);

  const next = {
    ...existing,
    ...patch
  };

  writeJson(modelRunFile(paths, id), next);
  return next;
}

export function finishModelRun(paths, id, patch = {}) {
  return updateModelRun(paths, id, {
    ...patch,
    status: patch.status ?? "complete",
    finishedAt: new Date().toISOString()
  });
}

export function listModelRuns(paths) {
  ensureModelStore(paths);

  return readdirSync(modelRunDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(modelRunDir(paths), file)))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}
JS

cat > packages/forge-core/src/models/orchestrator.mjs <<'JS'
import { discoverModels, extractText } from "../ai/runtime.mjs";
import { routeChat, routeCompletion, routeEmbeddings } from "../providers/router.mjs";
import {
  createDefaultRoutes,
  createModelRun,
  finishModelRun,
  listModels,
  readModel,
  readRoute,
  upsertModel
} from "./store.mjs";

export function inferModelCapabilities(providerType, rawModel = {}) {
  const name = rawModel.name ?? rawModel.id ?? rawModel.model ?? "";

  const capabilities = new Set(["chat", "completion"]);

  if (providerType === "ollama") capabilities.add("embeddings");
  if (providerType === "openai-compatible-local") capabilities.add("embeddings");
  if (providerType === "llama-cpp") capabilities.add("embeddings");

  const lower = String(name).toLowerCase();

  if (lower.includes("embed")) {
    capabilities.clear();
    capabilities.add("embeddings");
  }

  return [...capabilities].sort();
}

export function inferModelTags(rawModel = {}) {
  const name = String(rawModel.name ?? rawModel.id ?? rawModel.model ?? "").toLowerCase();
  const tags = new Set();

  if (name.includes("code") || name.includes("coder") || name.includes("qwen") || name.includes("deepseek")) {
    tags.add("coder");
  }

  if (name.includes("reason") || name.includes("deepseek") || name.includes("qwen")) {
    tags.add("planner");
  }

  if (name.includes("llama") || name.includes("mistral") || name.includes("gemma")) {
    tags.add("chat");
  }

  if (name.includes("embed")) {
    tags.add("embedding");
  }

  if (tags.size === 0) tags.add("general");

  return [...tags].sort();
}

export async function refreshModelRegistry(paths) {
  createDefaultRoutes(paths);

  const inventory = await discoverModels(paths);
  const registered = [];

  for (const provider of inventory) {
    if (!provider.ok) continue;

    for (const raw of provider.models ?? []) {
      const modelName = raw.name ?? raw.id ?? raw.model;
      if (!modelName) continue;

      registered.push(upsertModel(paths, {
        id: `${provider.providerId}-${modelName}`,
        name: modelName,
        providerId: provider.providerId,
        providerType: provider.providerType,
        endpoint: provider.endpoint,
        capabilities: inferModelCapabilities(provider.providerType, raw),
        tags: inferModelTags(raw),
        priority: 80,
        discovered: true,
        metadata: raw
      }));
    }
  }

  return registered;
}

export function selectModelForRoute(paths, routeId) {
  const route = readRoute(paths, routeId);

  if (!route || !route.enabled) {
    return {
      ok: false,
      error: `Model route not found or disabled: ${routeId}`
    };
  }

  const models = listModels(paths).filter((model) => model.enabled);

  const byId = new Map(models.map((model) => [model.id, model]));

  for (const id of route.preferredModels ?? []) {
    const found = byId.get(id);
    if (found) {
      return {
        ok: true,
        route,
        model: found,
        reason: "preferred"
      };
    }
  }

  const matching = models.filter((model) => {
    const hasCapability = model.capabilities?.includes(route.capability);
    const hasTags = (route.requiredTags ?? []).every((tag) => model.tags?.includes(tag));

    return hasCapability && hasTags;
  });

  if (matching.length > 0) {
    return {
      ok: true,
      route,
      model: matching[0],
      reason: "capability-match"
    };
  }

  for (const id of route.fallbackModels ?? []) {
    const found = byId.get(id);
    if (found) {
      return {
        ok: true,
        route,
        model: found,
        reason: "fallback"
      };
    }
  }

  return {
    ok: false,
    route,
    error: `No model available for route: ${routeId}`
  };
}

export async function runModelRoute(paths, routeId, request = {}) {
  const selection = selectModelForRoute(paths, routeId);

  if (!selection.ok) {
    return {
      ok: false,
      error: selection.error
    };
  }

  const { route, model } = selection;

  const run = createModelRun(paths, {
    routeId: route.id,
    modelId: model.id,
    providerId: model.providerId,
    capability: route.capability,
    request
  });

  try {
    let result;

    if (route.capability === "completion") {
      result = await routeCompletion(paths, {
        model: model.name,
        prompt: request.prompt,
        stream: false
      });
    } else if (route.capability === "embeddings") {
      result = await routeEmbeddings(paths, {
        model: model.name,
        input: request.input ?? request.prompt ?? ""
      });
    } else {
      result = await routeChat(paths, {
        model: model.name,
        messages: request.messages ?? [
          {
            role: "user",
            content: request.prompt ?? ""
          }
        ],
        stream: false
      });
    }

    if (!result.ok) {
      finishModelRun(paths, run.id, {
        status: "failed",
        error: result.error ?? "Model route failed",
        response: result.body ?? null
      });

      return {
        ok: false,
        runId: run.id,
        routeId: route.id,
        modelId: model.id,
        error: result.error ?? "Model route failed"
      };
    }

    finishModelRun(paths, run.id, {
      status: "complete",
      response: result.body
    });

    return {
      ok: true,
      runId: run.id,
      routeId: route.id,
      modelId: model.id,
      providerId: model.providerId,
      text: extractText(result),
      response: result.body
    };
  } catch (error) {
    finishModelRun(paths, run.id, {
      status: "failed",
      error: error.message
    });

    return {
      ok: false,
      runId: run.id,
      routeId: route.id,
      modelId: model.id,
      error: error.message
    };
  }
}

export function registerManualModel(paths, value) {
  createDefaultRoutes(paths);

  return upsertModel(paths, {
    id: value.id,
    name: value.name ?? value.id,
    providerId: value.providerId,
    providerType: value.providerType,
    endpoint: value.endpoint,
    capabilities: value.capabilities ?? ["chat", "completion"],
    tags: value.tags ?? ["general"],
    priority: value.priority ?? 50,
    discovered: false,
    enabled: value.enabled ?? true
  });
}
JS

cat > packages/forge-core/src/commands/model.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  createDefaultRoutes,
  createRoute,
  listModelRuns,
  listModels,
  listRoutes,
  readModel,
  readRoute,
  upsertModel
} from "../models/store.mjs";
import {
  refreshModelRegistry,
  registerManualModel,
  runModelRoute,
  selectModelForRoute
} from "../models/orchestrator.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function csv(value, fallback = []) {
  if (!value) return fallback;

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function model(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "init") {
    const routes = createDefaultRoutes(paths);

    console.log("✅ Model orchestration initialized");
    console.log(`created routes: ${routes.length}`);
    return;
  }

  if (action === "refresh") {
    const models = await refreshModelRegistry(paths);

    console.log("✅ Model registry refreshed");
    console.log(`models discovered: ${models.length}`);
    return;
  }

  if (action === "register") {
    const id = args[1];
    const name = readFlag(args, "--name", id);
    const providerId = readFlag(args, "--provider");
    const providerType = readFlag(args, "--type", "ollama");
    const endpoint = readFlag(args, "--endpoint", null);
    const capabilities = csv(readFlag(args, "--capabilities", "chat,completion"));
    const tags = csv(readFlag(args, "--tags", "general"));
    const priority = Number(readFlag(args, "--priority", "50"));

    if (!id || !providerId) {
      console.log("Usage:");
      console.log("  aift-forge model register llama-local --name llama3.2 --provider ollama-localhost --type ollama --tags chat,planner");
      return;
    }

    const created = registerManualModel(paths, {
      id,
      name,
      providerId,
      providerType,
      endpoint,
      capabilities,
      tags,
      priority
    });

    console.log("✅ Model registered");
    console.log(`id: ${created.id}`);
    console.log(`name: ${created.name}`);
    console.log(`provider: ${created.providerId}`);
    return;
  }

  if (action === "list") {
    const models = listModels(paths);

    console.log("🧠 Local Model Registry");
    console.log("");

    if (models.length === 0) {
      console.log("No models registered yet.");
      console.log("Run:");
      console.log("  aift-forge model refresh");
      return;
    }

    for (const item of models) {
      console.log(`${item.enabled ? "✅" : "⬜"} ${item.id}`);
      console.log(`   name: ${item.name}`);
      console.log(`   provider: ${item.providerId ?? "none"}`);
      console.log(`   capabilities: ${(item.capabilities ?? []).join(", ")}`);
      console.log(`   tags: ${(item.tags ?? []).join(", ")}`);
      console.log(`   priority: ${item.priority}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const item = readModel(paths, id);

    if (!item) {
      console.log(`❌ Model not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(item, null, 2));
    return;
  }

  if (action === "route-create") {
    const id = args[1];
    const capability = readFlag(args, "--capability", id);
    const preferredModels = csv(readFlag(args, "--preferred", ""));
    const fallbackModels = csv(readFlag(args, "--fallback", ""));
    const requiredTags = csv(readFlag(args, "--tags", ""));

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge model route-create planner --capability chat --tags planner");
      return;
    }

    const route = createRoute(paths, {
      id,
      capability,
      preferredModels,
      fallbackModels,
      requiredTags
    });

    console.log("✅ Model route created");
    console.log(`id: ${route.id}`);
    console.log(`capability: ${route.capability}`);
    return;
  }

  if (action === "routes") {
    const routes = listRoutes(paths);

    console.log("🧭 Model Routes");
    console.log("");

    if (routes.length === 0) {
      console.log("No routes yet.");
      console.log("Run:");
      console.log("  aift-forge model init");
      return;
    }

    for (const route of routes) {
      const selection = selectModelForRoute(paths, route.id);

      console.log(`${route.enabled ? "✅" : "⬜"} ${route.id} — ${route.label}`);
      console.log(`   capability: ${route.capability}`);
      console.log(`   tags: ${(route.requiredTags ?? []).join(", ") || "none"}`);
      console.log(`   selected: ${selection.ok ? selection.model.id : "none"}`);
    }

    return;
  }

  if (action === "route-show") {
    const id = args[1];
    const route = readRoute(paths, id);

    if (!route) {
      console.log(`❌ Route not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(route, null, 2));
    return;
  }

  if (action === "select") {
    const id = args[1] ?? "chat";
    const selection = selectModelForRoute(paths, id);

    if (!selection.ok) {
      console.log(`❌ ${selection.error}`);
      return;
    }

    console.log("✅ Model selected");
    console.log(`route: ${selection.route.id}`);
    console.log(`model: ${selection.model.id}`);
    console.log(`provider: ${selection.model.providerId}`);
    console.log(`reason: ${selection.reason}`);
    return;
  }

  if (action === "run") {
    const routeId = args[1] ?? "chat";
    const prompt = args.slice(2).join(" ").trim();

    if (!prompt) {
      console.log("Usage:");
      console.log("  aift-forge model run chat \"Say hello\"");
      console.log("  aift-forge model run planner \"Plan the next Forge milestone\"");
      return;
    }

    const result = await runModelRoute(paths, routeId, { prompt });

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      if (result.runId) console.log(`run: ${result.runId}`);
      return;
    }

    console.log(result.text);
    console.log("");
    console.log(`run: ${result.runId}`);
    console.log(`model: ${result.modelId}`);
    return;
  }

  if (action === "runs") {
    const runs = listModelRuns(paths);

    console.log("📜 Model Runs");
    console.log("");

    if (runs.length === 0) {
      console.log("No model runs yet.");
      return;
    }

    for (const run of runs) {
      console.log(`${run.status === "complete" ? "✅" : "🟡"} ${run.id}`);
      console.log(`   route: ${run.routeId}`);
      console.log(`   model: ${run.modelId}`);
      console.log(`   status: ${run.status}`);
    }

    return;
  }

  console.log("Forge Local Model Orchestration");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge model init");
  console.log("  aift-forge model refresh");
  console.log("  aift-forge model register llama-local --name llama3.2 --provider ollama-localhost --type ollama --tags chat,planner");
  console.log("  aift-forge model list");
  console.log("  aift-forge model routes");
  console.log("  aift-forge model select chat");
  console.log("  aift-forge model run chat \"Say hello\"");
  console.log("  aift-forge model runs");
}
JS

cat > scripts/aift-model-orchestration-smoke.mjs <<'JS'
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
JS

cat > docs/LOCAL_MODEL_ORCHESTRATION_PHASE_8.md <<'MD'
# AIFT-Forge Phase 8: Local Model Orchestration

Phase 8 adds a local model registry and routing policy layer.

This sits above the provider registry.

## Storage

Model records:

    .forge/models/

Route records:

    .forge/model-routes/

Model run records:

    .forge/model-runs/

## Model Object

A model contains:

- id
- name
- provider id
- provider type
- capabilities
- tags
- priority
- enabled flag
- discovery metadata

## Route Object

A route describes how Forge chooses models for a purpose.

Default routes:

- `chat`
- `completion`
- `embeddings`
- `planner`
- `coder`
- `reviewer`

## Commands

Initialize default routes:

    aift-forge model init

Discover models from live providers:

    aift-forge model refresh

Register a model manually:

    aift-forge model register llama-local --name llama3.2 --provider ollama-localhost --type ollama --tags chat,planner

List models:

    aift-forge model list

List routes:

    aift-forge model routes

Select route model:

    aift-forge model select chat

Run through a route:

    aift-forge model run chat "Say hello"

Show model runs:

    aift-forge model runs

## Governance

Local model orchestration is:

- local-first
- provider-registry based
- route-policy based
- no cloud fallback
- inspectable
- JSON-backed
- Android/Termux-compatible
MD

node --check packages/forge-core/src/models/store.mjs
node --check packages/forge-core/src/models/orchestrator.mjs
node --check packages/forge-core/src/commands/model.mjs
node --check scripts/aift-model-orchestration-smoke.mjs
node scripts/aift-model-orchestration-smoke.mjs

echo ""
echo "✅ Phase 8 Local Model Orchestration complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  model -> packages/forge-core/src/commands/model.mjs"
echo ""
echo "Then test:"
echo "  aift-forge model init"
echo "  aift-forge model list"
echo "  aift-forge model routes"
echo "  aift-forge model select chat"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 8 local model orchestration\""
echo "  git push origin main"
