import { scanRepository, readText } from "./scanner.mjs";
import { parseImports } from "./imports.mjs";

export function buildRepositoryGraph(root) {
  const files = scanRepository(root);
  const fileSet = new Set(files.map((file) => file.path));
  const imports = [];
  const missingImports = [];
  const todos = [];

  for (const file of files) {
    const text = readText(file);

    if (text.includes("TODO") || text.includes("FIXME") || text.includes("stub") || text.includes("placeholder")) {
      todos.push({
        file: file.path,
        hints: [...text.matchAll(/(TODO|FIXME|stub|placeholder).*/gi)].slice(0, 5).map((m) => m[0])
      });
    }

    const parsed = parseImports(file.path, text);
    imports.push(...parsed);

    for (const item of parsed) {
      if (!item.relative) continue;

      const found = item.possibleTargets.some((target) => fileSet.has(target));
      if (!found) {
        missingImports.push(item);
      }
    }
  }

  return {
    root,
    files,
    imports,
    missingImports,
    todos
  };
}
