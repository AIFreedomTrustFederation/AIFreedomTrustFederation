#!/data/data/com.termux/files/usr/bin/bash
set -u

FAILS=0
PASSES=0

pass() {
  PASSES=$((PASSES + 1))
  echo "✅ $1"
}

fail() {
  FAILS=$((FAILS + 1))
  echo "❌ $1"
}

warn() {
  echo "⚠️  $1"
}

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

run_check() {
  local name="$1"
  shift

  echo ""
  echo "▶ $name"

  if "$@"; then
    pass "$name"
  else
    fail "$name"
  fi
}

file_exists() {
  test -f "$1"
}

dir_exists() {
  test -d "$1"
}

contains() {
  grep -q "$2" "$1"
}

section "AIFT-Forge End-to-End Pipeline"

echo "Repo root: $(pwd)"
echo "Date: $(date)"

section "Repository Shape"

run_check "package.json exists" file_exists package.json
run_check "forge-core package exists" dir_exists packages/forge-core
run_check "forge-core src exists" dir_exists packages/forge-core/src
run_check "commands directory exists" dir_exists packages/forge-core/src/commands
run_check "providers directory exists" dir_exists packages/forge-core/src/providers
run_check "docs directory exists" dir_exists docs

section "Provider Registry Files"

run_check "provider registry module exists" file_exists packages/forge-core/src/providers/registry.mjs
run_check "provider command exists" file_exists packages/forge-core/src/commands/provider.mjs
run_check "inference command exists" file_exists packages/forge-core/src/commands/inference.mjs
run_check "lan-ollama command exists" file_exists packages/forge-core/src/commands/lan-ollama.mjs
run_check "local provider registry docs exist" file_exists docs/LOCAL_PROVIDER_REGISTRY.md

section "Policy Checks"

run_check "registry enforces no API keys" contains packages/forge-core/src/providers/registry.mjs "requiresApiKey"
run_check "registry checks private/local endpoints" contains packages/forge-core/src/providers/registry.mjs "isPrivateOrLocal"
run_check "registry has Ollama default" contains packages/forge-core/src/providers/registry.mjs "ollama-localhost"
run_check "registry has llama.cpp default" contains packages/forge-core/src/providers/registry.mjs "llama-cpp-localhost"
run_check "registry has OpenAI-compatible local default" contains packages/forge-core/src/providers/registry.mjs "local-openai-compatible"
run_check "LAN scan command is disabled message" contains packages/forge-core/src/commands/lan-ollama.mjs "LAN scan disabled"
run_check "docs mention no cloud fallback" contains docs/LOCAL_PROVIDER_REGISTRY.md "No cloud fallback"

section "Node Syntax Checks"

if command -v node >/dev/null 2>&1; then
  run_check "registry.mjs syntax" node --check packages/forge-core/src/providers/registry.mjs
  run_check "provider.mjs syntax" node --check packages/forge-core/src/commands/provider.mjs
  run_check "inference.mjs syntax" node --check packages/forge-core/src/commands/inference.mjs
  run_check "lan-ollama.mjs syntax" node --check packages/forge-core/src/commands/lan-ollama.mjs
else
  warn "node not found; skipping node syntax checks"
fi

section "Package Manager Checks"

if command -v npm >/dev/null 2>&1; then
  run_check "npm package metadata readable" npm pkg get name >/dev/null

  if npm run | grep -q " lint"; then
    run_check "npm lint" npm run lint
  else
    warn "no npm lint script found"
  fi

  if npm run | grep -q " typecheck"; then
    run_check "npm typecheck" npm run typecheck
  else
    warn "no npm typecheck script found"
  fi

  if npm run | grep -q " test"; then
    run_check "npm test" npm test
  else
    warn "no npm test script found"
  fi

  if npm run | grep -q " build"; then
    run_check "npm build" npm run build
  else
    warn "no npm build script found"
  fi
else
  warn "npm not found; skipping package manager checks"
fi

section "Provider Registry Runtime Smoke Test"

if command -v node >/dev/null 2>&1; then
  mkdir -p .forge/tmp

  cat > .forge/tmp/aift-provider-smoke.mjs <<'JS'
import {
  ensureProviderRegistry,
  readProviders,
  providerHealth,
  bestProvider
} from "../../packages/forge-core/src/providers/registry.mjs";

const paths = { repoRoot: process.cwd() };

ensureProviderRegistry(paths);

const providers = readProviders(paths);

if (!Array.isArray(providers)) {
  throw new Error("readProviders did not return an array");
}

if (providers.length < 3) {
  throw new Error("Expected at least 3 default providers");
}

const ids = providers.map((provider) => provider.id);

for (const id of ["ollama-localhost", "llama-cpp-localhost", "local-openai-compatible"]) {
  if (!ids.includes(id)) {
    throw new Error(`Missing default provider: ${id}`);
  }
}

const health = await providerHealth(paths);

if (!Array.isArray(health)) {
  throw new Error("providerHealth did not return an array");
}

await bestProvider(paths);

console.log("Provider smoke test passed");
JS

  run_check "provider registry smoke test" node .forge/tmp/aift-provider-smoke.mjs
  rm -f .forge/tmp/aift-provider-smoke.mjs
else
  warn "node not found; skipping provider runtime smoke test"
fi

section "Generated Registry Artifacts"

run_check ".forge/providers directory exists" dir_exists .forge/providers
run_check "Ollama provider JSON exists" file_exists .forge/providers/ollama-localhost.json
run_check "llama.cpp provider JSON exists" file_exists .forge/providers/llama-cpp-localhost.json
run_check "OpenAI-compatible local provider JSON exists" file_exists .forge/providers/local-openai-compatible.json

section "CLI Smoke Checks"

if command -v aift-forge >/dev/null 2>&1; then
  run_check "aift-forge provider status" aift-forge provider status
  run_check "aift-forge provider health" aift-forge provider health
  run_check "aift-forge inference health" aift-forge inference health
  run_check "aift-forge lan-ollama" aift-forge lan-ollama
else
  warn "aift-forge command not found on PATH; skipping installed CLI smoke checks"
fi

section "Git State"

if command -v git >/dev/null 2>&1; then
  git status --short

  if git diff --check; then
    pass "git whitespace check"
  else
    fail "git whitespace check"
  fi
else
  warn "git not found; skipping git checks"
fi

section "Pipeline Result"

echo "Passed: $PASSES"
echo "Failed: $FAILS"

if [ "$FAILS" -eq 0 ]; then
  echo ""
  echo "🎉 AIFT-Forge pipeline passed."
  exit 0
else
  echo ""
  echo "🔥 AIFT-Forge pipeline failed with $FAILS failure(s)."
  exit 1
fi
