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
