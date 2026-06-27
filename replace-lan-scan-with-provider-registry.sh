#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🧭 Replacing LAN scan with provider registry"

mkdir -p packages/forge-core/src/providers
mkdir -p packages/forge-core/src/commands
mkdir -p .forge/providers
mkdir -p docs

cat > packages/forge-core/src/providers/registry.mjs <<'JS_REGISTRY'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";

const defaultProviders = [
  {
    id: "ollama-localhost",
    type: "ollama",
    label: "Ollama Localhost",
    endpoint: "http://127.0.0.1:11434",
    localOnly: true,
    openSource: true,
    requiresApiKey: false,
    enabled: true,
    priority: 100
  },
  {
    id: "llama-cpp-localhost",
    type: "llama-cpp",
    label: "llama.cpp Localhost",
    endpoint: "http://127.0.0.1:8080",
    localOnly: true,
    openSource: true,
    requiresApiKey: false,
    enabled: false,
    priority: 50
  },
  {
    id: "local-openai-compatible",
    type: "openai-compatible-local",
    label: "Local OpenAI-Compatible Server",
    endpoint: "http://127.0.0.1:1234/v1",
    localOnly: true,
    openSource: true,
    requiresApiKey: false,
    enabled: false,
    priority: 40
  }
];

function providerDir(paths) {
  return join(paths.repoRoot, ".forge", "providers");
}

function providerFile(paths, id) {
  return join(providerDir(paths), `${id}.json`);
}

function ensureProviderDir(paths) {
  mkdirSync(providerDir(paths), { recursive: true });
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

export function ensureProviderRegistry(paths) {
  ensureProviderDir(paths);

  for (const provider of defaultProviders) {
    const file = providerFile(paths, provider.id);

    if (!existsSync(file)) {
      writeJson(file, {
        schema: "aift.forge.local-provider.v1",
        ...provider,
        createdAt: new Date().toISOString()
      });
    }
  }
}

export function readProviders(paths) {
  ensureProviderRegistry(paths);

  const dir = providerDir(paths);
  const providers = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;

    try {
      providers.push(JSON.parse(readFileSync(join(dir, file), "utf8")));
    } catch {
      providers.push({
        id: file.replace(/\.json$/, ""),
        enabled: false,
        error: "Invalid provider JSON"
      });
    }
  }

  return providers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function addProvider(paths, provider) {
  ensureProviderDir(paths);

  if (!provider.id) throw new Error("Provider id is required.");
  if (!provider.endpoint) throw new Error("Provider endpoint is required.");

  const next = {
    schema: "aift.forge.local-provider.v1",
    id: provider.id,
    type: provider.type ?? "ollama",
    label: provider.label ?? provider.id,
    endpoint: provider.endpoint,
    localOnly: true,
    openSource: provider.openSource ?? true,
    requiresApiKey: false,
    enabled: provider.enabled ?? true,
    priority: provider.priority ?? 80,
    updatedAt: new Date().toISOString()
  };

  writeJson(providerFile(paths, provider.id), next);
  return next;
}

function getJson(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, error: "invalid url" });
      return;
    }

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        timeout: timeoutMs
      },
      (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: JSON.parse(body)
            });
          } catch {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              text: body
            });
          }
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

    req.end();
  });
}

function isPrivateOrLocal(endpoint) {
  return endpoint.startsWith("http://127.0.0.1") ||
    endpoint.startsWith("http://localhost") ||
    /^http:\/\/10\./.test(endpoint) ||
    /^http:\/\/192\.168\./.test(endpoint) ||
    /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(endpoint);
}

function healthUrl(provider) {
  const endpoint = provider.endpoint.replace(/\/$/, "");

  if (provider.type === "ollama") return `${endpoint}/api/tags`;
  if (provider.type === "llama-cpp") return `${endpoint}/health`;
  if (provider.type === "openai-compatible-local") return `${endpoint}/models`;

  return endpoint;
}

export async function checkProvider(provider) {
  if (provider.error) {
    return {
      ...provider,
      ok: false,
      reason: provider.error
    };
  }

  if (!provider.enabled) {
    return {
      ...provider,
      ok: false,
      reason: "Provider disabled."
    };
  }

  if (provider.requiresApiKey) {
    return {
      ...provider,
      ok: false,
      reason: "Provider requires API key. Forbidden by local-only governance."
    };
  }

  if (!isPrivateOrLocal(provider.endpoint)) {
    return {
      ...provider,
      ok: false,
      reason: "Endpoint is not localhost or private LAN. Forbidden."
    };
  }

  const result = await getJson(healthUrl(provider));

  if (!result.ok) {
    return {
      ...provider,
      ok: false,
      reason: result.error ?? `Health check failed with status ${result.status ?? "unknown"}.`
    };
  }

  return {
    ...provider,
    ok: true,
    reason: "Provider reachable."
  };
}

export async function providerHealth(paths) {
  const providers = readProviders(paths);
  const results = [];

  for (const provider of providers) {
    results.push(await checkProvider(provider));
  }

  return results;
}

export async function bestProvider(paths) {
  const health = await providerHealth(paths);
  return health.find((provider) => provider.ok) ?? null;
}
JS_REGISTRY

cat > packages/forge-core/src/commands/provider.mjs <<'JS_PROVIDER'
import { getForgePaths } from "../lib/paths.mjs";
import {
  ensureProviderRegistry,
  readProviders,
  addProvider,
  providerHealth,
  bestProvider
} from "../providers/registry.mjs";

function parseAdd(args) {
  const id = args[1];
  const endpoint = args[2];
  const type = args[3] ?? "ollama";

  return { id, endpoint, type };
}

export default async function provider(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  ensureProviderRegistry(paths);

  if (action === "status" || action === "list") {
    console.log("🧭 Forge Provider Registry");
    console.log("");
    console.log("Policy:");
    console.log("✅ Local/private LAN only");
    console.log("✅ No API keys");
    console.log("✅ No cloud fallback");
    console.log("✅ JSON provider registry");
    console.log("");

    for (const provider of readProviders(paths)) {
      console.log(`${provider.enabled ? "✅" : "⬜"} ${provider.id} — ${provider.label}`);
      console.log(`   type: ${provider.type}`);
      console.log(`   endpoint: ${provider.endpoint}`);
      console.log(`   priority: ${provider.priority ?? 0}`);
    }

    return;
  }

  if (action === "health") {
    console.log("🩺 Forge Provider Health");
    console.log("");

    const health = await providerHealth(paths);

    for (const provider of health) {
      console.log(`${provider.ok ? "✅" : "⚠️"} ${provider.id}`);
      console.log(`   endpoint: ${provider.endpoint}`);
      console.log(`   ${provider.reason}`);
    }

    const best = await bestProvider(paths);

    console.log("");

    if (best) {
      console.log(`✅ Selected provider: ${best.id}`);
      console.log(`export FORGE_PROVIDER_ID="${best.id}"`);
      console.log(`export FORGE_PROVIDER_ENDPOINT="${best.endpoint}"`);
    } else {
      console.log("❌ No reachable local provider.");
      console.log("Add one manually:");
      console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
    }

    return;
  }

  if (action === "add") {
    const { id, endpoint, type } = parseAdd(args);

    if (!id || !endpoint) {
      console.log("Usage:");
      console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
      return;
    }

    const added = addProvider(paths, { id, endpoint, type });

    console.log("✅ Provider added");
    console.log(`id: ${added.id}`);
    console.log(`type: ${added.type}`);
    console.log(`endpoint: ${added.endpoint}`);
    return;
  }

  if (action === "init") {
    ensureProviderRegistry(paths);
    console.log("✅ Provider registry initialized.");
    console.log(".forge/providers/");
    return;
  }

  console.log("Forge Provider Registry");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge provider status");
  console.log("  aift-forge provider health");
  console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
}
JS_PROVIDER

cat > packages/forge-core/src/commands/lan-ollama.mjs <<'JS_LAN'
export default async function lanOllama() {
  console.log("🌐 LAN scan disabled");
  console.log("");
  console.log("Android/Termux often blocks subnet discovery and netlink access.");
  console.log("Forge now uses a cross-platform JSON provider registry instead.");
  console.log("");
  console.log("Add a provider manually:");
  console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
  console.log("");
  console.log("Then check:");
  console.log("  aift-forge provider health");
}
JS_LAN

cat > packages/forge-core/src/commands/inference.mjs <<'JS_INFERENCE'
import { getForgePaths } from "../lib/paths.mjs";
import { bestProvider, providerHealth } from "../providers/registry.mjs";

export default async function inference(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  console.log("🧠 Forge Local Inference");
  console.log("");
  console.log("Policy:");
  console.log("✅ Local/private LAN only");
  console.log("✅ No API keys");
  console.log("✅ No cloud fallback");
  console.log("✅ Provider registry based");
  console.log("");

  if (action === "health") {
    const health = await providerHealth(paths);

    for (const provider of health) {
      console.log(`${provider.ok ? "✅" : "⚠️"} ${provider.id}`);
      console.log(`   ${provider.endpoint}`);
      console.log(`   ${provider.reason}`);
    }

    const best = await bestProvider(paths);

    console.log("");

    if (best) {
      console.log(`✅ Active inference provider: ${best.id}`);
    } else {
      console.log("❌ No active local inference provider.");
    }

    return;
  }

  console.log("Commands:");
  console.log("  aift-forge inference health");
  console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
}
JS_INFERENCE

cat > docs/LOCAL_PROVIDER_REGISTRY.md <<'MD_DOC'
# Forge Local Provider Registry

Forge does not scan the LAN directly.

Android and Termux often block low-level network discovery, subnet probing, and netlink access. Forge therefore uses an explicit local JSON provider registry instead of trying to discover inference servers automatically.

Registry path:

    .forge/providers/

## Commands

Initialize or repair the default registry:

    aift-forge provider init

List configured providers:

    aift-forge provider status

Check provider health:

    aift-forge provider health

Add a provider manually:

    aift-forge provider add my-ollama http://192.168.1.50:11434 ollama

Check inference availability:

    aift-forge inference health

## Governance Policy

Forge local inference follows these rules:

- Localhost or private LAN endpoints only
- No required API keys
- No cloud fallback
- No silent provider discovery
- User-owned registry files
- Disabled providers remain visible but inactive

## Default Providers

- Ollama Localhost: http://127.0.0.1:11434
- llama.cpp Localhost: http://127.0.0.1:8080
- Local OpenAI-compatible server: http://127.0.0.1:1234/v1

## Why LAN Scan Was Replaced

LAN scanning is fragile on Android and Termux. It can fail because of sandboxed networking, missing commands, unavailable netlink interfaces, or restricted subnet discovery.

The registry model is more sovereign and inspectable:

- The user chooses endpoints explicitly.
- Providers are plain JSON files.
- Cloud fallback is impossible by policy.
- Disabled providers remain visible for auditability.
- Local-first inference works consistently across desktop, Linux, Android, and Termux.
MD_DOC

node --check packages/forge-core/src/providers/registry.mjs
node --check packages/forge-core/src/commands/provider.mjs
node --check packages/forge-core/src/commands/lan-ollama.mjs
node --check packages/forge-core/src/commands/inference.mjs

echo "✅ Provider registry files written."
echo ""
echo "Files:"
echo "  packages/forge-core/src/providers/registry.mjs"
echo "  packages/forge-core/src/commands/provider.mjs"
echo "  packages/forge-core/src/commands/lan-ollama.mjs"
echo "  packages/forge-core/src/commands/inference.mjs"
echo "  docs/LOCAL_PROVIDER_REGISTRY.md"
echo ""
echo "Next:"
echo "  Wire provider, inference, and lan-ollama into the aift-forge command router if not already wired."
echo "  Then run:"
echo "    aift-forge provider status"
echo "    aift-forge provider health"
echo "    aift-forge inference health"
