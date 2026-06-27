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
