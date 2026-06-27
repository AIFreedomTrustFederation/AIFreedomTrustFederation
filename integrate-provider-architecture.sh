#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🧠 Integrating canonical provider architecture into AIFT-Forge"

mkdir -p packages/forge-core/src/providers/adapters
mkdir -p packages/forge-core/src/providers/capabilities
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts

cat > packages/forge-core/src/providers/capabilities/schema.mjs <<'JS'
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
JS

cat > packages/forge-core/src/providers/adapters/http.mjs <<'JS'
import http from "node:http";
import https from "node:https";

export function requestJson(url, options = {}) {
  const {
    method = "GET",
    body = undefined,
    timeoutMs = 60000,
    headers = {}
  } = options;

  return new Promise((resolve) => {
    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, error: "invalid url" });
      return;
    }

    const transport = parsed.protocol === "https:" ? https : http;
    const data = body === undefined ? undefined : JSON.stringify(body);

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        timeout: timeoutMs,
        headers: {
          accept: "application/json",
          ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}),
          ...headers
        }
      },
      (res) => {
        let raw = "";

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          let parsedBody = raw;

          try {
            parsedBody = raw ? JSON.parse(raw) : null;
          } catch {
            parsedBody = raw;
          }

          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: parsedBody
          });
        });
      }
    );

    req.on("error", (error) => {
      resolve({ ok: false, error: error.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });

    if (data) req.write(data);
    req.end();
  });
}
JS

cat > packages/forge-core/src/providers/adapters/ollama.mjs <<'JS'
import { requestJson } from "./http.mjs";

function endpoint(provider, path) {
  return `${provider.endpoint.replace(/\/$/, "")}${path}`;
}

export function createOllamaAdapter(provider) {
  return {
    provider,

    async health() {
      return requestJson(endpoint(provider, "/api/tags"), { timeoutMs: 2500 });
    },

    async models() {
      const result = await requestJson(endpoint(provider, "/api/tags"), { timeoutMs: 5000 });
      if (!result.ok) return result;

      return {
        ok: true,
        status: result.status,
        models: result.body?.models ?? []
      };
    },

    async chat({ model, messages = [], stream = false, options = {} }) {
      return requestJson(endpoint(provider, "/api/chat"), {
        method: "POST",
        timeoutMs: 120000,
        body: {
          model,
          messages,
          stream,
          options
        }
      });
    },

    async completion({ model, prompt, stream = false, options = {} }) {
      return requestJson(endpoint(provider, "/api/generate"), {
        method: "POST",
        timeoutMs: 120000,
        body: {
          model,
          prompt,
          stream,
          options
        }
      });
    },

    async embeddings({ model, input }) {
      return requestJson(endpoint(provider, "/api/embeddings"), {
        method: "POST",
        timeoutMs: 60000,
        body: {
          model,
          prompt: Array.isArray(input) ? input.join("\n") : input
        }
      });
    }
  };
}
JS

cat > packages/forge-core/src/providers/adapters/openai-compatible-local.mjs <<'JS'
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
JS

cat > packages/forge-core/src/providers/adapters/llama-cpp.mjs <<'JS'
import { createOpenAICompatibleLocalAdapter } from "./openai-compatible-local.mjs";

export function createLlamaCppAdapter(provider) {
  const normalized = {
    ...provider,
    endpoint: provider.endpoint.replace(/\/$/, "")
  };

  return createOpenAICompatibleLocalAdapter(normalized);
}
JS

cat > packages/forge-core/src/providers/adapters/index.mjs <<'JS'
import { createOllamaAdapter } from "./ollama.mjs";
import { createLlamaCppAdapter } from "./llama-cpp.mjs";
import { createOpenAICompatibleLocalAdapter } from "./openai-compatible-local.mjs";

export function createProviderAdapter(provider) {
  if (provider.type === "ollama") return createOllamaAdapter(provider);
  if (provider.type === "llama-cpp") return createLlamaCppAdapter(provider);
  if (provider.type === "openai-compatible-local") return createOpenAICompatibleLocalAdapter(provider);

  throw new Error(`Unsupported provider type: ${provider.type}`);
}
JS

cat > packages/forge-core/src/providers/router.mjs <<'JS'
import { bestProvider, providerHealth, readProviders } from "./registry.mjs";
import { createProviderAdapter } from "./adapters/index.mjs";
import { inferCapabilities, requiresCapabilities } from "./capabilities/schema.mjs";

export async function availableProviders(paths, requiredCapabilities = []) {
  const health = await providerHealth(paths);

  return health
    .filter((provider) => provider.ok)
    .map((provider) => ({
      ...provider,
      capabilities: inferCapabilities(provider)
    }))
    .filter((provider) => requiresCapabilities(provider, requiredCapabilities));
}

export async function selectProvider(paths, requiredCapabilities = []) {
  const providers = await availableProviders(paths, requiredCapabilities);
  return providers[0] ?? null;
}

export async function selectProviderAdapter(paths, requiredCapabilities = []) {
  const provider = await selectProvider(paths, requiredCapabilities);
  if (!provider) return null;

  return createProviderAdapter(provider);
}

export async function routeChat(paths, request) {
  const adapter = await selectProviderAdapter(paths, ["chat"]);
  if (!adapter) {
    return {
      ok: false,
      error: "No reachable local provider with chat capability."
    };
  }

  return adapter.chat(request);
}

export async function routeCompletion(paths, request) {
  const adapter = await selectProviderAdapter(paths, ["completion"]);
  if (!adapter) {
    return {
      ok: false,
      error: "No reachable local provider with completion capability."
    };
  }

  return adapter.completion(request);
}

export async function routeEmbeddings(paths, request) {
  const adapter = await selectProviderAdapter(paths, ["embeddings"]);
  if (!adapter) {
    return {
      ok: false,
      error: "No reachable local provider with embeddings capability."
    };
  }

  return adapter.embeddings(request);
}

export async function modelInventory(paths) {
  const providers = await availableProviders(paths, ["models"]);
  const results = [];

  for (const provider of providers) {
    const adapter = createProviderAdapter(provider);
    const models = await adapter.models();

    results.push({
      providerId: provider.id,
      providerType: provider.type,
      endpoint: provider.endpoint,
      ok: models.ok,
      models: models.models ?? [],
      status: models.status,
      error: models.error
    });
  }

  return results;
}

export function configuredProviders(paths) {
  return readProviders(paths).map((provider) => ({
    ...provider,
    capabilities: inferCapabilities(provider)
  }));
}

export async function activeProvider(paths) {
  const provider = await bestProvider(paths);
  if (!provider) return null;

  return {
    ...provider,
    capabilities: inferCapabilities(provider)
  };
}
JS

cat > packages/forge-core/src/commands/ai.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  activeProvider,
  configuredProviders,
  modelInventory,
  routeChat,
  routeCompletion
} from "../providers/router.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function readPrompt(args) {
  const promptIndex = args.indexOf("--prompt");
  if (promptIndex !== -1) return args.slice(promptIndex + 1).join(" ");

  return args.slice(1).join(" ");
}

export default async function ai(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  if (action === "status") {
    console.log("🧠 Forge AI Provider Router");
    console.log("");
    console.log("Policy:");
    console.log("✅ Local/private LAN only");
    console.log("✅ No API keys");
    console.log("✅ No cloud fallback");
    console.log("✅ Capability-routed provider adapters");
    console.log("");

    for (const provider of configuredProviders(paths)) {
      console.log(`${provider.enabled ? "✅" : "⬜"} ${provider.id}`);
      console.log(`   type: ${provider.type}`);
      console.log(`   endpoint: ${provider.endpoint}`);
      console.log(`   capabilities: ${provider.capabilities.join(", ")}`);
    }

    const active = await activeProvider(paths);

    console.log("");
    if (active) console.log(`✅ Active provider: ${active.id}`);
    else console.log("❌ No active local provider.");

    return;
  }

  if (action === "models") {
    const inventory = await modelInventory(paths);

    if (inventory.length === 0) {
      console.log("❌ No reachable local model providers.");
      return;
    }

    for (const item of inventory) {
      console.log(`${item.ok ? "✅" : "⚠️"} ${item.providerId}`);
      console.log(`   endpoint: ${item.endpoint}`);

      if (item.ok) {
        for (const model of item.models) {
          console.log(`   - ${model.name ?? model.id ?? JSON.stringify(model)}`);
        }
      } else {
        console.log(`   ${item.error ?? "model inventory failed"}`);
      }
    }

    return;
  }

  if (action === "chat") {
    const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");
    const prompt = readPrompt(args);

    if (!prompt) {
      console.log("Usage:");
      console.log("  aift-forge ai chat --model llama3.2 --prompt Say hello");
      return;
    }

    const result = await routeChat(paths, {
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    });

    if (!result.ok) {
      console.log(`❌ ${result.error ?? "chat request failed"}`);
      return;
    }

    const body = result.body;
    console.log(body?.message?.content ?? body?.choices?.[0]?.message?.content ?? JSON.stringify(body, null, 2));
    return;
  }

  if (action === "complete") {
    const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");
    const prompt = readPrompt(args);

    if (!prompt) {
      console.log("Usage:");
      console.log("  aift-forge ai complete --model llama3.2 --prompt Once upon a time");
      return;
    }

    const result = await routeCompletion(paths, {
      model,
      prompt,
      stream: false
    });

    if (!result.ok) {
      console.log(`❌ ${result.error ?? "completion request failed"}`);
      return;
    }

    const body = result.body;
    console.log(body?.response ?? body?.choices?.[0]?.text ?? JSON.stringify(body, null, 2));
    return;
  }

  console.log("Forge AI Provider Router");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge ai status");
  console.log("  aift-forge ai models");
  console.log("  aift-forge ai chat --model llama3.2 --prompt Say hello");
  console.log("  aift-forge ai complete --model llama3.2 --prompt Once upon a time");
}
JS

cat > docs/PROVIDER_ARCHITECTURE.md <<'MD'
# AIFT-Forge Provider Architecture

AIFT-Forge now treats the local provider registry as the canonical inference layer.

## Principles

- No direct UI calls to model runtimes
- No cloud fallback
- No required API keys
- Localhost or private LAN only
- Provider registry is user-owned JSON
- Provider adapters hide runtime-specific APIs
- Capability negotiation determines routing

## Supported Provider Types

- `ollama`
- `llama-cpp`
- `openai-compatible-local`

## Capabilities

Providers may advertise or infer capabilities:

- `health`
- `models`
- `chat`
- `completion`
- `embeddings`
- `vision`
- `tools`

## Commands

    aift-forge ai status
    aift-forge ai models
    aift-forge ai chat --model llama3.2 --prompt Say hello
    aift-forge ai complete --model llama3.2 --prompt Once upon a time

## Architecture

    .forge/providers/*.json
            ↓
    provider registry
            ↓
    provider health
            ↓
    capability negotiation
            ↓
    provider router
            ↓
    adapter
            ↓
    local runtime HTTP API

## Android / Termux

Android/Termux uses the same router and registry, but avoids desktop native inference dependencies.

Termux should use HTTP-based local providers:

- Ollama on localhost or private LAN
- llama.cpp server
- OpenAI-compatible local server

MD

cat > scripts/aift-provider-architecture-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { CAPABILITIES, inferCapabilities } from "../packages/forge-core/src/providers/capabilities/schema.mjs";
import { createProviderAdapter } from "../packages/forge-core/src/providers/adapters/index.mjs";
import { configuredProviders } from "../packages/forge-core/src/providers/router.mjs";
import { ensureProviderRegistry } from "../packages/forge-core/src/providers/registry.mjs";

const paths = { repoRoot: process.cwd() };

ensureProviderRegistry(paths);

assert.equal(CAPABILITIES.CHAT, "chat");
assert.equal(CAPABILITIES.EMBEDDINGS, "embeddings");

const ollama = {
  id: "test-ollama",
  type: "ollama",
  endpoint: "http://127.0.0.1:11434",
  enabled: true
};

assert.ok(inferCapabilities(ollama).includes("chat"));
assert.ok(inferCapabilities(ollama).includes("models"));

const adapter = createProviderAdapter(ollama);
assert.equal(typeof adapter.health, "function");
assert.equal(typeof adapter.chat, "function");
assert.equal(typeof adapter.completion, "function");
assert.equal(typeof adapter.embeddings, "function");

const providers = configuredProviders(paths);
assert.ok(providers.length >= 3);
assert.ok(providers.every((provider) => Array.isArray(provider.capabilities)));

console.log("✅ Provider architecture smoke test passed.");
JS

node --check packages/forge-core/src/providers/capabilities/schema.mjs
node --check packages/forge-core/src/providers/adapters/http.mjs
node --check packages/forge-core/src/providers/adapters/ollama.mjs
node --check packages/forge-core/src/providers/adapters/openai-compatible-local.mjs
node --check packages/forge-core/src/providers/adapters/llama-cpp.mjs
node --check packages/forge-core/src/providers/adapters/index.mjs
node --check packages/forge-core/src/providers/router.mjs
node --check packages/forge-core/src/commands/ai.mjs
node --check scripts/aift-provider-architecture-smoke.mjs
node scripts/aift-provider-architecture-smoke.mjs

echo ""
echo "✅ Provider architecture integration complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new ai command into your aift-forge command router if it is not auto-loaded."
echo ""
echo "Test after wiring:"
echo "  aift-forge ai status"
echo "  aift-forge ai models"
echo ""
echo "Commit:"
echo "  git add ."
echo "  git commit -m \"Add canonical provider router and AI adapters\""
echo "  git push origin main"
