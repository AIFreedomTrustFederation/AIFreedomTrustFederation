#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧠 Fixing Forge memory JSON"

mkdir -p .forge

# Replace the corrupted memory file with clean valid JSON.
cat > .forge/memory.json <<'JSON'
{
  "schema": "aift.forge.memory.v1",
  "mission": "Build BookSmith Federation OS",
  "phase": "Phase 0.2 — Web OS Shell",
  "lastCompleted": [
    "Forge Dashboard",
    "Progress Runner",
    "Web OS Verify",
    "Web OS Repair",
    "Web OS Build Shell"
  ],
  "currentTask": {
    "id": "web-os-window-manager",
    "title": "Build Desktop Window Manager",
    "status": "ready",
    "targetRepo": "BookSmith-Federation-OS",
    "reason": "The Web OS shell exists and verifies. The next OS-level capability is managing windows and app surfaces."
  },
  "nextTasks": [
    {
      "id": "web-os-dock-manager",
      "title": "Build Dock Manager",
      "status": "queued"
    },
    {
      "id": "web-os-app-registry",
      "title": "Build App Registry",
      "status": "queued"
    },
    {
      "id": "web-os-launcher",
      "title": "Build Launcher Routing",
      "status": "queued"
    },
    {
      "id": "web-os-settings",
      "title": "Build Settings Surface",
      "status": "queued"
    }
  ],
  "approvals": [],
  "updatedAt": "2026-06-26T00:00:00.000Z"
}
JSON

# Teach memory loader to recover from corrupted JSON.
python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/memory/state.mjs")
text = p.read_text()

old = '''export function loadMemory(repoRoot) {
  const path = memoryPath(repoRoot);

  if (!existsSync(path)) {
    return defaultMemory();
  }

  return JSON.parse(readFileSync(path, "utf8"));
}
'''

new = '''export function loadMemory(repoRoot) {
  const path = memoryPath(repoRoot);

  if (!existsSync(path)) {
    return defaultMemory();
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const backupPath = `${path}.corrupt-${Date.now()}`;
    try {
      writeFileSync(backupPath, readFileSync(path, "utf8"));
    } catch {
      // Best-effort backup only.
    }

    const repaired = defaultMemory();
    repaired.recoveredFromCorruption = true;
    repaired.corruptBackupPath = backupPath;
    return repaired;
  }
}
'''

if old in text:
    text = text.replace(old, new)
elif "recoveredFromCorruption" not in text:
    raise SystemExit("Could not patch loadMemory safely.")

p.write_text(text)
PY

echo "✅ Memory JSON fixed."
echo ""
echo "Testing:"
aift-forge remember
echo ""
aift-forge resume
echo ""
aift-forge next
