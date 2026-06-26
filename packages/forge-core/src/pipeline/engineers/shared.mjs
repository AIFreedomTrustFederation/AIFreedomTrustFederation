import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ok, warn } from "../../lib/logger.mjs";

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function writeFileOnce(path, content) {
  if (existsSync(path)) {
    warn(`exists ${path}`);
    return false;
  }

  ensureDir(dirname(path));
  writeFileSync(path, content);
  ok(`write ${path}`);
  return true;
}
