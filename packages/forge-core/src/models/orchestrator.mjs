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
