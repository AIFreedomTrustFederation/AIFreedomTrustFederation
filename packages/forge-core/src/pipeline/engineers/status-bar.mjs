import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "status-bar";
export const description = "Build the BookSmith Web OS status bar.";

export function run({ webRoot }) {
  writeFileOnce(join(webRoot, "lib/status-registry.ts"), `export const statusRegistry = [
  { id: "local", label: "Local-first", value: "enabled" },
  { id: "network", label: "Federation", value: "optional" },
  { id: "ai", label: "AI providers", value: "disabled by default" }
];
`);

  writeFileOnce(join(webRoot, "components/StatusBar.tsx"), `import { statusRegistry } from "../lib/status-registry";

export function StatusBar() {
  return (
    <footer className="status-bar">
      {statusRegistry.map((item) => (
        <span key={item.id}>
          {item.label}: {item.value}
        </span>
      ))}
    </footer>
  );
}
`);
}
