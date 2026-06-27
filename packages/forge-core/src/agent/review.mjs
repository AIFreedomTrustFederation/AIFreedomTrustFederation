import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { getForgePaths } from "../lib/paths.mjs";

function scorePatch(text) {
  let score = 100;
  const warnings = [];

  if (!text.trim()) {
    score -= 100;
    warnings.push("Patch is empty.");
  }

  if (text.includes("rm -rf") || text.includes("git push") || text.includes("git commit")) {
    score -= 50;
    warnings.push("Patch appears to include forbidden shell/git operations.");
  }

  if (text.includes("package.json") || text.includes("pnpm-lock.yaml") || text.includes("package-lock.json")) {
    score -= 15;
    warnings.push("Patch may modify dependencies or lockfiles.");
  }

  if (text.includes("node_modules") || text.includes(".env")) {
    score -= 25;
    warnings.push("Patch references protected or generated paths.");
  }

  if (!text.includes("diff --git") && !text.includes("*** Begin Patch") && !text.includes("FILE:")) {
    score -= 20;
    warnings.push("Patch format is not clearly recognized.");
  }

  return {
    score: Math.max(0, score),
    warnings,
    approved: score >= 70
  };
}

export function reviewPatchFile(filePath) {
  const paths = getForgePaths(import.meta.url);

  if (!existsSync(filePath)) {
    return {
      ok: false,
      error: `Patch file not found: ${filePath}`
    };
  }

  const text = readFileSync(filePath, "utf8");
  const review = scorePatch(text);

  const dir = join(paths.repoRoot, ".forge", "reviews");
  mkdirSync(dir, { recursive: true });

  const out = join(dir, `${basename(filePath)}.review.json`);
  writeFileSync(out, JSON.stringify({
    schema: "aift.forge.patch-review.v1",
    patch: filePath,
    reviewedAt: new Date().toISOString(),
    ...review
  }, null, 2) + "\n");

  return {
    ok: true,
    reviewFile: out,
    ...review
  };
}
