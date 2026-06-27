import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
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
    return statSync(file);
  } catch {
    return null;
  }
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
