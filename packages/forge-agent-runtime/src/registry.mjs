import { manualProvider } from "./providers/manual.mjs";
import { ollamaProvider } from "./providers/ollama.mjs";
import { openAiCompatibleProvider } from "./providers/openai-compatible.mjs";

export const providers = [
  ollamaProvider,
  manualProvider,
  openAiCompatibleProvider
];

export function listProviders() {
  return providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    mode: provider.mode,
    enabled: provider.enabled !== false,
    localOnly: provider.localOnly === true,
    openSource: provider.openSource === true,
    endpoint: provider.endpoint ?? null,
    model: provider.model ?? null
  }));
}

export async function providerHealth() {
  const results = [];

  for (const provider of providers) {
    if (typeof provider.health === "function") {
      results.push({
        id: provider.id,
        label: provider.label,
        ...(await provider.health())
      });
    } else {
      results.push({
        id: provider.id,
        label: provider.label,
        ok: false,
        status: "unknown"
      });
    }
  }

  return results;
}

export async function chooseProvider(packet, preferred = null) {
  const allowed = providers.filter((provider) =>
    provider.enabled !== false &&
    provider.localOnly === true &&
    provider.canSolve(packet)
  );

  if (preferred) {
    const found = allowed.find((provider) => provider.id === preferred);
    if (found) {
      const health = await found.health?.();
      if (!health || health.ok) return found;
    }
  }

  for (const provider of allowed) {
    if (provider.id === "manual") continue;

    const health = await provider.health?.();
    if (!health || health.ok) return provider;
  }

  return allowed.find((provider) => provider.id === "manual") ?? null;
}
