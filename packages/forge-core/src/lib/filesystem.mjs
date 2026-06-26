import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function writeFileOnce(path, content) {
  if (existsSync(path)) {
    throw new Error(`Refusing to overwrite existing file: ${path}`);
  }

  ensureDir(dirname(path));
  writeFileSync(path, content);
  return path;
}

export function writeFileForce(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content);
  return path;
}
