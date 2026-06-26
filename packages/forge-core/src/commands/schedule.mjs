import { getForgePaths } from "../lib/paths.mjs";
import { MissionScheduler } from "../scheduler/engine.mjs";

function parseMax(args) {
  const maxIndex = args.indexOf("--max");
  if (maxIndex >= 0) return Number(args[maxIndex + 1] ?? 1);
  if (args.includes("--continuous")) return 50;
  return 1;
}

export async function schedule(args = []) {
  const paths = getForgePaths(import.meta.url);
  const scheduler = new MissionScheduler({ paths });

  await scheduler.run({
    maxRuns: parseMax(args),
    lifecycle: args.includes("--lifecycle") || args.includes("--continuous"),
    publish: args.includes("--publish")
  });
}

export default schedule;
