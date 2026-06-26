import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  loadMission,
  saveMission,
  approveMission,
  getNextMissionTask,
  calculateMissionProgress
} from "../mission/state.mjs";
import { createMissionFromScan, scanMissionCandidate } from "../mission/generator.mjs";
import { generateNextMission } from "../mission/next-mission.mjs";
import { assign } from "../commands/assign.mjs";
import { ok, warn, section } from "../lib/logger.mjs";

export class MissionLifecycleEngine {
  constructor(context = {}) {
    this.paths = context.paths;
  }

  load() {
    return loadMission(this.paths.repoRoot);
  }

  hasExecutableTask(mission) {
    return Boolean(getNextMissionTask(mission));
  }

  isComplete(mission) {
    return calculateMissionProgress(mission) >= 100 || !this.hasExecutableTask(mission);
  }

  completeCurrentMission(reason = "no-executable-task") {
    const mission = this.load();

    if (mission.state !== "complete") {
      mission.state = "complete";
      mission.progress = calculateMissionProgress(mission);
      mission.events.push({
        type: "mission-complete",
        reason,
        at: new Date().toISOString()
      });

      saveMission(this.paths.repoRoot, mission);
      ok(`Mission complete: ${mission.title}`);
    }

    return mission;
  }

  async scan(targetRepository = "BookSmith-Federation-OS") {
    return scanMissionCandidate(this.paths, targetRepository);
  }

  async createNextMission(targetRepository = "BookSmith-Federation-OS") {
    section("Create Next Mission");

    const generated = await generateNextMission(this.paths, targetRepository);

    if (generated) {
      ok(`Generated mission: ${generated.title}`);
      return generated;
    }

    const scan = await this.scan(targetRepository);
    const incomplete = scan.tasks.filter((task) => task.status !== "complete");

    if (!incomplete.length) {
      warn("No next mission generated. Repository appears complete for known templates.");
      return null;
    }

    const mission = await createMissionFromScan(this.paths, targetRepository);
    ok(`Created mission: ${mission.title}`);
    return mission;
  }

  async ensureActiveMission(targetRepository = "BookSmith-Federation-OS", options = {}) {
    const mission = this.load();

    section("Mission Lifecycle");
    console.log(`Current: ${mission.title}`);
    console.log(`State: ${mission.state}`);
    console.log(`Progress: ${calculateMissionProgress(mission)}%`);

    if (this.hasExecutableTask(mission)) {
      ok("Executable task available.");
      return mission;
    }

    this.completeCurrentMission("no-executable-task");

    const next = await this.createNextMission(targetRepository);

    if (!next) {
      warn("No next mission generated.");
      return null;
    }

    if (options.approve) {
      approveMission(this.paths.repoRoot);
      ok("Next mission approved.");
    }

    await assign();

    return this.load();
  }
}
