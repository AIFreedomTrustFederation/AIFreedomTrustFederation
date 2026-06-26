import { getForgePaths } from "../lib/paths.mjs";
import { WorkflowEngine } from "../workflows/engine.mjs";

export function cycle(args = []) {
  const approve = args.includes("--approve");
  const paths = getForgePaths(import.meta.url);

  const engine = new WorkflowEngine({ paths });
  engine.run({ approve });
}
