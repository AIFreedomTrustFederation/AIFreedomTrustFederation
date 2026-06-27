import { bestProvider, providerHealth, readProviders } from "./registry.mjs";
import { createProviderAdapter } from "./adapters/index.mjs";
import { inferCapabilities, requiresCapabilities } from "./capabilities/schema.mjs";

export async function availableProviders(paths, requiredCapabilities = []) {
  const health = await providerHealth(paths);

  return health
    .filter((provider) => provider.ok)
    .map((provider) => ({
      ...provider,
      capabilities: inferCapabilities(provider)
    }))
    .filter((provider) => requiresCapabilities(provider, requiredCapabilities));
}

export async function selectProvider(paths, requiredCapabilities = []) {
  const providers = await availableProviders(paths, requiredCapabilities);
  return providers[0] ?? null;
}

export async function selectProviderAdapter(paths, requiredCapabilities = []) {
  const provider = await selectProvider(paths, requiredCapabilities);
  if (!provider) return null;

  return createProviderAdapter(provider);
}

export async function routeChat(paths, request) {
  const adapter = await selectProviderAdapter(paths, ["chat"]);
  if (!adapter) {
    return {
      ok: false,
      error: "No reachable local provider with chat capability."
    };
  }

  return adapter.chat(request);
}

export async function routeCompletion(paths, request) {
  const adapter = await selectProviderAdapter(paths, ["completion"]);
  if (!adapter) {
    return {
      ok: false,
      error: "No reachable local provider with completion capability."
    };
  }

  return adapter.completion(request);
}

export async function routeEmbeddings(paths, request) {
  const adapter = await selectProviderAdapter(paths, ["embeddings"]);
  if (!adapter) {
    return {
      ok: false,
      error: "No reachable local provider with embeddings capability."
    };
  }

  return adapter.embeddings(request);
}

export async function modelInventory(paths) {
  const providers = await availableProviders(paths, ["models"]);
  const results = [];

  for (const provider of providers) {
    const adapter = createProviderAdapter(provider);
    const models = await adapter.models();

    results.push({
      providerId: provider.id,
      providerType: provider.type,
      endpoint: provider.endpoint,
      ok: models.ok,
      models: models.models ?? [],
      status: models.status,
      error: models.error
    });
  }

  return results;
}

export function configuredProviders(paths) {
  return readProviders(paths).map((provider) => ({
    ...provider,
    capabilities: inferCapabilities(provider)
  }));
}

export async function activeProvider(paths) {
  const provider = await bestProvider(paths);
  if (!provider) return null;

  return {
    ...provider,
    capabilities: inferCapabilities(provider)
  };
}
