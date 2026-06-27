import { createOllamaAdapter } from "./ollama.mjs";
import { createLlamaCppAdapter } from "./llama-cpp.mjs";
import { createOpenAICompatibleLocalAdapter } from "./openai-compatible-local.mjs";

export function createProviderAdapter(provider) {
  if (provider.type === "ollama") return createOllamaAdapter(provider);
  if (provider.type === "llama-cpp") return createLlamaCppAdapter(provider);
  if (provider.type === "openai-compatible-local") return createOpenAICompatibleLocalAdapter(provider);

  throw new Error(`Unsupported provider type: ${provider.type}`);
}
