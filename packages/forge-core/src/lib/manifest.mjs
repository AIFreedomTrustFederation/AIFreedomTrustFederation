import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function readJsonFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing manifest file: ${path}`);
  }

  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadForgeManifest(repoRoot) {
  return readJsonFile(join(repoRoot, "aift-forge-manifest.json"));
}

export function loadRootManifest(repoRoot) {
  return readJsonFile(join(repoRoot, "aift-root-manifest.json"));
}

export function loadManifestBundle(repoRoot) {
  return {
    forge: loadForgeManifest(repoRoot),
    root: loadRootManifest(repoRoot)
  };
}
