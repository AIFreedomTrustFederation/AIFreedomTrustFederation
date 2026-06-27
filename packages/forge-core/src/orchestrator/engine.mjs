import { readFileSync, existsSync } from "node:fs";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, warn, fail } from "../lib/logger.mjs";
import { loadMission, calculateMissionProgress, getNextMissionTask } from "../mission/state.mjs";
import { discoverRepository } from "../discovery/repository.mjs";
import { buildRepositoryGraph } from "../discovery/graph.mjs";
import { detectGaps } from "../discovery/gaps.mjs";
import { MissionLifecycleEngine } from "../lifecycle/engine.mjs";
import { MissionScheduler } from "../scheduler/engine.mjs";
import { createAgentPacket } from "../agent/packet.mjs";
import { reviewPatchFile } from "../agent/review.mjs";
import { ForgeCodegenEngine } from "../codegen/engine.mjs";
import { join } from "node:path";

export class ForgeMissionOrchestrator {
  constructor(options = {}) {
    this.paths = options.paths ?? getForgePaths(import.meta.url);
    this.lifecycle = new MissionLifecycleEngine({ paths: this.paths });
    this.scheduler = new MissionScheduler({ paths: this.paths });
  }

  mission() {
    return loadMission(this.paths.repoRoot);
  }

  status() {
    const mission = this.mission();
    const task = getNextMissionTask(mission);

    console.log("🧠 Forge Mission Orchestrator");

    section("Mission");
    console.log(`Title: ${mission.title}`);
    console.log(`State: ${mission.state}`);
    console.log(`Target: ${mission.targetRepository}`);
    console.log(`Progress: ${calculateMissionProgress(mission)}%`);

    section("Next Task");
    if (task) {
      ok(`${task.id}: ${task.title}`);
    } else {
      warn("No executable task.");
    }

    section("Subsystems");
    ok("Lifecycle engine");
    ok("Scheduler");
    ok("Repository discovery");
    ok("Graph discovery");
    ok("Agent packet bridge");
    ok("Patch reviewer");
    ok("Codegen engine");
  }

  async discover(targetRepository = null) {
    const mission = this.mission();
    const target = targetRepository ?? mission.targetRepository ?? "BookSmith-Federation-OS";

    console.log("🔎 Orchestrator Discovery");

    const repository = await discoverRepository(this.paths, target);
    const graph = buildRepositoryGraph(repository.root);
    const gaps = detectGaps(graph);

    section("Repository");
    console.log(`Target: ${target}`);
    console.log(`Path: ${repository.root}`);
    console.log(`Known candidate tasks: ${repository.tasks.length}`);

    section("Graph");
    console.log(`Files: ${graph.files.length}`);
    console.log(`Imports: ${graph.imports.length}`);
    console.log(`Missing imports: ${graph.missingImports.length}`);
    console.log(`TODO/stub files: ${graph.todos.length}`);
    console.log(`Graph gaps: ${gaps.length}`);

    return {
      repository,
      graph,
      gaps
    };
  }

  async nextMission(options = {}) {
    const mission = this.mission();
    const target = options.targetRepository ?? mission.targetRepository ?? "BookSmith-Federation-OS";

    console.log("♻️ Orchestrator Next Mission");

    await this.lifecycle.ensureActiveMission(target, {
      approve: options.approve ?? true
    });

    this.status();
  }

  async run(options = {}) {
    console.log("🚀 Orchestrator Run");

    await this.scheduler.run({
      maxRuns: options.maxRuns ?? 1,
      lifecycle: options.lifecycle ?? true,
      publish: options.publish ?? false
    });
  }

  async agentTask() {
    console.log("🤖 Orchestrator Agent Task");

    const result = createAgentPacket();

    if (!result) {
      warn("No executable task available for agent packet.");
      return null;
    }

    section("Packet");
    ok(result.file);

    section("Task");
    console.log(result.packet.task.title);

    section("Backend");
    if (result.packet.backend) {
      console.log(`${result.packet.backend.id} — ${result.packet.backend.label}`);
    } else {
      warn("No backend selected.");
    }

    return result;
  }

  reviewPatch(patchFile) {
    console.log("🧾 Orchestrator Patch Review");

    if (!patchFile) {
      fail("Missing patch file.");
      return null;
    }

    const review = reviewPatchFile(patchFile);

    if (!review.ok) {
      fail(review.error);
      return review;
    }

    section("Review");
    console.log(`Score: ${review.score}`);
    console.log(`Approved: ${review.approved ? "yes" : "no"}`);

    if (review.warnings.length) {
      section("Warnings");
      for (const warning of review.warnings) warn(warning);
    }

    section("Review File");
    ok(review.reviewFile);

    return review;
  }

  codegenFeature(id = "orchestrator-panel") {
    const mission = this.mission();
    const target = mission.targetRepository ?? "BookSmith-Federation-OS";
    const webRoot = join(this.paths.aiftRoot, target, "apps/web-os");
    const codegen = new ForgeCodegenEngine({ webRoot });

    console.log("🏗️ Orchestrator Codegen");

    const result = codegen.generateFeature({
      id,
      title: id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
      description: `Generated by Forge Mission Orchestrator.`,
      records: [
        {
          id: "orchestrated",
          label: "Orchestrated",
          value: "true",
          description: "Created through the mission orchestrator."
        }
      ]
    });

    section("Generated Files");
    for (const item of result) {
      if (item.ok && item.unchanged) ok(`unchanged ${item.path}`);
      else if (item.ok) ok(item.path);
      else warn(`${item.path} skipped: ${item.reason}`);
    }

    return result;
  }
}
