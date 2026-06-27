import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

export function federationDir(paths) {
  return join(paths.repoRoot, ".forge", "federation");
}

export function peersDir(paths) {
  return join(federationDir(paths), "peers");
}

export function bundlesDir(paths) {
  return join(federationDir(paths), "bundles");
}

export function inboxDir(paths) {
  return join(federationDir(paths), "inbox");
}

export function outboxDir(paths) {
  return join(federationDir(paths), "outbox");
}

export function logsDir(paths) {
  return join(federationDir(paths), "logs");
}

export function nodeFile(paths) {
  return join(federationDir(paths), "node.json");
}

export function syncLogFile(paths) {
  return join(logsDir(paths), "sync-log.jsonl");
}

export function ensureFederationStore(paths) {
  mkdirSync(federationDir(paths), { recursive: true });
  mkdirSync(peersDir(paths), { recursive: true });
  mkdirSync(bundlesDir(paths), { recursive: true });
  mkdirSync(inboxDir(paths), { recursive: true });
  mkdirSync(outboxDir(paths), { recursive: true });
  mkdirSync(logsDir(paths), { recursive: true });
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function appendJsonl(file, value) {
  writeFileSync(file, JSON.stringify(value) + "\n", { flag: "a" });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hashObject(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function createNodeIdentity(paths, node = {}) {
  ensureFederationStore(paths);

  const existing = readNodeIdentity(paths);

  if (existing && !node.force) return existing;

  const id = normalizeId(node.id ?? `node-${crypto.randomBytes(6).toString("hex")}`);

  const next = {
    schema: "aift.forge.federation-node.v1",
    id,
    label: node.label ?? id,
    role: node.role ?? "local-forge-node",
    trustBoundary: node.trustBoundary ?? "local-user-owned",
    publicEndpoint: node.publicEndpoint ?? null,
    relayEndpoint: node.relayEndpoint ?? null,
    capabilities: node.capabilities ?? [
      "bundle-export",
      "bundle-import",
      "peer-registry",
      "append-only-sync-log"
    ],
    policies: node.policies ?? {
      localFirst: true,
      noCloudFallback: true,
      explicitPeerTrust: true,
      inspectableBundles: true,
      manualImportByDefault: true
    },
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(nodeFile(paths), next);
  logSync(paths, {
    type: "node.identity.write",
    nodeId: next.id,
    hash: hashObject(next)
  });

  return next;
}

export function readNodeIdentity(paths) {
  ensureFederationStore(paths);

  const file = nodeFile(paths);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function peerFile(paths, id) {
  return join(peersDir(paths), `${normalizeId(id)}.json`);
}

export function addPeer(paths, peer) {
  ensureFederationStore(paths);

  const id = normalizeId(peer.id);

  if (!id) throw new Error("Peer id is required.");

  const next = {
    schema: "aift.forge.federation-peer.v1",
    id,
    label: peer.label ?? id,
    trustLevel: peer.trustLevel ?? "manual",
    endpoint: peer.endpoint ?? null,
    publicKey: peer.publicKey ?? null,
    capabilities: peer.capabilities ?? [],
    enabled: peer.enabled ?? true,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(peerFile(paths, id), next);
  logSync(paths, {
    type: "peer.add",
    peerId: id,
    hash: hashObject(next)
  });

  return next;
}

export function readPeer(paths, id) {
  ensureFederationStore(paths);

  const file = peerFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listPeers(paths) {
  ensureFederationStore(paths);

  return readdirSync(peersDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(peersDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function updatePeer(paths, id, patch) {
  const existing = readPeer(paths, id);
  if (!existing) throw new Error(`Peer not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  writeJson(peerFile(paths, id), next);
  logSync(paths, {
    type: "peer.update",
    peerId: id,
    hash: hashObject(next)
  });

  return next;
}

export function logSync(paths, entry) {
  ensureFederationStore(paths);

  const next = {
    schema: "aift.forge.sync-log-entry.v1",
    id: `sync-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    ...entry,
    createdAt: new Date().toISOString()
  };

  appendJsonl(syncLogFile(paths), next);
  return next;
}

export function readSyncLog(paths) {
  ensureFederationStore(paths);

  const file = syncLogFile(paths);
  if (!existsSync(file)) return [];

  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
