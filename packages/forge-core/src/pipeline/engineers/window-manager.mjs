import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export const task = "window-manager";
export const description = "Build the BookSmith Web OS desktop window manager foundation.";

export function run({ webRoot }) {
  writeFileOnce(
    join(webRoot, "lib/window-registry.ts"),
    `export type WindowDefinition = {
  id: string;
  title: string;
  appId: string;
  status: "active" | "planned";
};

export const windowRegistry: WindowDefinition[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    appId: "dashboard",
    status: "active"
  },
  {
    id: "booksmith",
    title: "BookSmith Studio",
    appId: "booksmith",
    status: "planned"
  },
  {
    id: "ai-studio",
    title: "AI Studio",
    appId: "ai-studio",
    status: "planned"
  },
  {
    id: "federation-hub",
    title: "Federation Hub",
    appId: "federation-hub",
    status: "planned"
  }
];
`
  );

  writeFileOnce(
    join(webRoot, "components/Window.tsx"),
    `import type { ReactNode } from "react";

export type WindowProps = {
  title: string;
  children: ReactNode;
};

export function Window({ title, children }: WindowProps) {
  return (
    <section className="window">
      <header className="window-titlebar">
        <span>{title}</span>
      </header>
      <div className="window-body">{children}</div>
    </section>
  );
}
`
  );

  writeFileOnce(
    join(webRoot, "components/WindowManager.tsx"),
    `import { windowRegistry } from "../lib/window-registry";
import { Window } from "./Window";

export function WindowManager() {
  return (
    <section className="desktop-windows" aria-label="BookSmith Federation OS windows">
      {windowRegistry.map((window) => (
        <Window key={window.id} title={window.title}>
          <p className="muted">App: {window.appId}</p>
          <p>Status: {window.status}</p>
        </Window>
      ))}
    </section>
  );
}
`
  );
}
