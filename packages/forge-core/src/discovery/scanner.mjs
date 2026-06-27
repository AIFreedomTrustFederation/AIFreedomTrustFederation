import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"]);
const sourceExts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".json"];

export function scanRepository(root, options = {}) {
  const maxFiles = options.maxFiles ?? 1500;
  const files = [];

  function walk(dir) {
    if (!existsSync(dir) || files.length >= maxFiles) return;

    for (const entry of readdirSync(dir)) {
      if (ignoredDirs.has(entry)) continue;

      const abs = join(dir, entry);
      const stat = statSync(abs);

      if (stat.isDirectory()) {
        walk(abs);
        continue;
      }

      const rel = relative(root, abs);
      if (sourceExts.some((ext) => rel.endsWith(ext))) {
        files.push({
          path: rel,
          abs,
          size: stat.size
        });
      }
    }
  }

  walk(root);

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export function readText(file) {
  try {
    return readFileSync(file.abs ?? file, "utf8");
  } catch {
    return "";
  }
}
