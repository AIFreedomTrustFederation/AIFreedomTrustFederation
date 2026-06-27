import { getForgePaths } from "../lib/paths.mjs";
import {
  createJob,
  createWorker,
  listArtifacts,
  listJobs,
  listRuns,
  listWorkers,
  readJob,
  readRun,
  readWorker,
  updateJob,
  updateWorker
} from "../buildfarm/store.mjs";
import {
  createStandardValidationJob,
  ensureLocalWorker,
  runJob,
  runNextJob
} from "../buildfarm/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function csv(value, fallback = []) {
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default async function buildfarm(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  if (action === "init") {
    const worker = ensureLocalWorker(paths);

    console.log("✅ Build farm initialized");
    console.log(`worker: ${worker.id}`);
    console.log(`platform: ${worker.platform}`);
    console.log(`arch: ${worker.arch}`);
    return;
  }

  if (action === "status") {
    ensureLocalWorker(paths);

    console.log("🏗️ Forge Build Farm");
    console.log("");
    console.log(`workers: ${listWorkers(paths).length}`);
    console.log(`jobs: ${listJobs(paths).length}`);
    console.log(`runs: ${listRuns(paths).length}`);
    console.log(`artifacts: ${listArtifacts(paths).length}`);
    return;
  }

  if (action === "worker-add") {
    const id = args[1];
    const label = readFlag(args, "--label", id);
    const capabilities = csv(readFlag(args, "--capabilities", "node,npm,syntax-check,test,lint,build"));

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge buildfarm worker-add local-worker --capabilities node,npm,test");
      return;
    }

    const worker = createWorker(paths, {
      id,
      label,
      capabilities
    });

    console.log("✅ Worker added");
    console.log(`id: ${worker.id}`);
    console.log(`capabilities: ${worker.capabilities.join(", ")}`);
    return;
  }

  if (action === "workers") {
    const workers = listWorkers(paths);

    console.log("👷 Build Workers");
    console.log("");

    if (workers.length === 0) {
      console.log("No workers yet.");
      return;
    }

    for (const worker of workers) {
      console.log(`${worker.enabled ? "✅" : "⬜"} ${worker.id} — ${worker.label}`);
      console.log(`   status: ${worker.status}`);
      console.log(`   platform: ${worker.platform}/${worker.arch}`);
      console.log(`   capabilities: ${(worker.capabilities ?? []).join(", ")}`);
    }

    return;
  }

  if (action === "worker-show") {
    const id = args[1];
    const worker = readWorker(paths, id);

    if (!worker) {
      console.log(`❌ Worker not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(worker, null, 2));
    return;
  }

  if (action === "worker-enable") {
    const id = args[1];
    const worker = updateWorker(paths, id, { enabled: true, status: "available" });

    console.log(`✅ Worker enabled: ${worker.id}`);
    return;
  }

  if (action === "worker-disable") {
    const id = args[1];
    const worker = updateWorker(paths, id, { enabled: false, status: "disabled" });

    console.log(`⬜ Worker disabled: ${worker.id}`);
    return;
  }

  if (action === "job-create") {
    const id = args[1];
    const title = readFlag(args, "--title", id);
    const script = readFlag(args, "--script", null);

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge buildfarm job-create test-job --script test");
      return;
    }

    const steps = script
      ? [
          {
            id: `npm-${script}`,
            type: "npm-script",
            script
          }
        ]
      : [
          {
            id: "note",
            type: "note",
            text: "Manual build job created."
          }
        ];

    const job = createJob(paths, {
      id,
      title,
      requiredCapabilities: script ? ["node", "npm"] : [],
      steps
    });

    console.log("✅ Job created");
    console.log(`id: ${job.id}`);
    console.log(`steps: ${job.steps.length}`);
    return;
  }

  if (action === "job-standard") {
    const id = args[1] ?? "standard-validation";
    const job = createStandardValidationJob(paths, id);

    console.log("✅ Standard validation job created");
    console.log(`id: ${job.id}`);
    console.log(`steps: ${job.steps.length}`);
    return;
  }

  if (action === "jobs") {
    const jobs = listJobs(paths);

    console.log("📋 Build Jobs");
    console.log("");

    if (jobs.length === 0) {
      console.log("No build jobs yet.");
      return;
    }

    for (const job of jobs) {
      console.log(`${job.status === "complete" ? "✅" : job.status === "failed" ? "❌" : "🟡"} ${job.id}`);
      console.log(`   title: ${job.title}`);
      console.log(`   status: ${job.status}`);
      console.log(`   steps: ${job.steps.length}`);
    }

    return;
  }

  if (action === "job-show") {
    const id = args[1];
    const job = readJob(paths, id);

    if (!job) {
      console.log(`❌ Job not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(job, null, 2));
    return;
  }

  if (action === "job-reset") {
    const id = args[1];
    const job = updateJob(paths, id, {
      status: "queued",
      assignedWorkerId: null
    });

    console.log(`✅ Job reset: ${job.id}`);
    return;
  }

  if (action === "run") {
    const id = args[1];

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge buildfarm run job-id");
      return;
    }

    const result = await runJob(paths, id);

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      if (result.runId) console.log(`run: ${result.runId}`);
      return;
    }

    console.log("✅ Build job complete");
    console.log(`job: ${result.jobId}`);
    console.log(`run: ${result.runId}`);
    console.log(`worker: ${result.workerId}`);
    return;
  }

  if (action === "run-next") {
    const result = await runNextJob(paths);

    if (!result.ok) {
      console.log(`⚠️ ${result.reason ?? result.error}`);
      return;
    }

    console.log("✅ Build job complete");
    console.log(`job: ${result.jobId}`);
    console.log(`run: ${result.runId}`);
    console.log(`worker: ${result.workerId}`);
    return;
  }

  if (action === "runs") {
    const runs = listRuns(paths);

    console.log("📜 Build Runs");
    console.log("");

    if (runs.length === 0) {
      console.log("No build runs yet.");
      return;
    }

    for (const run of runs) {
      console.log(`${run.status === "complete" ? "✅" : run.status === "failed" ? "❌" : "🟡"} ${run.id}`);
      console.log(`   job: ${run.jobId}`);
      console.log(`   worker: ${run.workerId}`);
      console.log(`   status: ${run.status}`);
    }

    return;
  }

  if (action === "run-show") {
    const id = args[1];
    const run = readRun(paths, id);

    if (!run) {
      console.log(`❌ Run not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(run, null, 2));
    return;
  }

  if (action === "artifacts") {
    const artifacts = listArtifacts(paths);

    console.log("📦 Build Artifacts");
    console.log("");

    if (artifacts.length === 0) {
      console.log("No artifacts yet.");
      return;
    }

    for (const artifact of artifacts) {
      console.log(`📦 ${artifact.id}`);
      console.log(`   run: ${artifact.runId}`);
      console.log(`   job: ${artifact.jobId}`);
      console.log(`   type: ${artifact.type}`);
    }

    return;
  }

  console.log("Forge Autonomous Build Farm");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge buildfarm init");
  console.log("  aift-forge buildfarm status");
  console.log("  aift-forge buildfarm workers");
  console.log("  aift-forge buildfarm job-create test-job --script test");
  console.log("  aift-forge buildfarm job-standard");
  console.log("  aift-forge buildfarm jobs");
  console.log("  aift-forge buildfarm run job-id");
  console.log("  aift-forge buildfarm run-next");
  console.log("  aift-forge buildfarm runs");
  console.log("  aift-forge buildfarm artifacts");
}
