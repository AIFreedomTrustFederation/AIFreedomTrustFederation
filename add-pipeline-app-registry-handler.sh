#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧩 Adding pipeline handler for App Registry"

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/pipeline/stages.mjs")
text = p.read_text()

old = '''  } else {
    warn(`No engineer handler yet for task: ${task.id}`);
    return { ...state, blocked: true };
  }

  return { ...state, engineered: true };
}
'''

insert = '''  } else if (task.id === "app-registry") {
    writeFileOnce(
      join(webRoot, "lib/app-registry.ts"),
      `export type AppDefinition = {
  id: string;
  name: string;
  description: string;
  windowId: string;
  dockItemId?: string;
  status: "active" | "planned";
};

export const appRegistry: AppDefinition[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "System health, mission state, and federation overview.",
    windowId: "dashboard",
    dockItemId: "dashboard",
    status: "active"
  },
  {
    id: "booksmith",
    name: "BookSmith",
    description: "Author-first publishing studio and manuscript workspace.",
    windowId: "booksmith",
    dockItemId: "booksmith",
    status: "planned"
  },
  {
    id: "ai-studio",
    name: "AI Studio",
    description: "Local-first AI tools, prompts, models, and provenance.",
    windowId: "ai-studio",
    dockItemId: "ai-studio",
    status: "planned"
  },
  {
    id: "federation-hub",
    name: "Federation Hub",
    description: "Trust identity, node state, and federation services.",
    windowId: "federation-hub",
    dockItemId: "federation",
    status: "planned"
  }
];
`
    );
  } else {
    warn(`No engineer handler yet for task: ${task.id}`);
    return { ...state, blocked: true };
  }

  return { ...state, engineered: true };
}
'''

if old not in text:
    raise SystemExit("Could not find engineer handler block to patch safely.")

p.write_text(text.replace(old, insert))
PY

echo "✅ App Registry handler added."
echo ""
echo "Testing one autopilot pass:"
aift-forge autopilot --max 1
