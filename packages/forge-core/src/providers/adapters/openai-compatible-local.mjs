import { requestJson } from "./http.mjs";

function endpoint(provider, path) {
  return `${provider.endpoint.replace(/\/$/, "")}${path}`;
}

export function createOpenAICompatibleLocalAdapter(provider) {
  return {
    provider,

    async health() {
      return requestJson(endpoint(provider, "/models"), { timeoutMs: 2500 });
    },

    async models() {
      const result = await requestJson(endpoint(provider, "/models"), { timeoutMs: 5000 });
      if (!result.ok) return result;

      return {
        ok: true,
        status: result.status,
        models: result.body?.data ?? result.body?.models ?? []
      };
    },

    async chat({ model, messages = [], stream = false, options = {} }) {
      return requestJson(endpoint(provider, "/chat/completions"), {
        method: "POST",
        timeoutMs: 120000,
        body: {
          model,
          messages,
          stream,
          ...options
        }
      });
    },

    async completion({ model, prompt, stream = false, options = {} }) {
      return requestJson(endpoint(provider, "/completions"), {
        method: "POST",
        timeoutMs: 120000,
        body: {
          model,
          prompt,
          stream,
          ...options
        }
      });
    },

    async embeddings({ model, input }) {
      return requestJson(endpoint(provider, "/embeddings"), {
        method: "POST",
        timeoutMs: 60000,
        body: {
          model,
          input
        }
      });
    }
  };
}
