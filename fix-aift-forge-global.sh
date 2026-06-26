#!/data/data/com.termux/files/usr/bin/bash
set -e

AIFT_FORGE="$HOME/Projects/AIFT/AIFT-Forge"
GLOBAL_BIN="$HOME/.local/bin"

echo "🔥 Fixing global aift-forge launcher..."

if [ ! -f "$AIFT_FORGE/scripts/forge" ]; then
  echo "❌ Could not find $AIFT_FORGE/scripts/forge"
  echo "Make sure AIFT-Forge exists at:"
  echo "$AIFT_FORGE"
  exit 1
fi

mkdir -p "$GLOBAL_BIN"

cat > "$GLOBAL_BIN/aift-forge" <<WRAPPER
#!/data/data/com.termux/files/usr/bin/bash
exec "$AIFT_FORGE/scripts/forge" "\$@"
WRAPPER

chmod +x "$GLOBAL_BIN/aift-forge"

if ! echo ":\$PATH:" | grep -q ":\$HOME/.local/bin:"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

echo "✅ Global launcher fixed:"
echo "$GLOBAL_BIN/aift-forge"
echo ""
echo "Run:"
echo "source ~/.bashrc"
echo "aift-forge doctor"
