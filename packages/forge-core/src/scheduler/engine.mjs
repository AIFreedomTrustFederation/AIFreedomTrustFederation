import { pipeline } from "../commands/pipeline.mjs";
import {
  loadMission,
  approveMission,
  getNextMissionTask,
  calculateMissionProgress
} from "../mission/state.mjs";
import { MissionLifecycleEngine } from "../lifecycle/engine.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export class MissionScheduler {
  constructor(context = {}) {
    this.paths = context.paths;
    this.lifecycle = new MissionLifecycleEngine(context);
  }

  load() {
    return loadMission(this.paths.repoRoot);
  }

  async ensureApproved(mission) {
    if (mission.state === "approved") return mission;

    warn("Mission is not approved. Approving within local mission authority.");
    approveMission(this.paths.repoRoot);
    return this.load();
  }

  async runOne(options = {}) {
    let mission = this.load();
    mission = await this.ensureApproved(mission);

    const task = getNextMissionTask(mission);

    if (!task) {
      return {
        ok: true,
        ran: false,
        reason: "no-task",
        mission
      };
    }

    section("Scheduler Task");
    console.log(`Mission: ${mission.title}`);
    console.log(`Progress: ${calculateMissionProgress(mission)}%`);
    console.log(`Task: ${task.title}`);

    await pipeline([
      "run",
      ...(options.publish ? ["--publish"] : [])
    ]);

    const after = this.load();

    return {
      ok: true,
      ran: true,
      mission: after,
      task
    };
  }

  async run(options = {}) {
    const maxRuns = options.maxRuns ?? 1;
    const lifecycle = options.lifecycle ?? false;

    console.log("🧭 Forge Mission Scheduler");
    console.log(`Max runs: ${maxRuns}`);
    console.log(`Lifecycle: ${lifecycle ? "enabled" : "disabled"}`);
    console.log(`Publish: ${options.publish ? "requested" : "no"}`);

    let completed = 0;

    for (let i = 0; i < maxRuns; i += 1) {
      section(`Scheduler Pass ${i + 1}`);

      let mission = this.load();
      let task = getNextMissionTask(mission);

      if (!task && lifecycle) {
        await this.lifecycle.ensureActiveMission(
          mission.targetRepository ?? "BookSmith-Federation-OS",
          { approve: true }
        );

        mission = this.load();
        task = getNextMissionTask(mission);
      }

      if (!task) {
        ok("No executable task remains.");
        break;
      }

      const result = await this.runOne(options);

      if (!result.ran) {
        ok(`Scheduler stopped: ${result.reason}`);
        break;
      }

      completed += 1;
    }

    section("Scheduler Result");
    console.log(`Tasks completed this run: ${completed}`);
    console.log(`Current progress: ${calculateMissionProgress(this.load())}%`);

    return {
      ok: true,
      completed
    };
  }
}
