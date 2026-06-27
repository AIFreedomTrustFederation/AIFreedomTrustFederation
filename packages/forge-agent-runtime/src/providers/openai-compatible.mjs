export const openAiCompatibleProvider = {
  id: "openai-compatible",
  label: "OpenAI-Compatible Provider",
  mode: "future",
  enabled: false,

  canSolve() {
    return false;
  },

  async solve() {
    return {
      ok: false,
      provider: "openai-compatible",
      reason: "Remote model provider scaffold exists but is disabled by default."
    };
  }
};
