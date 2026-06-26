import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "terminal-surface";
export const description = "Build the BookSmith Web OS terminal surface.";

export function run({ webRoot }) {
  writeFileOnce(join(webRoot, "lib/terminal-commands.ts"), `export const terminalCommands = [
  { name: "help", description: "Show available commands" },
  { name: "status", description: "Show BookSmith OS status" },
  { name: "open", description: "Open an application window" }
];
`);

  writeFileOnce(join(webRoot, "components/TerminalSurface.tsx"), `import { terminalCommands } from "../lib/terminal-commands";

export function TerminalSurface() {
  return (
    <section className="panel">
      <h2>Terminal</h2>
      <p className="muted">Local-first command surface.</p>
      {terminalCommands.map((command) => (
        <div key={command.name} className="command-row">
          <strong>{command.name}</strong>
          <span>{command.description}</span>
        </div>
      ))}
    </section>
  );
}
`);
}
