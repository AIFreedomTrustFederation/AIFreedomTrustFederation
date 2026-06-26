import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ok, section, fail, warn } from "../lib/logger.mjs";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeFileSafe(path, content, force = false) {
  ensureDir(join(path, ".."));

  if (existsSync(path) && !force) {
    warn(`exists ${path}`);
    return false;
  }

  writeFileSync(path, content);
  ok(`write ${path}`);
  return true;
}

export function buildWebOs(paths, options = {}) {
  const force = options.force === true;
  const osRoot = join(paths.aiftRoot, "BookSmith-Federation-OS");
  const webRoot = join(osRoot, "apps/web-os");

  console.log("🖥️ Building BookSmith Web OS shell");

  if (!existsSync(osRoot)) {
    fail(`Missing BookSmith-Federation-OS repo: ${osRoot}`);
    process.exit(1);
  }

  section("Directories");

  const dirs = [
    "app",
    "components",
    "lib",
    "app/api/booksmith/run"
  ];

  for (const dir of dirs) {
    ensureDir(join(webRoot, dir));
    ok(`dir apps/web-os/${dir}`);
  }

  section("Project Files");

  writeFileSafe(
    join(webRoot, "package.json"),
    `{
  "name": "@booksmith-federation-os/web-os",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "next.config.mjs"),
    `const nextConfig = {};

export default nextConfig;
`,
    force
  );

  writeFileSafe(
    join(webRoot, "tsconfig.json"),
    `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,
    force
  );

  section("App Shell");

  writeFileSafe(
    join(webRoot, "app/layout.tsx"),
    `import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "BookSmith Federation OS",
  description: "Federated desktop shell for knowledge, publishing, and trust infrastructure."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "app/page.tsx"),
    `import { Desktop } from "../components/Desktop";

export default function Page() {
  return <Desktop />;
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "app/globals.css"),
    `:root {
  color-scheme: dark;
  background: #07101f;
  color: #eef4ff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button {
  cursor: pointer;
}

.desktop {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(68, 108, 255, 0.22), transparent 34rem),
    radial-gradient(circle at bottom right, rgba(0, 255, 190, 0.12), transparent 30rem),
    #07101f;
}

.shell {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
}

.grid {
  display: grid;
  gap: 16px;
}

.app-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.two-column {
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
}

.muted {
  color: #aab7cc;
}

.badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #dce8ff;
  font-size: 13px;
}

.dock {
  position: sticky;
  bottom: 16px;
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 12px;
  backdrop-filter: blur(16px);
}

.dock button {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  background: #eaf2ff;
  color: #07101f;
  font-weight: 700;
}

@media (max-width: 820px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}
`,
    force
  );

  section("Components");

  writeFileSafe(
    join(webRoot, "components/Desktop.tsx"),
    `import { AppLauncher } from "./AppLauncher";
import { CanonIntakePanel } from "./CanonIntakePanel";
import { Dock } from "./Dock";
import { RoadmapPanel } from "./RoadmapPanel";
import { SystemHealth } from "./SystemHealth";

export function Desktop() {
  return (
    <main className="desktop">
      <div className="shell">
        <section className="panel">
          <span className="badge">AI Freedom Trust Federation</span>
          <h1>BookSmith Federation OS</h1>
          <p className="muted">
            A local-first federation desktop for knowledge, publishing, repository
            orchestration, canon intake, and trust-governed AI workflows.
          </p>
        </section>

        <section className="grid two-column">
          <AppLauncher />
          <SystemHealth />
        </section>

        <section className="grid two-column">
          <CanonIntakePanel />
          <RoadmapPanel />
        </section>

        <Dock />
      </div>
    </main>
  );
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "components/AppLauncher.tsx"),
    `const apps = [
  "📚 BookSmith",
  "🤖 AI Studio",
  "📁 Repository Manager",
  "☁ Drive",
  "🛒 Marketplace",
  "💼 Wallet",
  "🌐 Federation Hub",
  "⚙ System",
  "🔍 Search"
];

export function AppLauncher() {
  return (
    <section className="panel">
      <h2>App Launcher</h2>
      <div className="grid app-grid">
        {apps.map((app) => (
          <div className="panel" key={app}>
            {app}
          </div>
        ))}
      </div>
    </section>
  );
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "components/SystemHealth.tsx"),
    `const checks = [
  ["Desktop shell", "online"],
  ["Canon rule", "active"],
  ["BookSmith bridge", "planned"],
  ["Forge integration", "planned"],
  ["Local storage", "planned"]
];

export function SystemHealth() {
  return (
    <section className="panel">
      <h2>System Health</h2>
      {checks.map(([name, status]) => (
        <p key={name}>
          <strong>{name}:</strong> <span className="muted">{status}</span>
        </p>
      ))}
    </section>
  );
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "components/CanonIntakePanel.tsx"),
    `export function CanonIntakePanel() {
  return (
    <section className="panel">
      <h2>Canon Intake</h2>
      <p>
        <strong>User paste/upload</strong> = accepted canon.
      </p>
      <p>
        <strong>AI output</strong> = proposed patch until approved.
      </p>
      <p className="muted">
        This rule is the heart of the OS. AI does not silently overwrite human canon.
      </p>
    </section>
  );
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "components/RoadmapPanel.tsx"),
    `const roadmap = [
  "Phase 0.2 — Web OS shell",
  "Phase 0.3 — BookSmith bridge API",
  "Phase 0.4 — Canon Intake registry UI",
  "Phase 1 — Knowledge workspace",
  "Phase 2 — Publishing studio"
];

export function RoadmapPanel() {
  return (
    <section className="panel">
      <h2>Roadmap</h2>
      <ul>
        {roadmap.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
`,
    force
  );

  writeFileSafe(
    join(webRoot, "components/Dock.tsx"),
    `export function Dock() {
  return (
    <nav className="panel dock" aria-label="BookSmith Federation OS dock">
      <button>Dashboard</button>
      <button>BookSmith</button>
      <button>AI Dock</button>
      <button>System</button>
    </nav>
  );
}
`,
    force
  );

  section("API Placeholder");

  writeFileSafe(
    join(webRoot, "app/api/booksmith/run/route.ts"),
    `export async function POST() {
  return Response.json({
    ok: false,
    status: "planned",
    message: "BookSmith bridge API route placeholder. Phase 0.3 will wire this to packages/booksmith-bridge."
  });
}
`,
    force
  );

  ok("BookSmith Web OS shell build complete.");
}
