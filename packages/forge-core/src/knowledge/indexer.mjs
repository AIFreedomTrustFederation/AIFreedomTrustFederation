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
