import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function fileFromImportMeta(importMetaUrl) {
  return fileURLToPath(importMetaUrl);
}

export function findUp(startDir, markerNames) {
  let current = resolve(startDir);

  while (true) {
    for (const marker of markerNames) {
      const candidate = resolve(current, marker);

      if (existsSync(candidate)) {
        return current;
      }
    }

    const parent = dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function findForgeRepoRoot(startDir) {
  return findUp(startDir, [
    "aift-forge-manifest.json",
    "AIFT_REPO_SYSTEM.md",
    ".git"
  ]);
}

export function getForgeWorkspace(importMetaUrl) {
  const file = fileFromImportMeta(importMetaUrl);
  const startDir = dirname(file);
  const repoRoot = findForgeRepoRoot(startDir);

  if (!repoRoot) {
    throw new Error(`Could not find AIFT-Forge repo root from ${startDir}`);
  }

  const aiftRoot = dirname(repoRoot);

  return {
    file,
    startDir,
    repoRoot,
    aiftRoot,
    forgeCoreRoot: resolve(repoRoot, "packages/forge-core")
  };
}
