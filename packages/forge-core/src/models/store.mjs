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
