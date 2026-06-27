export const CAPABILITIES = {
  CHAT: "chat",
  COMPLETION: "completion",
  EMBEDDINGS: "embeddings",
  MODELS: "models",
  HEALTH: "health",
  VISION: "vision",
  TOOLS: "tools"
};

export function normalizeCapabilities(value = []) {
  return [...new Set(value.filter(Boolean))].sort();
}

export function hasCapability(provider, capability) {
  return normalizeCapabilities(provider.capabilities ?? []).includes(capability);
}

export function requiresCapabilities(provider, capabilities = []) {
  const current = normalizeCapabilities(provider.capabilities ?? []);
  return capabilities.every((capability) => current.includes(capability));
}

export function inferCapabilities(provider) {
  if (Array.isArray(provider.capabilities) && provider.capabilities.length > 0) {
    return normalizeCapabilities(provider.capabilities);
  }

  if (provider.type === "ollama") {
    return normalizeCapabilities([
      CAPABILITIES.HEALTH,
      CAPABILITIES.MODELS,
      CAPABILITIES.CHAT,
      CAPABILITIES.COMPLETION,
      CAPABILITIES.EMBEDDINGS
    ]);
  }

  if (provider.type === "llama-cpp") {
    return normalizeCapabilities([
      CAPABILITIES.HEALTH,
      CAPABILITIES.MODELS,
      CAPABILITIES.CHAT,
      CAPABILITIES.COMPLETION,
      CAPABILITIES.EMBEDDINGS
    ]);
  }

  if (provider.type === "openai-compatible-local") {
    return normalizeCapabilities([
      CAPABILITIES.HEALTH,
      CAPABILITIES.MODELS,
      CAPABILITIES.CHAT,
      CAPABILITIES.COMPLETION,
      CAPABILITIES.EMBEDDINGS
    ]);
  }

  return normalizeCapabilities([CAPABILITIES.HEALTH]);
}
