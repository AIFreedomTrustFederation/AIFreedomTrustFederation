#!/data/data/com.termux/files/usr/bin/bash
set -u

PASSES=0
FAILS=0

pass(){ PASSES=$((PASSES+1)); echo "✅ $1"; }
fail(){ FAILS=$((FAILS+1)); echo "❌ $1"; }

run(){
  echo ""
  echo "▶ $1"
  shift
  if "$@"; then pass "$*"; else fail "$*"; fi
}

echo "🧪 AIFT-Forge Android/Termux Pipeline"

run "Termux dependency doctor" node scripts/aift-termux-doctor.mjs

run "registry syntax" node --check packages/forge-core/src/providers/registry.mjs
run "provider syntax" node --check packages/forge-core/src/commands/provider.mjs
run "inference syntax" node --check packages/forge-core/src/commands/inference.mjs
run "lan-ollama syntax" node --check packages/forge-core/src/commands/lan-ollama.mjs

run "provider registry smoke" node scripts/aift-provider-registry-smoke.mjs

run "npm lint" npm run lint
run "npm test" npm run test
run "npm typecheck" npm run typecheck
run "npm build" npm run build

if command -v aift-forge >/dev/null 2>&1; then
  run "aift-forge provider status" aift-forge provider status
  run "aift-forge provider health" aift-forge provider health
  run "aift-forge inference health" aift-forge inference health
  run "aift-forge lan-ollama" aift-forge lan-ollama
else
  echo "⚠️ aift-forge not on PATH; CLI smoke skipped."
fi

if command -v git >/dev/null 2>&1; then
  git status --short
  run "git whitespace check" git diff --check
fi

echo ""
echo "Passed: $PASSES"
echo "Failed: $FAILS"

[ "$FAILS" -eq 0 ] && echo "🎉 Pipeline passed." && exit 0
echo "🔥 Pipeline failed."
exit 1
