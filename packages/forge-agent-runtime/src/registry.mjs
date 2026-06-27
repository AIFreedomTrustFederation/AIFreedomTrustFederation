import { manualProvider } from "./providers/manual.mjs";
import { ollamaProvider } from "./providers/ollama.mjs";
import { openAiCompatibleProvider } from "./providers/openai-compatible.mjs";

export const providers = [
  manualProvider,
  ollamaProvider,
  openAiCompatibleProvider
];

export function listProviders() {
  return providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    mode: provider.mode,
    enabled: provider.enabled !== false
  }));
}

export function chooseProvider(packet, preferred = null) {
  if (preferred) {
    const found = providers.find((provider) => provider.id === preferred);
    if (found && found.enabled !== false && found.canSolve(packet)) {
      return found;
    }
  }

  return providers.find((provider) => provider.enabled !== false && provider.canSolve(packet)) ?? null;
}
