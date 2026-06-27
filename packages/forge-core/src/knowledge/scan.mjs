import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { importForgeRecords } from "./importer.mjs";
import { buildKnowledgeIndex } from "./indexer.mjs";

const SCAN_DIRS = [
  ".forge/agents",
  ".forge/workflows",
  ".forge/teams",
  ".forge/models",
  ".forge/federation"
];

function walkJsonFiles(dir, out = []) {
  if (!existsSync(dir)) return out;

  for (const name of readdirSync(dir)) {
    const full = join(dir, name);

    try {
      const stat = statSync(full);

      if (stat.isDirectory()) walkJsonFiles(full, out);
      else if (name.endsWith(".json")) out.push(full);
    } catch {
      // ignore inaccessible path
    }
  }

  return out;
}

export function scanForgeKnowledge(paths, dirs = SCAN_DIRS) {
  const records = [];

  for (const dir of dirs) {
    const absolute = join(paths.repoRoot, dir);

    for (const file of walkJsonFiles(absolute)) {
      try {
        records.push(JSON.parse(readFileSync(file, "utf8")));
      } catch {
        // ignore invalid JSON
      }
    }
  }

  const imported = importForgeRecords(paths, records);
  const index = buildKnowledgeIndex(paths);

  return {
    records: records.length,
    imported,
    index: {
      documentCount: index.documentCount,
      tokenCount: index.tokenCount
    }
  };
}
