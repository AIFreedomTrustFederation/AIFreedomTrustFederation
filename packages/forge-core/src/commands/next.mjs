import { getForgePaths } from "../lib/paths.mjs";
import { approveCurrentTask, ensureMemory, loadMemory } from "../memory/state.mjs";
import { section, ok } from "../lib/logger.mjs";

export function next(args = []) {
  const approve = args.includes("--approve");
  const paths = getForgePaths(import.meta.url);

  if (approve) {
    const memory = approveCurrentTask(paths.repoRoot);

    console.log("✅ Forge Next Approved");

    section("Approved Task");
    console.log(memory.currentTask.title);

    section("Next Manual Step");
    console.log("Build this task with a dedicated script or future Forge builder.");
    console.log("Recommended first implementation:");
    console.log("  Build WindowManager component in BookSmith-Federation-OS/apps/web-os/components");

    ok("Approval recorded in .forge/memory.json");
    return;
  }

  const memory = ensureMemory(paths.repoRoot);

  console.log("⏭️ Forge Next");

  section("Recommended Task");
  console.log(memory.currentTask.title);

  section("Why");
  console.log(memory.currentTask.reason);

  section("Target Repository");
  console.log(memory.currentTask.targetRepo);

  section("Approval");
  console.log("Run:");
  console.log("  aift-forge next --approve");

  section("Queued After This");
  for (const task of memory.nextTasks.slice(0, 4)) {
    console.log(`□ ${task.title}`);
  }
}
