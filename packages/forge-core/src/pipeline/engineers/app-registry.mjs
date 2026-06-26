import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export function buildAppRegistry({ webRoot }) {
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
}
