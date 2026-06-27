import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import crypto from "node:crypto";
import { createScan } from "./store.mjs";

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage"
]);

const CODE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".sh"
]);

export function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function scanRepositoryFiles(paths, options = {}) {
  const limit = Number(options.limit ?? 2000);
  const files = [];

  walk(paths.repoRoot, paths.repoRoot, files, limit);

  const summary = {
    totalFiles: files.length,
    byExtension: {},
    totalLines: 0,
    totalBytes: 0
  };

  for (const file of files) {
    summary.byExtension[file.extension] ??= 0;
    summary.byExtension[file.extension] += 1;
    summary.totalLines += file.lines;
    summary.totalBytes += file.bytes;
  }

  return createScan(paths, {
    files,
    summary
  });
}

function walk(root, dir, files, limit) {
  if (files.length >= limit) return;

  for (const name of readdirSync(dir)) {
    if (files.length >= limit) return;
    if (DEFAULT_IGNORES.has(name)) continue;

    const full = join(dir, name);
    const rel = relative(root, full);

    let stat;

    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walk(root, full, files, limit);
      continue;
    }

    const extension = extname(name) || "none";
    if (!CODE_EXTENSIONS.has(extension)) continue;

    let text = "";

    try {
      text = readFileSync(full, "utf8");
    } catch {
      continue;
    }

    const lines = text.split("\n").length;

    files.push({
      path: rel,
      extension,
      bytes: stat.size,
      lines,
      sha256: hashText(text),
      imports: extractImports(text),
      exports: extractExports(text),
      todos: extractTodos(text),
      functions: extractFunctions(text),
      textPreview: text.slice(0, 500)
    });
  }
}

export function extractImports(text) {
  const imports = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    const esm = trimmed.match(/^import\s+.*?from\s+["'](.+)["']/);
    const bare = trimmed.match(/^import\s+["'](.+)["']/);
    const req = trimmed.match(/require\(["'](.+)["']\)/);

    if (esm) imports.push(esm[1]);
    else if (bare) imports.push(bare[1]);
    else if (req) imports.push(req[1]);
  }

  return imports;
}

export function extractExports(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export "))
    .slice(0, 100);
}

export function extractTodos(text) {
  return text
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((item) => /TODO|FIXME|HACK|XXX/i.test(item.text));
}

export function extractFunctions(text) {
  const found = [];

  for (const line of text.split("\n")) {
    const fn = line.match(/(?:export\s+)?function\s+([a-zA-Z0-9_]+)/);
    const arrow = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/);

    if (fn) found.push(fn[1]);
    else if (arrow) found.push(arrow[1]);
  }

  return found.slice(0, 100);
}
