import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { loadMemory, saveMemory } from "../memory/state.mjs";
import { ok, warn, section } from "../lib/logger.mjs";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeFileIfMissing(path, content) {
  if (existsSync(path)) {
    warn(`exists ${path}`);
    return false;
  }

  ensureDir(dirname(path));
  writeFileSync(path, content);
  ok(`write ${path}`);
  return true;
}

function gitShortStatus(repoPath) {
  try {
    return execSync("git status --short", {
      cwd: repoPath,
      encoding: "utf8"
    }).trim();
  } catch {
    return "";
  }
}

export class WorkflowEngine {
  constructor(context = {}) {
    this.paths = context.paths;
  }

  load() {
    const memory = loadMemory(this.paths.repoRoot);
    return {
      memory,
      task: memory.currentTask
    };
  }

  observe() {
    const state = this.load();

    section("Observe");
    ok(`Mission: ${state.memory.mission}`);
    ok(`Phase: ${state.memory.phase}`);
    ok(`Task: ${state.task.title}`);

    return state;
  }

  think(state) {
    section("Think");

    const approved = state.task.status === "approved";

    if (approved) {
      ok("Current task is approved.");
    } else {
      warn("Current task is not approved yet.");
    }

    return {
      ...state,
      approved
    };
  }

  propose(state) {
    section("Propose");

    console.log("Next workflow:");
    console.log("  Build Desktop Window Manager");
    console.log("");
    console.log("Planned files:");
    console.log("  apps/web-os/components/WindowManager.tsx");
    console.log("  apps/web-os/components/Window.tsx");
    console.log("  apps/web-os/lib/window-registry.ts");

    return state;
  }

  buildWindowManager(state) {
    section("Build");

    const osRoot = join(this.paths.aiftRoot, "BookSmith-Federation-OS");
    const webRoot = join(osRoot, "apps/web-os");

    writeFileIfMissing(
      join(webRoot, "lib/window-registry.ts"),
      `export type WindowDefinition = {
  id: string;
  title: string;
  app: string;
  status: "active" | "planned";
};

export const windowRegistry: WindowDefinition[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    app: "System",
    status: "active"
  },
  {
    id: "booksmith",
    title: "BookSmith",
    app: "Publishing",
    status: "planned"
  },
  {
    id: "ai-studio",
    title: "AI Studio",
    app: "AI",
    status: "planned"
  },
  {
    id: "federation-hub",
    title: "Federation Hub",
    app: "Federation",
    status: "planned"
  }
];
`
    );

    writeFileIfMissing(
      join(webRoot, "components/Window.tsx"),
      `import type { ReactNode } from "react";

export function Window({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="window-titlebar">
        <strong>{title}</strong>
        <span className="muted">local-first window</span>
      </div>
      <div>{children}</div>
    </section>
  );
}
`
    );

    writeFileIfMissing(
      join(webRoot, "components/WindowManager.tsx"),
      `import { windowRegistry } from "../lib/window-registry";
import { Window } from "./Window";

export function WindowManager() {
  return (
    <section className="grid app-grid">
      {windowRegistry.map((window) => (
        <Window title={window.title} key={window.id}>
          <p className="muted">{window.app}</p>
          <p>Status: {window.status}</p>
        </Window>
      ))}
    </section>
  );
}
`
    );

    return state;
  }

  verify(state) {
    section("Verify");

    const webRoot = join(this.paths.aiftRoot, "BookSmith-Federation-OS/apps/web-os");
    const required = [
      "components/WindowManager.tsx",
      "components/Window.tsx",
      "lib/window-registry.ts"
    ];

    let missing = 0;

    for (const file of required) {
      if (existsSync(join(webRoot, file))) {
        ok(file);
      } else {
        warn(`missing ${file}`);
        missing += 1;
      }
    }

    return {
      ...state,
      verified: missing === 0
    };
  }

  learn(state) {
    section("Learn");

    const memory = loadMemory(this.paths.repoRoot);

    if (!memory.lastCompleted.includes("Desktop Window Manager")) {
      memory.lastCompleted.push("Desktop Window Manager");
    }

    memory.currentTask = {
      id: "web-os-dock-manager",
      title: "Build Dock Manager",
      status: "ready",
      targetRepo: "BookSmith-Federation-OS",
      reason: "The Window Manager exists. The next OS-level capability is improving the dock into a managed app launch surface."
    };

    memory.nextTasks = memory.nextTasks.filter((task) => task.id !== "web-os-dock-manager");

    saveMemory(this.paths.repoRoot, memory);
    ok("Memory advanced to Dock Manager.");

    const osRoot = join(this.paths.aiftRoot, "BookSmith-Federation-OS");
    const status = gitShortStatus(osRoot);

    if (status) {
      console.log("");
      console.log("BookSmith repo has generated changes:");
      console.log(status);
    }

    return state;
  }

  run(options = {}) {
    const approve = options.approve === true;

    console.log("🔁 Forge Workflow Cycle");

    const observed = this.observe();
    const thought = this.think(observed);
    this.propose(thought);

    if (!approve && !thought.approved) {
      section("Awaiting Approval");
      console.log("Run:");
      console.log("  aift-forge cycle --approve");
      return;
    }

    const built = this.buildWindowManager(thought);
    const verified = this.verify(built);

    if (!verified.verified) {
      section("Result");
      warn("Workflow did not verify.");
      return;
    }

    this.learn(verified);

    section("Result");
    ok("Workflow cycle complete.");
    console.log("");
    console.log("Next:");
    console.log("  cd ~/Projects/AIFT/BookSmith-Federation-OS");
    console.log("  git status");
    console.log("  npm --prefix apps/web-os run typecheck");
  }
}
