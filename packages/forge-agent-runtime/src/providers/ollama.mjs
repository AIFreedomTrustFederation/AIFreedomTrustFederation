import { localJsonPost } from "../local/http.mjs";

const endpoint = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const model = process.env.FORGE_OLLAMA_MODEL ?? "qwen2.5-coder:7b";

export const ollamaProvider = {
  id: "ollama",
  label: "Ollama Local Model",
  mode: "local-llm",
  enabled: true,
  localOnly: true,
  openSource: true,
  endpoint,
  model,

  canSolve(packet) {
    return Boolean(packet);
  },

  async health() {
    const result = await localJsonPost(`${endpoint}/api/tags`, {}, { timeoutMs: 3000 });

    if (!result.ok) {
      return {
        ok: false,
        status: "offline",
        reason: "Ollama is not reachable locally. Install/start Ollama or use manual provider."
      };
    }

    return {
      ok: true,
      status: "available",
      endpoint,
      model
    };
  },

  async solve(packet) {
    const prompt = [
      "You are a local-only open-source Forge coding agent.",
      "No API keys. No remote calls. No dependency installs. No commits. No pushes.",
      "Return only a unified diff or exact file writes.",
      "",
      "TASK PACKET JSON:",
      JSON.stringify(packet, null, 2)
    ].join("\\n");

    const result = await localJsonPost(`${endpoint}/api/generate`, {
      model,
      prompt,
      stream: false
    });

    if (!result.ok) {
      return {
        ok: false,
        provider: "ollama",
        reason: result.error ?? "Ollama generation failed."
      };
    }

    return {
      ok: true,
      provider: "ollama",
      mode: "local-llm",
      text: result.json?.response ?? "",
      model
    };
  }
};
