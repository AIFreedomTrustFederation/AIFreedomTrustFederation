import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getForgePaths(importMetaUrl = import.meta.url) {
  const file = fileURLToPath(importMetaUrl);
  const dir = dirname(file);

  const forgeCoreRoot = resolve(dir, "../../..");
  const repoRoot = resolve(forgeCoreRoot, "../..");
  const aiftRoot = resolve(repoRoot, "..");

  return {
    file,
    dir,
    forgeCoreRoot,
    repoRoot,
    aiftRoot
  };
}
