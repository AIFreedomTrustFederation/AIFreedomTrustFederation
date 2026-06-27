export const ollamaProvider = {
  id: "ollama",
  label: "Ollama Local Provider",
  mode: "future",
  enabled: false,

  canSolve() {
    return false;
  },

  async solve() {
    return {
      ok: false,
      provider: "ollama",
      reason: "Ollama provider scaffold exists but is disabled until a local model endpoint is configured."
    };
  }
};
