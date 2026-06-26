import { loadMission, approveMission, getNextMissionTask, calculateMissionProgress } from "../mission/state.mjs";
import { pipeline } from "./pipeline.mjs";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export async function autopilot(args = []) {
  const publish = args.includes("--publish");
  const maxIndex = args.indexOf("--max");
  const maxRuns = maxIndex >= 0 ? Number(args[maxIndex + 1] ?? 1) : 1;

  const paths = getForgePaths(import.meta.url);

  console.log("🤖 Forge Autopilot");
  console.log(`Max runs: ${maxRuns}`);
  console.log(`Publish: ${publish ? "requested" : "no"}`);

  for (let i = 0; i < maxRuns; i += 1) {
    const mission = loadMission(paths.repoRoot);
    const task = getNextMissionTask(mission);

    section(`Autopilot Pass ${i + 1}`);

    if (!task) {
      ok("No remaining mission tasks.");
      return;
    }

    console.log(`Mission: ${mission.title}`);
    console.log(`State: ${mission.state}`);
    console.log(`Progress: ${calculateMissionProgress(mission)}%`);
    console.log(`Task: ${task.title}`);

    if (mission.state !== "approved") {
      warn("Mission is not approved. Approving within mission authority.");
      approveMission(paths.repoRoot);
    }

    await pipeline([
      "run",
      ...(publish ? ["--publish"] : [])
    ]);
  }

  section("Autopilot Complete");
  console.log("Run again when ready:");
  console.log("  aift-forge autopilot --max 1");
  console.log("  aift-forge autopilot --max 3");
}
