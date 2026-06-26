import { getForgePaths } from "../lib/paths.mjs";
import { MissionLifecycleEngine } from "../lifecycle/engine.mjs";

export async function lifecycle(args = []) {
  const action = args[0] ?? "status";
  const target = args[1] ?? "BookSmith-Federation-OS";
  const approve = args.includes("--approve");
  const paths = getForgePaths(import.meta.url);
  const engine = new MissionLifecycleEngine({ paths });

  if (action === "status") {
    const mission = engine.load();
    console.log("♻️ Forge Mission Lifecycle");
    console.log("");
    console.log(`Mission: ${mission.title}`);
    console.log(`State: ${mission.state}`);
    console.log(`Target: ${mission.targetRepository}`);
    console.log(`Executable task: ${engine.hasExecutableTask(mission) ? "yes" : "no"}`);
    return;
  }

  if (action === "next") {
    await engine.ensureActiveMission(target, { approve });
    return;
  }

  if (action === "complete") {
    engine.completeCurrentMission("manual-complete");
    return;
  }

  console.log("Forge Mission Lifecycle");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge lifecycle status");
  console.log("  aift-forge lifecycle next BookSmith-Federation-OS --approve");
  console.log("  aift-forge lifecycle complete");
}

export default lifecycle;
