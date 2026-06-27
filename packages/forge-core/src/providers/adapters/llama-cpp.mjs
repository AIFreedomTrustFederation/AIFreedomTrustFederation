import { createOpenAICompatibleLocalAdapter } from "./openai-compatible-local.mjs";

export function createLlamaCppAdapter(provider) {
  const normalized = {
    ...provider,
    endpoint: provider.endpoint.replace(/\/$/, "")
  };

  return createOpenAICompatibleLocalAdapter(normalized);
}
