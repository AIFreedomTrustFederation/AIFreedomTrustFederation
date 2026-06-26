import { getForgePaths } from "../lib/paths.mjs";
import { ensureMemory } from "../memory/state.mjs";
import { section, ok } from "../lib/logger.mjs";

export function resume() {
  const paths = getForgePaths(import.meta.url);
  const memory = ensureMemory(paths.repoRoot);

  console.log("🔁 Forge Resume");

  section("Where We Left Off");
  console.log(`Mission: ${memory.mission}`);
  console.log(`Phase:   ${memory.phase}`);

  section("Last Completed");
  for (const item of memory.lastCompleted.slice(-5)) {
    console.log(`✅ ${item}`);
  }

  section("Resume Task");
  console.log(memory.currentTask.title);
  console.log(memory.currentTask.reason);

  section("Suggested");
  console.log("Run:");
  console.log("  aift-forge next");
  console.log("  aift-forge next --approve");

  ok("Resume ready.");
}
