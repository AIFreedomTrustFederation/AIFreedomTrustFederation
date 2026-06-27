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
