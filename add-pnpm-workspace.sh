#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "📦 Adding pnpm workspace manifest"

cat > pnpm-workspace.yaml <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
YAML

echo "✅ pnpm-workspace.yaml created"

pnpm --version
pnpm install --lockfile-only

git status
