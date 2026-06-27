#!/data/data/com.termux/files/usr/bin/bash
set -e

mkdir -p packages/forge-core/src/commands

cat > packages/forge-core/src/commands/inference.mjs <<'JS'
export default async function inference() {
  console.log("🧠 Forge Local Inference");
  console.log("");
  console.log("Policy:");
  console.log("✅ Local-only inference required");
  console.log("✅ No API keys");
  console.log("✅ No cloud fallback");
  console.log("");
  console.log("Supported:");
  console.log("- Ollama");
  console.log("- llama.cpp server");
  console.log("- LM Studio / vLLM local OpenAI-compatible server");
}
JS

cat > packages/forge-core/src/commands/swarm.mjs <<'JS'
export default async function swarm() {
  console.log("🐝 Forge Local Engineering Swarm");
  console.log("");
  console.log("Roles:");
  console.log("- planner");
  console.log("- ui-engineer");
  console.log("- core-engineer");
  console.log("- test-engineer");
  console.log("- reviewer");
  console.log("");
  console.log("Inference policy:");
  console.log("✅ Local only");
  console.log("✅ Open source");
  console.log("✅ No API keys");
}
JS

echo "✅ Local inference commands repaired."
aift-forge inference
aift-forge swarm
