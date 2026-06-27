#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🌐 AIFT-Forge Phase 7: Federation Synchronization Foundation"

mkdir -p packages/forge-core/src/federation
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/federation/peers
mkdir -p .forge/federation/bundles
mkdir -p .forge/federation/inbox
mkdir -p .forge/federation/outbox
mkdir -p .forge/federation/logs

cat > packages/forge-core/src/federation/store.mjs <<'JS'
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
JS

cat > packages/forge-core/src/federation/bundles.mjs <<'JS'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { basename, join } from "node:path";
import crypto from "node:crypto";
import {
  bundlesDir,
  ensureFederationStore,
  hashObject,
  inboxDir,
  logSync,
  outboxDir,
  readNodeIdentity
} from "./store.mjs";

const EXPORT_DIRS = [
  ".forge/agents",
  ".forge/tasks",
  ".forge/workflows",
  ".forge/workflow-runs",
  ".forge/scheduler",
  ".forge/teams",
  ".forge/team-runs",
  ".forge/providers"
];

function walkJsonFiles(dir, out = []) {
  if (!existsSync(dir)) return out;

  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = fsStatSafe(full);

    if (!stat) continue;

    if (stat.isDirectory()) walkJsonFiles(full, out);
    else if (name.endsWith(".json")) out.push(full);
  }

  return out;
}

function fsStatSafe(file) {
  try {
    return requireFs().statSync(file);
  } catch {
    return null;
  }
}

function requireFs() {
  return globalThis.__aiftFs ??= {
    statSync: (...args) => {
      const { statSync } = require("node:fs");
      return statSync(...args);
    }
  };
}

export function collectBundleRecords(paths, dirs = EXPORT_DIRS) {
  const records = [];

  for (const dir of dirs) {
    const absolute = join(paths.repoRoot, dir);
    const files = walkJsonFiles(absolute);

    for (const file of files) {
      const raw = readFileSync(file, "utf8");
      let json = null;

      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }

      const relativePath = file.replace(`${paths.repoRoot}/`, "");

      records.push({
        path: relativePath,
        name: basename(file),
        sha256: crypto.createHash("sha256").update(raw).digest("hex"),
        json
      });
    }
  }

  return records.sort((a, b) => a.path.localeCompare(b.path));
}

export function createExportBundle(paths, options = {}) {
  ensureFederationStore(paths);

  const node = readNodeIdentity(paths);
  const records = collectBundleRecords(paths, options.dirs);

  const bundle = {
    schema: "aift.forge.sync-bundle.v1",
    id: options.id ?? `bundle-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    sourceNodeId: node?.id ?? null,
    label: options.label ?? "Manual Forge sync bundle",
    mode: options.mode ?? "manual-export",
    records,
    recordCount: records.length,
    createdAt: new Date().toISOString()
  };

  bundle.sha256 = hashObject(bundle);

  const file = join(options.outDir ?? outboxDir(paths), `${bundle.id}.json`);
  mkdirSync(options.outDir ?? outboxDir(paths), { recursive: true });
  writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");

  logSync(paths, {
    type: "bundle.export",
    bundleId: bundle.id,
    recordCount: bundle.recordCount,
    hash: bundle.sha256
  });

  return {
    file,
    bundle
  };
}

export function importBundle(paths, file, options = {}) {
  ensureFederationStore(paths);

  const bundle = JSON.parse(readFileSync(file, "utf8"));

  if (bundle.schema !== "aift.forge.sync-bundle.v1") {
    throw new Error("Unsupported bundle schema.");
  }

  const storedFile = join(inboxDir(paths), `${bundle.id}.json`);
  writeFileSync(storedFile, JSON.stringify(bundle, null, 2) + "\n");

  const result = {
    bundleId: bundle.id,
    sourceNodeId: bundle.sourceNodeId,
    recordCount: bundle.recordCount ?? bundle.records?.length ?? 0,
    storedFile,
    applied: false,
    appliedRecords: 0
  };

  if (options.apply) {
    for (const record of bundle.records ?? []) {
      if (!record.path?.startsWith(".forge/")) continue;

      const target = join(paths.repoRoot, record.path);
      mkdirSync(target.split("/").slice(0, -1).join("/"), { recursive: true });
      writeFileSync(target, JSON.stringify(record.json, null, 2) + "\n");
      result.appliedRecords += 1;
    }

    result.applied = true;
  }

  logSync(paths, {
    type: options.apply ? "bundle.import.apply" : "bundle.import.store",
    bundleId: bundle.id,
    sourceNodeId: bundle.sourceNodeId,
    recordCount: result.recordCount,
    appliedRecords: result.appliedRecords
  });

  return result;
}

export function listBundles(paths) {
  ensureFederationStore(paths);

  const dirs = [bundlesDir(paths), inboxDir(paths), outboxDir(paths)];
  const results = [];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;

      const full = join(dir, file);

      try {
        const bundle = JSON.parse(readFileSync(full, "utf8"));
        if (bundle.schema === "aift.forge.sync-bundle.v1") {
          results.push({
            id: bundle.id,
            sourceNodeId: bundle.sourceNodeId,
            recordCount: bundle.recordCount,
            createdAt: bundle.createdAt,
            file: full.replace(`${paths.repoRoot}/`, "")
          });
        }
      } catch {
        // ignore invalid bundle files
      }
    }
  }

  return results.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
JS

python3 - <<'PY'
from pathlib import Path
p = Path("packages/forge-core/src/federation/bundles.mjs")
s = p.read_text()
s = s.replace('import {\n  existsSync,\n  mkdirSync,\n  readdirSync,\n  readFileSync,\n  writeFileSync\n} from "node:fs";', 'import {\n  existsSync,\n  mkdirSync,\n  readdirSync,\n  readFileSync,\n  statSync,\n  writeFileSync\n} from "node:fs";')
s = s.replace("""function fsStatSafe(file) {
  try {
    return requireFs().statSync(file);
  } catch {
    return null;
  }
}

function requireFs() {
  return globalThis.__aiftFs ??= {
    statSync: (...args) => {
      const { statSync } = require("node:fs");
      return statSync(...args);
    }
  };
}
""", """function fsStatSafe(file) {
  try {
    return statSync(file);
  } catch {
    return null;
  }
}
""")
p.write_text(s)
PY

cat > packages/forge-core/src/commands/federation.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  addPeer,
  createNodeIdentity,
  listPeers,
  readNodeIdentity,
  readSyncLog,
  updatePeer
} from "../federation/store.mjs";
import {
  createExportBundle,
  importBundle,
  listBundles
} from "../federation/bundles.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

export default async function federation(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  if (action === "init") {
    const id = readFlag(args, "--id", undefined);
    const label = readFlag(args, "--label", id);
    const node = createNodeIdentity(paths, { id, label });

    console.log("✅ Federation node initialized");
    console.log(`id: ${node.id}`);
    console.log(`label: ${node.label}`);
    return;
  }

  if (action === "status") {
    const node = readNodeIdentity(paths);

    console.log("🌐 Forge Federation Status");
    console.log("");

    if (!node) {
      console.log("No local federation node identity yet.");
      console.log("Initialize one:");
      console.log("  aift-forge federation init --id my-node --label \"My Forge Node\"");
      return;
    }

    console.log(`node: ${node.id}`);
    console.log(`label: ${node.label}`);
    console.log(`trustBoundary: ${node.trustBoundary}`);
    console.log(`capabilities: ${node.capabilities.join(", ")}`);
    console.log("");
    console.log(`peers: ${listPeers(paths).length}`);
    console.log(`bundles: ${listBundles(paths).length}`);
    console.log(`syncLog: ${readSyncLog(paths).length} entries`);
    return;
  }

  if (action === "peer-add") {
    const id = args[1];
    const label = readFlag(args, "--label", id);
    const endpoint = readFlag(args, "--endpoint", null);
    const trustLevel = readFlag(args, "--trust", "manual");

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge federation peer-add family-node --label \"Family Node\"");
      return;
    }

    const peer = addPeer(paths, {
      id,
      label,
      endpoint,
      trustLevel
    });

    console.log("✅ Peer added");
    console.log(`id: ${peer.id}`);
    console.log(`label: ${peer.label}`);
    console.log(`trust: ${peer.trustLevel}`);
    return;
  }

  if (action === "peers") {
    const peers = listPeers(paths);

    console.log("🤝 Federation Peers");
    console.log("");

    if (peers.length === 0) {
      console.log("No peers yet.");
      return;
    }

    for (const peer of peers) {
      console.log(`${peer.enabled ? "✅" : "⬜"} ${peer.id} — ${peer.label}`);
      console.log(`   trust: ${peer.trustLevel}`);
      console.log(`   endpoint: ${peer.endpoint ?? "none"}`);
    }

    return;
  }

  if (action === "peer-enable") {
    const id = args[1];
    const peer = updatePeer(paths, id, { enabled: true });
    console.log(`✅ Enabled peer: ${peer.id}`);
    return;
  }

  if (action === "peer-disable") {
    const id = args[1];
    const peer = updatePeer(paths, id, { enabled: false });
    console.log(`⬜ Disabled peer: ${peer.id}`);
    return;
  }

  if (action === "export") {
    const label = readFlag(args, "--label", "Manual Forge sync bundle");
    const result = createExportBundle(paths, { label });

    console.log("✅ Federation bundle exported");
    console.log(`id: ${result.bundle.id}`);
    console.log(`records: ${result.bundle.recordCount}`);
    console.log(`file: ${result.file.replace(`${paths.repoRoot}/`, "")}`);
    return;
  }

  if (action === "import") {
    const file = args[1];
    const apply = args.includes("--apply");

    if (!file) {
      console.log("Usage:");
      console.log("  aift-forge federation import .forge/federation/outbox/bundle-id.json");
      console.log("  aift-forge federation import ./bundle.json --apply");
      return;
    }

    const result = importBundle(paths, file, { apply });

    console.log("✅ Federation bundle imported");
    console.log(`id: ${result.bundleId}`);
    console.log(`source: ${result.sourceNodeId ?? "unknown"}`);
    console.log(`records: ${result.recordCount}`);
    console.log(`applied: ${result.applied}`);
    console.log(`appliedRecords: ${result.appliedRecords}`);
    return;
  }

  if (action === "bundles") {
    const bundles = listBundles(paths);

    console.log("📦 Federation Bundles");
    console.log("");

    if (bundles.length === 0) {
      console.log("No bundles yet.");
      return;
    }

    for (const bundle of bundles) {
      console.log(`📦 ${bundle.id}`);
      console.log(`   source: ${bundle.sourceNodeId ?? "unknown"}`);
      console.log(`   records: ${bundle.recordCount}`);
      console.log(`   file: ${bundle.file}`);
    }

    return;
  }

  if (action === "log") {
    const entries = readSyncLog(paths).slice(-25);

    console.log("📜 Federation Sync Log");
    console.log("");

    if (entries.length === 0) {
      console.log("No sync log entries.");
      return;
    }

    for (const entry of entries) {
      console.log(`${entry.createdAt} ${entry.type}`);
      console.log(`   id: ${entry.id}`);
      if (entry.peerId) console.log(`   peer: ${entry.peerId}`);
      if (entry.bundleId) console.log(`   bundle: ${entry.bundleId}`);
    }

    return;
  }

  console.log("Forge Federation Synchronization");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge federation status");
  console.log("  aift-forge federation init --id my-node --label \"My Forge Node\"");
  console.log("  aift-forge federation peer-add family-node --label \"Family Node\"");
  console.log("  aift-forge federation peers");
  console.log("  aift-forge federation export --label \"Manual backup\"");
  console.log("  aift-forge federation bundles");
  console.log("  aift-forge federation import ./bundle.json");
  console.log("  aift-forge federation log");
}
JS

cat > scripts/aift-federation-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  addPeer,
  createNodeIdentity,
  listPeers,
  readNodeIdentity,
  readSyncLog
} from "../packages/forge-core/src/federation/store.mjs";
import {
  createExportBundle,
  importBundle,
  listBundles
} from "../packages/forge-core/src/federation/bundles.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/federation", { recursive: true, force: true });

const node = createNodeIdentity(paths, {
  id: "test-node",
  label: "Test Node",
  force: true
});

assert.equal(node.id, "test-node");

const readNode = readNodeIdentity(paths);
assert.equal(readNode.label, "Test Node");

const peer = addPeer(paths, {
  id: "test-peer",
  label: "Test Peer"
});

assert.equal(peer.id, "test-peer");

const peers = listPeers(paths);
assert.ok(peers.some((item) => item.id === "test-peer"));

const exported = createExportBundle(paths, {
  label: "Smoke Bundle"
});

assert.ok(exported.bundle.recordCount >= 1);

const imported = importBundle(paths, exported.file, {
  apply: false
});

assert.equal(imported.bundleId, exported.bundle.id);

const bundles = listBundles(paths);
assert.ok(bundles.some((item) => item.id === exported.bundle.id));

const log = readSyncLog(paths);
assert.ok(log.length >= 3);

console.log("✅ Federation smoke test passed.");
JS

cat > docs/FEDERATION_SYNC_PHASE_7.md <<'MD'
# AIFT-Forge Phase 7: Federation Synchronization Foundation

Phase 7 adds a local-first federation synchronization foundation.

This is not cloud sync. It is an inspectable bundle exchange model for sovereign Forge nodes.

## Storage

Federation records live under:

    .forge/federation/

Subdirectories:

    peers/
    bundles/
    inbox/
    outbox/
    logs/

## Node Identity

Initialize a local node:

    aift-forge federation init --id my-node --label "My Forge Node"

Show status:

    aift-forge federation status

## Peers

Add a trusted/manual peer:

    aift-forge federation peer-add family-node --label "Family Node"

List peers:

    aift-forge federation peers

Enable or disable peers:

    aift-forge federation peer-enable family-node
    aift-forge federation peer-disable family-node

## Bundles

Export a bundle:

    aift-forge federation export --label "Manual backup"

List bundles:

    aift-forge federation bundles

Import a bundle without applying records:

    aift-forge federation import ./bundle.json

Import and apply records:

    aift-forge federation import ./bundle.json --apply

## Sync Log

Show recent sync log entries:

    aift-forge federation log

## Governance

The federation sync foundation is:

- local-first
- explicit
- inspectable
- bundle-based
- peer-registry based
- no cloud fallback
- no silent network synchronization
- manual import by default
- append-only sync log
MD

node --check packages/forge-core/src/federation/store.mjs
node --check packages/forge-core/src/federation/bundles.mjs
node --check packages/forge-core/src/commands/federation.mjs
node --check scripts/aift-federation-smoke.mjs
node scripts/aift-federation-smoke.mjs

echo ""
echo "✅ Phase 7 Federation Synchronization Foundation complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  federation -> packages/forge-core/src/commands/federation.mjs"
echo ""
echo "Then test:"
echo "  aift-forge federation status"
echo "  aift-forge federation init --id my-node --label \"My Forge Node\""
echo "  aift-forge federation export --label \"Manual backup\""
echo "  aift-forge federation bundles"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 7 federation synchronization foundation\""
echo "  git push origin main"
