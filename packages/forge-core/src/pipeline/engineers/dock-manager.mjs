import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "dock-manager";
export const description = "Build the BookSmith Web OS dock registry and dock manager component.";

export function run({ webRoot }) {
  writeFileOnce(
    join(webRoot, "lib/dock-registry.ts"),
    `export type DockItem = {
  id: string;
  label: string;
  icon: string;
  targetWindow: string;
  status: "active" | "planned";
};

export const dockRegistry: DockItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", targetWindow: "dashboard", status: "active" },
  { id: "booksmith", label: "BookSmith", icon: "📚", targetWindow: "booksmith", status: "planned" },
  { id: "ai-studio", label: "AI", icon: "🤖", targetWindow: "ai-studio", status: "planned" },
  { id: "federation", label: "Federation", icon: "🌐", targetWindow: "federation-hub", status: "planned" }
];
`
  );

  writeFileOnce(
    join(webRoot, "components/DockManager.tsx"),
    `import { dockRegistry } from "../lib/dock-registry";

export function DockManager() {
  return (
    <nav className="panel dock" aria-label="BookSmith Federation OS dock manager">
      {dockRegistry.map((item) => (
        <button key={item.id} title={item.targetWindow}>
          <span aria-hidden="true">{item.icon}</span> {item.label}
        </button>
      ))}
    </nav>
  );
}
`
  );
}
