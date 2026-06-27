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
