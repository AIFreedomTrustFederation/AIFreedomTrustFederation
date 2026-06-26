import { getForgePaths } from "../lib/paths.mjs";
import { verifyWebOs } from "../verifiers/web-os.mjs";
import { fail } from "../lib/logger.mjs";

export function verify(args = []) {
  const target = args[0];
  const skipBuild = args.includes("--skip-build");
  const paths = getForgePaths(import.meta.url);

  if (!target) {
    console.log("Usage:");
    console.log("  aift-forge verify web-os");
    console.log("  aift-forge verify web-os --skip-build");
    process.exit(1);
  }

  if (target === "web-os") {
    verifyWebOs(paths, { skipBuild });
    return;
  }

  fail(`Unknown verify target: ${target}`);
  console.log("Available verify targets:");
  console.log("  web-os");
  process.exit(1);
}
