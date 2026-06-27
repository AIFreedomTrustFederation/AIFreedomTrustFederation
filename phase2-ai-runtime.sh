#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🚀 AIFT-Forge Phase 2: AI runtime, model discovery, routing, and streaming"

mkdir -p packages/forge-core/src/ai
mkdir -p packages/forge-core/src/commands
mkdir -p scripts
mkdir -p docs

cat > packages/forge-core/src/ai/runtime.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  modelInventory,
  routeChat,
  routeCompletion,
  activeProvider
} from "../providers/router.mjs";

export function getRuntimePaths() {
  return getForgePaths(import.meta.url);
}

export async function discoverModels(paths = getRuntimePaths()) {
  return modelInventory(paths);
}

export async function getActiveProvider(paths = getRuntimePaths()) {
  return activeProvider(paths);
}

export async function askLocalAI({
  model = process.env.FORGE_MODEL ?? "llama3.2",
  prompt,
  system,
  mode = "chat"
}) {
  const paths = getRuntimePaths();

  if (!prompt) {
    return {
      ok: false,
      error: "Prompt is required."
    };
  }

  if (mode === "completion") {
    return routeCompletion(paths, {
      model,
      prompt,
      stream: false
    });
  }

  const messages = [];

  if (system) {
    messages.push({
      role: "system",
      content: system
    });
  }

  messages.push({
    role: "user",
    content: prompt
  });

  return routeChat(paths, {
    model,
    messages,
    stream: false
  });
}

export function extractText(result) {
  const body = result?.body;

  return body?.message?.content ??
    body?.response ??
    body?.choices?.[0]?.message?.content ??
    body?.choices?.[0]?.text ??
    JSON.stringify(body, null, 2);
}
JS

cat > packages/forge-core/src/commands/models.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import { modelInventory } from "../providers/router.mjs";

export default async function models() {
  const paths = getForgePaths(import.meta.url);
  const inventory = await modelInventory(paths);

  console.log("🧠 Forge Model Discovery");
  console.log("");

  if (inventory.length === 0) {
    console.log("❌ No reachable local model providers.");
    console.log("");
    console.log("Start Ollama or add a LAN provider:");
    console.log("  ollama serve");
    console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
    return;
  }

  for (const provider of inventory) {
    console.log(`${provider.ok ? "✅" : "⚠️"} ${provider.providerId}`);
    console.log(`   type: ${provider.providerType}`);
    console.log(`   endpoint: ${provider.endpoint}`);

    if (!provider.ok) {
      console.log(`   ${provider.error ?? "Unable to fetch models."}`);
      continue;
    }

    if (provider.models.length === 0) {
      console.log("   No models reported.");
      continue;
    }

    for (const model of provider.models) {
      console.log(`   - ${model.name ?? model.id ?? model.model ?? JSON.stringify(model)}`);
    }
  }
}
JS

cat > packages/forge-core/src/commands/ask.mjs <<'JS'
import { askLocalAI, extractText } from "../ai/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

export default async function ask(args = []) {
  const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");
  const system = readFlag(args, "--system", undefined);
  const mode = readFlag(args, "--mode", "chat");

  const prompt = args
    .filter((arg, index) => {
      const previous = args[index - 1];
      return !["--model", "--system", "--mode"].includes(arg) &&
        !["--model", "--system", "--mode"].includes(previous);
    })
    .join(" ")
    .trim();

  if (!prompt) {
    console.log("Usage:");
    console.log("  aift-forge ask \"Explain AIFT-Forge\"");
    console.log("  aift-forge ask --model llama3.2 \"Write a README intro\"");
    return;
  }

  const result = await askLocalAI({
    model,
    system,
    prompt,
    mode
  });

  if (!result.ok) {
    console.log(`❌ ${result.error ?? "Local AI request failed."}`);
    return;
  }

  console.log(extractText(result));
}
JS

cat > scripts/aift-ai-runtime-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { extractText } from "../packages/forge-core/src/ai/runtime.mjs";

assert.equal(
  extractText({ body: { message: { content: "hello" } } }),
  "hello"
);

assert.equal(
  extractText({ body: { response: "completion" } }),
  "completion"
);

assert.equal(
  extractText({ body: { choices: [{ message: { content: "openai" } }] } }),
  "openai"
);

console.log("✅ AI runtime smoke test passed.");
JS

cat > docs/AI_RUNTIME_PHASE_2.md <<'MD'
# AIFT-Forge AI Runtime Phase 2

Phase 2 adds a usable local AI runtime on top of the provider registry.

## New Commands

Discover models:

    aift-forge models

Ask local AI:

    aift-forge ask "Explain AIFT-Forge"

Use a specific model:

    aift-forge ask --model llama3.2 "Write a sovereign AI mission statement"

Use completion mode:

    aift-forge ask --mode completion --model llama3.2 "Once upon a time"

## Architecture

    user command
        ↓
    AI runtime
        ↓
    provider router
        ↓
    capability negotiation
        ↓
    provider adapter
        ↓
    local HTTP model runtime

## Policy

- No cloud fallback
- No API keys
- Localhost/private LAN only
- User-owned provider registry
- Android/Termux-compatible
MD

node --check packages/forge-core/src/ai/runtime.mjs
node --check packages/forge-core/src/commands/models.mjs
node --check packages/forge-core/src/commands/ask.mjs
node --check scripts/aift-ai-runtime-smoke.mjs
node scripts/aift-ai-runtime-smoke.mjs

echo ""
echo "✅ Phase 2 AI runtime files written."
echo ""
echo "IMPORTANT:"
echo "Wire these commands into your aift-forge command router:"
echo "  models -> packages/forge-core/src/commands/models.mjs"
echo "  ask    -> packages/forge-core/src/commands/ask.mjs"
echo ""
echo "Then test:"
echo "  aift-forge models"
echo "  aift-forge ask \"Say hello from Forge\""
echo ""
echo "Commit:"
echo "  git add ."
echo "  git commit -m \"Add Phase 2 local AI runtime commands\""
echo "  git push origin main"
