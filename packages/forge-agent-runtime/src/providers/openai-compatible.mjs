export const openAiCompatibleProvider = {
  id: "openai-compatible",
  label: "OpenAI-Compatible Remote Endpoint",
  mode: "disabled-remote",
  enabled: false,
  localOnly: false,
  openSource: false,

  canSolve() {
    return false;
  },

  async health() {
    return {
      ok: false,
      status: "disabled",
      reason: "Remote/API provider disabled by governance. Local-only mode forbids API keys."
    };
  },

  async solve() {
    return {
      ok: false,
      provider: "openai-compatible",
      reason: "Disabled. Forge is configured for open-source local-only providers."
    };
  }
};
