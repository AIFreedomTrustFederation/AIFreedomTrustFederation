import { getForgePaths } from "../lib/paths.mjs";
import { buildWebOs } from "../builders/web-os.mjs";
import { fail } from "../lib/logger.mjs";

export function build(args = []) {
  const target = args[0];
  const force = args.includes("--force");
  const paths = getForgePaths(import.meta.url);

  if (!target) {
    console.log("Usage:");
    console.log("  aift-forge build web-os");
    console.log("  aift-forge build web-os --force");
    process.exit(1);
  }

  if (target === "web-os") {
    buildWebOs(paths, { force });
    return;
  }

  fail(`Unknown build target: ${target}`);
  console.log("Available build targets:");
  console.log("  web-os");
  process.exit(1);
}
