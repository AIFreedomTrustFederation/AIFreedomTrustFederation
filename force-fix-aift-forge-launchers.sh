#!/data/data/com.termux/files/usr/bin/bash
set -e

AIFT_FORGE="$HOME/Projects/AIFT/AIFT-Forge"
LOCAL_FORGE="$AIFT_FORGE/scripts/forge"
GLOBAL_FORGE="$HOME/.local/bin/aift-forge"
CLI_ENTRY="$AIFT_FORGE/packages/forge-core/src/cli/index.mjs"

echo "🔥 Force fixing AIFT Forge launchers..."

if [ ! -d "$AIFT_FORGE/.git" ]; then
  echo "❌ AIFT-Forge repo not found at:"
  echo "$AIFT_FORGE"
  exit 1
fi

if [ ! -f "$CLI_ENTRY" ]; then
  echo "❌ CLI entry not found at:"
  echo "$CLI_ENTRY"
  exit 1
fi

mkdir -p "$AIFT_FORGE/scripts"
mkdir -p "$HOME/.local/bin"

echo "🧹 Removing old launchers..."
rm -f "$LOCAL_FORGE"
rm -f "$GLOBAL_FORGE"

echo "🧱 Writing repo launcher: $LOCAL_FORGE"
cat > "$LOCAL_FORGE" <<WRAPPER
#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$AIFT_FORGE"
exec node "$CLI_ENTRY" "\$@"
WRAPPER

chmod +x "$LOCAL_FORGE"

echo "🌐 Writing global launcher: $GLOBAL_FORGE"
cat > "$GLOBAL_FORGE" <<WRAPPER
#!/data/data/com.termux/files/usr/bin/bash
set -e
exec "$LOCAL_FORGE" "\$@"
WRAPPER

chmod +x "$GLOBAL_FORGE"

if ! echo ":\$PATH:" | grep -q ":\$HOME/.local/bin:"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  export PATH="$HOME/.local/bin:$PATH"
fi

echo ""
echo "✅ Launchers replaced."
echo ""
echo "Testing direct Node:"
node "$CLI_ENTRY" help

echo ""
echo "Testing repo launcher:"
"$LOCAL_FORGE" help

echo ""
echo "Testing global launcher:"
"$GLOBAL_FORGE" help

echo ""
echo "✅ Force fix complete."
echo ""
echo "Now test:"
echo "  aift-forge doctor"
echo "  aift-forge manifest"
echo "  aift-forge graph"
