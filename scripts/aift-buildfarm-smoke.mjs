import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  createJob,
  createWorker,
  listArtifacts,
  listJobs,
  listRuns,
  listWorkers,
  readJob
} from "../packages/forge-core/src/buildfarm/store.mjs";
import {
  ensureLocalWorker,
  runJob,
  selectWorker
} from "../packages/forge-core/src/buildfarm/runtime.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/build-farm", { recursive: true, force: true });

const worker = ensureLocalWorker(paths);
assert.equal(worker.id, "local-worker");

createWorker(paths, {
  id: "test-worker",
  capabilities: ["node", "npm"]
});

const job = createJob(paths, {
  id: "test-build-job",
  title: "Test Build Job",
  requiredCapabilities: ["node"],
  steps: [
    {
      id: "note",
      type: "note",
      text: "Testing build farm."
    },
    {
      id: "store-check",
      type: "node-check",
      path: "packages/forge-core/src/buildfarm/store.mjs"
    }
  ]
});

assert.equal(readJob(paths, job.id).id, job.id);

const selected = selectWorker(paths, job);
assert.ok(selected);

const result = await runJob(paths, job.id);

assert.equal(result.ok, true);
assert.ok(result.runId);
assert.ok(listWorkers(paths).length >= 1);
assert.ok(listJobs(paths).length >= 1);
assert.ok(listRuns(paths).length >= 1);
assert.ok(listArtifacts(paths).length >= 1);

console.log("✅ Autonomous build farm smoke test passed.");
