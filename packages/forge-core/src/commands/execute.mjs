import { join } from "node:path";
import { getForgePaths } from "../lib/paths.mjs";
import { loadMission, getNextMissionTask } from "../mission/state.mjs";
import { EngineerExecutionEngine } from "../execution/engine.mjs";
import { section, fail, ok } from "../lib/logger.mjs";

export async function execute(args = []) {
  const typecheck = args.includes("--typecheck");
  const paths = getForgePaths(import.meta.url);
  const mission = loadMission(paths.repoRoot);
  const task = getNextMissionTask(mission);

  console.log("🛠️ Forge Execute");

  section("Mission");
  console.log(mission.title);
  console.log(`State: ${mission.state}`);
  console.log(`Target: ${mission.targetRepository}`);

  if (!task) {
    ok("No executable task.");
    return;
  }

  console.log(`Task: ${task.title}`);

  if (mission.state !== "approved") {
    fail("Mission must be approved before execution.");
    console.log("Run:");
    console.log("  aift-forge mission approve");
    return;
  }

  const osRoot = join(paths.aiftRoot, mission.targetRepository);
  const webRoot = join(osRoot, "apps/web-os");

  const executor = new EngineerExecutionEngine({ paths });
  await executor.run({
    paths,
    mission,
    task,
    osRoot,
    webRoot
  }, { typecheck });
}

export default execute;
