import { getForgePaths } from "../lib/paths.mjs";
import { ensureMemory } from "../memory/state.mjs";
import { section, ok } from "../lib/logger.mjs";

export function remember() {
  const paths = getForgePaths(import.meta.url);
  const memory = ensureMemory(paths.repoRoot);

  console.log("🧠 Forge Memory");

  section("Current Mission");
  console.log(memory.mission);

  section("Current Phase");
  console.log(memory.phase);

  section("Last Completed");
  for (const item of memory.lastCompleted) {
    console.log(`✅ ${item}`);
  }

  section("Current Task");
  console.log(`${memory.currentTask.title}`);
  console.log(`Status: ${memory.currentTask.status}`);
  console.log(`Target: ${memory.currentTask.targetRepo}`);
  console.log(`Reason: ${memory.currentTask.reason}`);

  section("Next Tasks");
  for (const task of memory.nextTasks) {
    console.log(`□ ${task.title}`);
  }

  section("Memory File");
  console.log(".forge/memory.json");

  ok("Memory loaded.");
}
