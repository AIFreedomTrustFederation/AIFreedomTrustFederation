import { join } from "node:path";
import { writeFileOnce } from "./shared.mjs";

export function buildLauncherRouting({ webRoot }) {
  writeFileOnce(
    join(webRoot, "components/LauncherRouter.tsx"),
    `import { appRegistry } from "../lib/app-registry";

export function LauncherRouter() {
  return (
    <section className="panel">
      <h2>Launcher</h2>
      <p className="muted">Open BookSmith Federation OS applications.</p>

      <div className="grid app-grid">
        {appRegistry.map((app) => (
          <button key={app.id} className="launcher-card">
            <strong>{app.name}</strong>
            <span>{app.description}</span>
            <small>Status: {app.status}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
`
  );
}
