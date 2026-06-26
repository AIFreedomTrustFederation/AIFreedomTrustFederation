import {
  planStage,
  engineerStage,
  verifierStage,
  reviewerStage,
  memoryStage,
  publisherStage
} from "./stages.mjs";
import { ok, section } from "../lib/logger.mjs";

export class PipelineEngine {
  constructor(context = {}) {
    this.paths = context.paths;
  }

  run(options = {}) {
    console.log("🏗️ Forge Engineering Pipeline");

    let state = planStage(this.paths);

    if (!state.task) {
      section("Result");
      ok("Pipeline complete. No task selected.");
      return;
    }

    state = engineerStage(this.paths, state);
    state = verifierStage(this.paths, state);
    state = reviewerStage(this.paths, state);
    state = memoryStage(this.paths, state);
    state = publisherStage(this.paths, state, options);

    section("Result");

    if (state.blocked) {
      console.log("Pipeline stopped at governance or implementation boundary.");
      return;
    }

    if (state.verified) {
      ok("Pipeline completed successfully.");
      console.log("");
      console.log("Next:");
      console.log("  cd ~/Projects/AIFT/BookSmith-Federation-OS");
      console.log("  git status");
      console.log("  npm --prefix apps/web-os run typecheck");
      return;
    }

    console.log("Pipeline finished, but verification did not pass.");
  }
}
