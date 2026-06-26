import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { getEngineer, listEngineers } from "../pipeline/engineers/index.mjs";
import { ok, warn, fail, section } from "../lib/logger.mjs";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeFile(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content);
  ok(`write ${path}`);
}

function readIfExists(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function runShell(command, cwd) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf8",
      stdio: "pipe"
    }).trim();

    return { ok: true, output };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim()
    };
  }
}

export class EngineerExecutionEngine {
  constructor(context = {}) {
    this.paths = context.paths;
  }

  async plan({ mission, task, osRoot, webRoot }) {
    section("Execution Plan");

    const engineer = await getEngineer(task.id);

    if (!engineer) {
      const available = await listEngineers();
      fail(`No engineer registered for task: ${task.id}`);
      console.log("");
      console.log("Registered engineers:");
      for (const item of available) {
        console.log(`  - ${item.taskId}`);
      }
      return { ok: false, reason: "missing-engineer" };
    }

    const files = task.files ?? [];

    console.log(`Task: ${task.title}`);
    console.log(`Engineer: ${task.engineer ?? task.id}`);
    console.log(`Files:`);
    for (const file of files) console.log(`  - ${file}`);

    return {
      ok: true,
      engineer,
      files,
      osRoot,
      webRoot
    };
  }

  async generate(context) {
    section("Generate");

    const { task } = context;

    // Existing engineer modules are deterministic generators.
    // They write source files directly through their run(context) function.
    return {
      ok: true,
      mode: "deterministic-template",
      taskId: task.id
    };
  }

  async apply(context) {
    section("Apply Patch");

    const plan = await this.plan(context);
    if (!plan.ok) return plan;

    await plan.engineer({
      ...context,
      osRoot: plan.osRoot,
      webRoot: plan.webRoot
    });

    return {
      ok: true,
      files: plan.files
    };
  }

  async verify(context) {
    section("Execution Verify");

    const { task, osRoot } = context;
    let failed = 0;

    for (const file of task.files ?? []) {
      const path = join(osRoot, file);
      const content = readIfExists(path);

      if (!content) {
        fail(file);
        failed += 1;
        continue;
      }

      ok(file);
    }

    return {
      ok: failed === 0,
      failed
    };
  }

  async typecheck(context) {
    section("Typecheck");

    const { osRoot } = context;

    const packageJson = join(osRoot, "apps/web-os/package.json");

    if (!existsSync(packageJson)) {
      warn("No apps/web-os/package.json found. Skipping typecheck.");
      return { ok: true, skipped: true };
    }

    const result = runShell("npm --prefix apps/web-os run typecheck", osRoot);

    if (result.ok) {
      ok("typecheck passed");
    } else {
      warn("typecheck failed");
      console.log(result.output);
    }

    return result;
  }

  async run(context, options = {}) {
    console.log("🛠️ Forge Engineer Execution Engine");

    const generated = await this.generate(context);
    if (!generated.ok) return generated;

    const applied = await this.apply(context);
    if (!applied.ok) return applied;

    const verified = await this.verify(context);
    if (!verified.ok) return verified;

    if (options.typecheck) {
      const checked = await this.typecheck(context);
      if (!checked.ok) return checked;
    }

    section("Execution Result");
    ok("Engineer execution complete.");

    return {
      ok: true
    };
  }
}
