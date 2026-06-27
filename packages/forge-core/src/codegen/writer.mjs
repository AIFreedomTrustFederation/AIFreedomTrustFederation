import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function writeGeneratedFile(path, content, options = {}) {
  const exists = existsSync(path);

  if (exists && !options.overwrite) {
    return {
      ok: false,
      skipped: true,
      path,
      reason: "exists"
    };
  }

  ensureDir(dirname(path));

  const previous = exists ? readFileSync(path, "utf8") : null;

  if (previous === content) {
    return {
      ok: true,
      unchanged: true,
      path
    };
  }

  writeFileSync(path, content);

  return {
    ok: true,
    created: !exists,
    modified: exists,
    path
  };
}
