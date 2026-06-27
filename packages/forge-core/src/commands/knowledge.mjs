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
