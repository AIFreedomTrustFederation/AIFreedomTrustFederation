#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🧬 AIFT-Forge Phase 9: Distributed Knowledge Graph and Semantic Memory"

mkdir -p packages/forge-core/src/knowledge
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/knowledge/nodes
mkdir -p .forge/knowledge/edges
mkdir -p .forge/knowledge/observations
mkdir -p .forge/knowledge/indexes
mkdir -p .forge/knowledge/imports

cat > packages/forge-core/src/knowledge/store.mjs <<'JS'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

export function knowledgeDir(paths) {
  return join(paths.repoRoot, ".forge", "knowledge");
}

export function nodesDir(paths) {
  return join(knowledgeDir(paths), "nodes");
}

export function edgesDir(paths) {
  return join(knowledgeDir(paths), "edges");
}

export function observationsDir(paths) {
  return join(knowledgeDir(paths), "observations");
}

export function indexesDir(paths) {
  return join(knowledgeDir(paths), "indexes");
}

export function importsDir(paths) {
  return join(knowledgeDir(paths), "imports");
}

export function ensureKnowledgeStore(paths) {
  mkdirSync(knowledgeDir(paths), { recursive: true });
  mkdirSync(nodesDir(paths), { recursive: true });
  mkdirSync(edgesDir(paths), { recursive: true });
  mkdirSync(observationsDir(paths), { recursive: true });
  mkdirSync(indexesDir(paths), { recursive: true });
  mkdirSync(importsDir(paths), { recursive: true });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hashText(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function nodeFile(paths, id) {
  return join(nodesDir(paths), `${normalizeId(id)}.json`);
}

export function edgeFile(paths, id) {
  return join(edgesDir(paths), `${normalizeId(id)}.json`);
}

export function observationFile(paths, id) {
  return join(observationsDir(paths), `${normalizeId(id)}.json`);
}

export function indexFile(paths, name) {
  return join(indexesDir(paths), `${normalizeId(name)}.json`);
}

export function upsertNode(paths, node) {
  ensureKnowledgeStore(paths);

  const id = normalizeId(node.id ?? `${node.type ?? "thing"}:${node.label ?? Date.now()}`);

  if (!id) throw new Error("Knowledge node id is required.");

  const existing = existsSync(nodeFile(paths, id)) ? readJson(nodeFile(paths, id)) : null;

  const next = {
    schema: "aift.forge.knowledge-node.v1",
    id,
    type: node.type ?? existing?.type ?? "thing",
    label: node.label ?? existing?.label ?? id,
    summary: node.summary ?? existing?.summary ?? "",
    tags: node.tags ?? existing?.tags ?? [],
    aliases: node.aliases ?? existing?.aliases ?? [],
    sourceRefs: node.sourceRefs ?? existing?.sourceRefs ?? [],
    metadata: node.metadata ?? existing?.metadata ?? {},
    confidence: Number(node.confidence ?? existing?.confidence ?? 1),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(nodeFile(paths, id), next);
  return next;
}

export function readNode(paths, id) {
  ensureKnowledgeStore(paths);

  const file = nodeFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listNodes(paths) {
  ensureKnowledgeStore(paths);

  return readdirSync(nodesDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(nodesDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function createEdge(paths, edge) {
  ensureKnowledgeStore(paths);

  if (!edge.from) throw new Error("Knowledge edge from is required.");
  if (!edge.to) throw new Error("Knowledge edge to is required.");

  const relation = normalizeId(edge.relation ?? "related-to");
  const id = normalizeId(edge.id ?? `${edge.from}--${relation}--${edge.to}`);

  const next = {
    schema: "aift.forge.knowledge-edge.v1",
    id,
    from: normalizeId(edge.from),
    to: normalizeId(edge.to),
    relation,
    label: edge.label ?? relation,
    weight: Number(edge.weight ?? 1),
    confidence: Number(edge.confidence ?? 1),
    sourceRefs: edge.sourceRefs ?? [],
    metadata: edge.metadata ?? {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(edgeFile(paths, id), next);
  return next;
}

export function readEdge(paths, id) {
  ensureKnowledgeStore(paths);

  const file = edgeFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listEdges(paths) {
  ensureKnowledgeStore(paths);

  return readdirSync(edgesDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(edgesDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function createObservation(paths, observation) {
  ensureKnowledgeStore(paths);

  const body = observation.body ?? observation.text ?? "";
  const id = normalizeId(observation.id ?? `obs-${Date.now()}-${hashText(body).slice(0, 8)}`);

  const next = {
    schema: "aift.forge.knowledge-observation.v1",
    id,
    body,
    nodeIds: (observation.nodeIds ?? []).map(normalizeId),
    tags: observation.tags ?? [],
    source: observation.source ?? "manual",
    sourceRef: observation.sourceRef ?? null,
    provenance: observation.provenance ?? {
      createdBy: "local-user",
      method: "manual-entry"
    },
    confidence: Number(observation.confidence ?? 1),
    createdAt: new Date().toISOString()
  };

  writeJson(observationFile(paths, id), next);
  return next;
}

export function readObservation(paths, id) {
  ensureKnowledgeStore(paths);

  const file = observationFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listObservations(paths) {
  ensureKnowledgeStore(paths);

  return readdirSync(observationsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(observationsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function writeIndex(paths, name, value) {
  ensureKnowledgeStore(paths);

  const next = {
    schema: "aift.forge.knowledge-index.v1",
    name,
    ...value,
    updatedAt: new Date().toISOString()
  };

  writeJson(indexFile(paths, name), next);
  return next;
}

export function readIndex(paths, name) {
  ensureKnowledgeStore(paths);

  const file = indexFile(paths, name);
  if (!existsSync(file)) return null;

  return readJson(file);
}
JS

cat > packages/forge-core/src/knowledge/indexer.mjs <<'JS'
import {
  listEdges,
  listNodes,
  listObservations,
  readIndex,
  writeIndex
} from "./store.mjs";

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

export function unique(value) {
  return [...new Set(value)];
}

export function buildSearchText(record) {
  return [
    record.id,
    record.type,
    record.label,
    record.summary,
    ...(record.tags ?? []),
    ...(record.aliases ?? []),
    record.body,
    record.source,
    record.sourceRef
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildKnowledgeIndex(paths) {
  const nodes = listNodes(paths);
  const edges = listEdges(paths);
  const observations = listObservations(paths);

  const documents = [];

  for (const node of nodes) {
    documents.push({
      kind: "node",
      id: node.id,
      label: node.label,
      tokens: unique(tokenize(buildSearchText(node))),
      record: node
    });
  }

  for (const edge of edges) {
    documents.push({
      kind: "edge",
      id: edge.id,
      label: edge.label,
      tokens: unique(tokenize(buildSearchText(edge))),
      record: edge
    });
  }

  for (const observation of observations) {
    documents.push({
      kind: "observation",
      id: observation.id,
      label: observation.body.slice(0, 80),
      tokens: unique(tokenize(buildSearchText(observation))),
      record: observation
    });
  }

  const inverted = {};

  for (const doc of documents) {
    for (const token of doc.tokens) {
      inverted[token] ??= [];
      inverted[token].push({
        kind: doc.kind,
        id: doc.id
      });
    }
  }

  return writeIndex(paths, "text", {
    documentCount: documents.length,
    tokenCount: Object.keys(inverted).length,
    documents,
    inverted
  });
}

export function searchKnowledge(paths, query, options = {}) {
  const index = readIndex(paths, "text") ?? buildKnowledgeIndex(paths);
  const tokens = unique(tokenize(query));

  const scores = new Map();

  for (const token of tokens) {
    const hits = index.inverted?.[token] ?? [];

    for (const hit of hits) {
      const key = `${hit.kind}:${hit.id}`;
      scores.set(key, (scores.get(key) ?? 0) + 1);
    }
  }

  const docsByKey = new Map(
    (index.documents ?? []).map((doc) => [`${doc.kind}:${doc.id}`, doc])
  );

  return [...scores.entries()]
    .map(([key, score]) => ({
      score,
      ...docsByKey.get(key)
    }))
    .filter((item) => item.id)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, options.limit ?? 20);
}

export function relatedNodes(paths, nodeId) {
  const edges = listEdges(paths);
  const id = String(nodeId).toLowerCase();

  return edges
    .filter((edge) => edge.from === id || edge.to === id)
    .map((edge) => ({
      edge,
      relatedNodeId: edge.from === id ? edge.to : edge.from,
      direction: edge.from === id ? "out" : "in"
    }));
}
JS

cat > packages/forge-core/src/knowledge/importer.mjs <<'JS'
import {
  createEdge,
  createObservation,
  upsertNode
} from "./store.mjs";

export function importForgeRecords(paths, records = []) {
  const imported = {
    nodes: 0,
    edges: 0,
    observations: 0
  };

  for (const record of records) {
    if (!record || typeof record !== "object") continue;

    if (record.schema === "aift.forge.agent.v1") {
      upsertNode(paths, {
        id: `agent:${record.id}`,
        type: "agent",
        label: record.label ?? record.id,
        summary: record.systemPrompt ?? record.role ?? "",
        tags: ["agent", record.role].filter(Boolean),
        sourceRefs: [`.forge/agents/${record.id}.json`],
        metadata: {
          model: record.model,
          providerId: record.providerId
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.workflow.v1") {
      upsertNode(paths, {
        id: `workflow:${record.id}`,
        type: "workflow",
        label: record.title ?? record.id,
        summary: record.description ?? "",
        tags: ["workflow"],
        sourceRefs: [`.forge/workflows/${record.id}.json`],
        metadata: {
          steps: record.steps?.length ?? 0
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.team.v1") {
      upsertNode(paths, {
        id: `team:${record.id}`,
        type: "team",
        label: record.title ?? record.id,
        summary: record.description ?? "",
        tags: ["team", "collaboration"],
        sourceRefs: [`.forge/teams/${record.id}.json`],
        metadata: {
          members: record.members?.length ?? 0
        }
      });
      imported.nodes += 1;

      for (const member of record.members ?? []) {
        createEdge(paths, {
          from: `team:${record.id}`,
          to: `agent:${member.agentId}`,
          relation: "has-member",
          label: "has member",
          metadata: {
            role: member.role
          }
        });
        imported.edges += 1;
      }
    }

    if (record.schema === "aift.forge.local-model.v1") {
      upsertNode(paths, {
        id: `model:${record.id}`,
        type: "model",
        label: record.name ?? record.id,
        summary: `Local model from provider ${record.providerId ?? "unknown"}`,
        tags: ["model", ...(record.tags ?? [])],
        sourceRefs: [`.forge/models/${record.id}.json`],
        metadata: {
          providerId: record.providerId,
          capabilities: record.capabilities
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.federation-node.v1") {
      upsertNode(paths, {
        id: `federation-node:${record.id}`,
        type: "federation-node",
        label: record.label ?? record.id,
        summary: record.trustBoundary ?? "",
        tags: ["federation", "node"],
        sourceRefs: [".forge/federation/node.json"],
        metadata: {
          capabilities: record.capabilities
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.knowledge-observation.v1") {
      createObservation(paths, record);
      imported.observations += 1;
    }
  }

  return imported;
}
JS

cat > packages/forge-core/src/knowledge/scan.mjs <<'JS'
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
      const stat = require("node:fs").statSync(full);

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
JS

python3 - <<'PY'
from pathlib import Path
p = Path("packages/forge-core/src/knowledge/scan.mjs")
s = p.read_text()
s = s.replace('import { existsSync, readdirSync, readFileSync } from "node:fs";', 'import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";')
s = s.replace("""    try {
      const stat = require("node:fs").statSync(full);

      if (stat.isDirectory()) walkJsonFiles(full, out);
      else if (name.endsWith(".json")) out.push(full);
    } catch {
      // ignore inaccessible path
    }
""", """    try {
      const stat = statSync(full);

      if (stat.isDirectory()) walkJsonFiles(full, out);
      else if (name.endsWith(".json")) out.push(full);
    } catch {
      // ignore inaccessible path
    }
""")
p.write_text(s)
PY

cat > packages/forge-core/src/commands/knowledge.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  createEdge,
  createObservation,
  listEdges,
  listNodes,
  listObservations,
  readNode,
  upsertNode
} from "../knowledge/store.mjs";
import {
  buildKnowledgeIndex,
  relatedNodes,
  searchKnowledge
} from "../knowledge/indexer.mjs";
import { scanForgeKnowledge } from "../knowledge/scan.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function csv(value, fallback = []) {
  if (!value) return fallback;

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function knowledge(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  if (action === "status") {
    const nodes = listNodes(paths);
    const edges = listEdges(paths);
    const observations = listObservations(paths);

    console.log("🧬 Forge Knowledge Graph");
    console.log("");
    console.log(`nodes: ${nodes.length}`);
    console.log(`edges: ${edges.length}`);
    console.log(`observations: ${observations.length}`);
    return;
  }

  if (action === "node-add") {
    const id = args[1];
    const type = readFlag(args, "--type", "thing");
    const label = readFlag(args, "--label", id);
    const summary = readFlag(args, "--summary", "");
    const tags = csv(readFlag(args, "--tags", ""));

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge knowledge node-add project:aift-forge --type project --label \"AIFT-Forge\"");
      return;
    }

    const node = upsertNode(paths, {
      id,
      type,
      label,
      summary,
      tags
    });

    console.log("✅ Knowledge node saved");
    console.log(`id: ${node.id}`);
    console.log(`type: ${node.type}`);
    console.log(`label: ${node.label}`);
    return;
  }

  if (action === "node-show") {
    const id = args[1];
    const node = readNode(paths, id);

    if (!node) {
      console.log(`❌ Node not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(node, null, 2));
    return;
  }

  if (action === "nodes") {
    const nodes = listNodes(paths);

    console.log("🧩 Knowledge Nodes");
    console.log("");

    if (nodes.length === 0) {
      console.log("No nodes yet.");
      return;
    }

    for (const node of nodes) {
      console.log(`✅ ${node.id} — ${node.label}`);
      console.log(`   type: ${node.type}`);
      console.log(`   tags: ${(node.tags ?? []).join(", ") || "none"}`);
    }

    return;
  }

  if (action === "edge-add") {
    const from = readFlag(args, "--from");
    const to = readFlag(args, "--to");
    const relation = readFlag(args, "--relation", "related-to");
    const label = readFlag(args, "--label", relation);

    if (!from || !to) {
      console.log("Usage:");
      console.log("  aift-forge knowledge edge-add --from project:aift-forge --to agent:steward --relation uses");
      return;
    }

    const edge = createEdge(paths, {
      from,
      to,
      relation,
      label
    });

    console.log("✅ Knowledge edge saved");
    console.log(`id: ${edge.id}`);
    console.log(`${edge.from} --${edge.relation}--> ${edge.to}`);
    return;
  }

  if (action === "edges") {
    const edges = listEdges(paths);

    console.log("🔗 Knowledge Edges");
    console.log("");

    if (edges.length === 0) {
      console.log("No edges yet.");
      return;
    }

    for (const edge of edges) {
      console.log(`🔗 ${edge.from} --${edge.relation}--> ${edge.to}`);
    }

    return;
  }

  if (action === "observe") {
    const body = args.slice(1).join(" ").trim();
    const nodeIds = csv(readFlag(args, "--nodes", ""));
    const tags = csv(readFlag(args, "--tags", ""));

    if (!body) {
      console.log("Usage:");
      console.log("  aift-forge knowledge observe \"Forge needs local-first memory.\" --nodes project:aift-forge --tags memory");
      return;
    }

    const observation = createObservation(paths, {
      body,
      nodeIds,
      tags
    });

    console.log("✅ Observation saved");
    console.log(`id: ${observation.id}`);
    return;
  }

  if (action === "observations") {
    const observations = listObservations(paths).slice(0, 25);

    console.log("👁️ Knowledge Observations");
    console.log("");

    if (observations.length === 0) {
      console.log("No observations yet.");
      return;
    }

    for (const observation of observations) {
      console.log(`👁️ ${observation.id}`);
      console.log(`   ${observation.body}`);
    }

    return;
  }

  if (action === "index") {
    const index = buildKnowledgeIndex(paths);

    console.log("✅ Knowledge index rebuilt");
    console.log(`documents: ${index.documentCount}`);
    console.log(`tokens: ${index.tokenCount}`);
    return;
  }

  if (action === "scan") {
    const result = scanForgeKnowledge(paths);

    console.log("✅ Forge knowledge scan complete");
    console.log(`records scanned: ${result.records}`);
    console.log(`nodes imported: ${result.imported.nodes}`);
    console.log(`edges imported: ${result.imported.edges}`);
    console.log(`observations imported: ${result.imported.observations}`);
    console.log(`index documents: ${result.index.documentCount}`);
    console.log(`index tokens: ${result.index.tokenCount}`);
    return;
  }

  if (action === "search") {
    const query = args.slice(1).join(" ").trim();

    if (!query) {
      console.log("Usage:");
      console.log("  aift-forge knowledge search \"agent workflow\"");
      return;
    }

    const results = searchKnowledge(paths, query);

    console.log("🔎 Knowledge Search");
    console.log("");

    if (results.length === 0) {
      console.log("No results.");
      return;
    }

    for (const result of results) {
      console.log(`✅ [${result.kind}] ${result.id}`);
      console.log(`   score: ${result.score}`);
      console.log(`   label: ${result.label}`);
    }

    return;
  }

  if (action === "related") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge knowledge related project:aift-forge");
      return;
    }

    const results = relatedNodes(paths, id);

    console.log(`🔗 Related to ${id}`);
    console.log("");

    if (results.length === 0) {
      console.log("No related nodes.");
      return;
    }

    for (const result of results) {
      console.log(`${result.direction === "out" ? "→" : "←"} ${result.relatedNodeId}`);
      console.log(`   relation: ${result.edge.relation}`);
    }

    return;
  }

  console.log("Forge Knowledge Graph and Semantic Memory");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge knowledge status");
  console.log("  aift-forge knowledge node-add project:aift-forge --type project --label \"AIFT-Forge\"");
  console.log("  aift-forge knowledge edge-add --from project:aift-forge --to agent:steward --relation uses");
  console.log("  aift-forge knowledge observe \"Forge needs local-first memory.\" --nodes project:aift-forge");
  console.log("  aift-forge knowledge scan");
  console.log("  aift-forge knowledge index");
  console.log("  aift-forge knowledge search \"workflow agent\"");
  console.log("  aift-forge knowledge related project:aift-forge");
}
JS

cat > scripts/aift-knowledge-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  createEdge,
  createObservation,
  listEdges,
  listNodes,
  listObservations,
  readNode,
  upsertNode
} from "../packages/forge-core/src/knowledge/store.mjs";
import {
  buildKnowledgeIndex,
  relatedNodes,
  searchKnowledge,
  tokenize
} from "../packages/forge-core/src/knowledge/indexer.mjs";
import { scanForgeKnowledge } from "../packages/forge-core/src/knowledge/scan.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/knowledge", { recursive: true, force: true });

assert.deepEqual(tokenize("Hello, Forge Agent!"), ["hello", "forge", "agent"]);

const project = upsertNode(paths, {
  id: "project:aift-forge",
  type: "project",
  label: "AIFT-Forge",
  summary: "Local-first sovereign AI forge",
  tags: ["forge", "ai", "local-first"]
});

assert.equal(project.id, "project:aift-forge");

const agent = upsertNode(paths, {
  id: "agent:steward",
  type: "agent",
  label: "Forge Steward",
  summary: "Steward agent",
  tags: ["agent"]
});

assert.equal(readNode(paths, "agent:steward").label, "Forge Steward");

const edge = createEdge(paths, {
  from: project.id,
  to: agent.id,
  relation: "uses",
  label: "uses"
});

assert.equal(edge.from, "project:aift-forge");

const observation = createObservation(paths, {
  body: "AIFT-Forge needs semantic memory and graph search.",
  nodeIds: [project.id],
  tags: ["memory", "graph"]
});

assert.ok(observation.id.startsWith("obs-"));

const index = buildKnowledgeIndex(paths);
assert.ok(index.documentCount >= 3);

const results = searchKnowledge(paths, "semantic memory forge");
assert.ok(results.length >= 1);

const related = relatedNodes(paths, project.id);
assert.ok(related.some((item) => item.relatedNodeId === "agent:steward"));

assert.ok(listNodes(paths).length >= 2);
assert.ok(listEdges(paths).length >= 1);
assert.ok(listObservations(paths).length >= 1);

const scan = scanForgeKnowledge(paths);
assert.ok(scan.records >= 0);

console.log("✅ Knowledge graph and semantic memory smoke test passed.");
JS

cat > docs/KNOWLEDGE_GRAPH_PHASE_9.md <<'MD'
# AIFT-Forge Phase 9: Distributed Knowledge Graph and Semantic Memory

Phase 9 adds a local knowledge graph and semantic memory foundation.

This is the first layer of the long-term Mind of All memory system.

## Storage

Knowledge records live under:

    .forge/knowledge/

Subdirectories:

    nodes/
    edges/
    observations/
    indexes/
    imports/

## Node

A node represents an entity:

- project
- agent
- workflow
- team
- model
- federation node
- trust
- document
- concept

## Edge

An edge represents a relationship:

    project:aift-forge --uses--> agent:steward

## Observation

An observation is a memory or statement with provenance:

- body
- node IDs
- tags
- source
- source reference
- confidence
- provenance

## Index

The first index is a portable local text index.

It avoids native vector dependencies so it works on Android/Termux.

Future phases can add embeddings through the provider registry.

## Commands

Status:

    aift-forge knowledge status

Add a node:

    aift-forge knowledge node-add project:aift-forge --type project --label "AIFT-Forge"

Add an edge:

    aift-forge knowledge edge-add --from project:aift-forge --to agent:steward --relation uses

Add an observation:

    aift-forge knowledge observe "Forge needs local-first memory." --nodes project:aift-forge --tags memory

Scan existing Forge records:

    aift-forge knowledge scan

Rebuild index:

    aift-forge knowledge index

Search:

    aift-forge knowledge search "workflow agent"

Related nodes:

    aift-forge knowledge related project:aift-forge

## Governance

The knowledge graph is:

- local-first
- JSON-backed
- inspectable
- portable
- Android/Termux-compatible
- no cloud fallback
- provenance-aware
- federation-ready
MD

node --check packages/forge-core/src/knowledge/store.mjs
node --check packages/forge-core/src/knowledge/indexer.mjs
node --check packages/forge-core/src/knowledge/importer.mjs
node --check packages/forge-core/src/knowledge/scan.mjs
node --check packages/forge-core/src/commands/knowledge.mjs
node --check scripts/aift-knowledge-smoke.mjs
node scripts/aift-knowledge-smoke.mjs

echo ""
echo "✅ Phase 9 Distributed Knowledge Graph and Semantic Memory complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  knowledge -> packages/forge-core/src/commands/knowledge.mjs"
echo ""
echo "Then test:"
echo "  aift-forge knowledge status"
echo "  aift-forge knowledge scan"
echo "  aift-forge knowledge search \"workflow agent\""
echo "  aift-forge knowledge related project:aift-forge"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 9 knowledge graph and semantic memory\""
echo "  git push origin main"
