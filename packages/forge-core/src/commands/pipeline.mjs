import { getForgePaths } from "../lib/paths.mjs";
import { PipelineEngine } from "../pipeline/engine.mjs";

export async function pipeline(args = []) {
  const action = args[0] ?? "status";
  const publish = args.includes("--publish");
  const paths = getForgePaths(import.meta.url);
  const engine = new PipelineEngine({ paths });

  if (action === "run") {
    await engine.run({ publish });
    return;
  }

  console.log("Forge Engineering Pipeline");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge pipeline run");
  console.log("  aift-forge pipeline run --publish");
}
