#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🏗️ AIFT-Forge Phase 13: Autonomous Build Farm Foundation"

mkdir -p packages/forge-core/src/buildfarm
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/build-farm/workers
mkdir -p .forge/build-farm/jobs
mkdir -p .forge/build-farm/runs
mkdir -p .forge/build-farm/artifacts
mkdir -p .forge/build-farm/logs

cat > packages/forge-core/src/buildfarm/store.mjs <<'JS'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function buildFarmDir(paths) {
  return join(paths.repoRoot, ".forge", "build-farm");
}

export function workersDir(paths) {
  return join(buildFarmDir(paths), "workers");
}

export function jobsDir(paths) {
  return join(buildFarmDir(paths), "jobs");
}

export function runsDir(paths) {
  return join(buildFarmDir(paths), "runs");
}

export function artifactsDir(paths) {
  return join(buildFarmDir(paths), "artifacts");
}

export function logsDir(paths) {
  return join(buildFarmDir(paths), "logs");
}

export function ensureBuildFarmStore(paths) {
  mkdirSync(workersDir(paths), { recursive: true });
  mkdirSync(jobsDir(paths), { recursive: true });
  mkdirSync(runsDir(paths), { recursive: true });
  mkdirSync(artifactsDir(paths), { recursive: true });
  mkdirSync(logsDir(paths), { recursive: true });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function workerFile(paths, id) {
  return join(workersDir(paths), `${normalizeId(id)}.json`);
}

export function jobFile(paths, id) {
  return join(jobsDir(paths), `${normalizeId(id)}.json`);
}

export function runFile(paths, id) {
  return join(runsDir(paths), `${normalizeId(id)}.json`);
}

export function artifactFile(paths, id) {
  return join(artifactsDir(paths), `${normalizeId(id)}.json`);
}

export function createWorker(paths, worker = {}) {
  ensureBuildFarmStore(paths);

  const id = normalizeId(worker.id ?? `local-worker-${Date.now()}`);

  const next = {
    schema: "aift.forge.build-worker.v1",
    id,
    label: worker.label ?? id,
    type: worker.type ?? "local",
    platform: worker.platform ?? process.platform,
    arch: worker.arch ?? process.arch,
    status: worker.status ?? "available",
    capabilities: worker.capabilities ?? [
      "node",
      "npm",
      "syntax-check",
      "test",
      "lint",
      "build"
    ],
    concurrency: Number(worker.concurrency ?? 1),
    currentRuns: worker.currentRuns ?? [],
    enabled: worker.enabled ?? true,
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(workerFile(paths, id), next);
  return next;
}

export function readWorker(paths, id) {
  ensureBuildFarmStore(paths);

  const file = workerFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listWorkers(paths) {
  ensureBuildFarmStore(paths);

  return readdirSync(workersDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(workersDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function updateWorker(paths, id, patch) {
  const existing = readWorker(paths, id);
  if (!existing) throw new Error(`Build worker not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  writeJson(workerFile(paths, id), next);
  return next;
}

export function createJob(paths, job = {}) {
  ensureBuildFarmStore(paths);

  const id = normalizeId(job.id ?? `job-${Date.now()}`);

  const next = {
    schema: "aift.forge.build-job.v1",
    id,
    title: job.title ?? id,
    description: job.description ?? "",
    status: job.status ?? "queued",
    priority: Number(job.priority ?? 50),
    requiredCapabilities: job.requiredCapabilities ?? [],
    steps: job.steps ?? [],
    assignedWorkerId: job.assignedWorkerId ?? null,
    createdBy: job.createdBy ?? "local-user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  validateJob(next);
  writeJson(jobFile(paths, id), next);
  return next;
}

export function validateJob(job) {
  if (!job.id) throw new Error("Build job id is required.");
  if (!Array.isArray(job.steps)) throw new Error("Build job steps must be an array.");

  for (const [index, step] of job.steps.entries()) {
    if (!step.id) throw new Error(`Build job step ${index} missing id.`);
    if (!step.type) throw new Error(`Build job step ${step.id} missing type.`);

    const allowed = ["command", "node-check", "npm-script", "note"];
    if (!allowed.includes(step.type)) throw new Error(`Unsupported build job step type: ${step.type}`);
  }

  return true;
}

export function readJob(paths, id) {
  ensureBuildFarmStore(paths);

  const file = jobFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listJobs(paths) {
  ensureBuildFarmStore(paths);

  return readdirSync(jobsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(jobsDir(paths), file)))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function updateJob(paths, id, patch) {
  const existing = readJob(paths, id);
  if (!existing) throw new Error(`Build job not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  validateJob(next);
  writeJson(jobFile(paths, id), next);
  return next;
}

export function createRun(paths, run = {}) {
  ensureBuildFarmStore(paths);

  const id = normalizeId(run.id ?? `run-${Date.now()}`);

  const next = {
    schema: "aift.forge.build-run.v1",
    id,
    jobId: run.jobId,
    workerId: run.workerId,
    status: run.status ?? "running",
    steps: run.steps ?? [],
    artifacts: run.artifacts ?? [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  writeJson(runFile(paths, id), next);
  return next;
}

export function readRun(paths, id) {
  ensureBuildFarmStore(paths);

  const file = runFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listRuns(paths) {
  ensureBuildFarmStore(paths);

  return readdirSync(runsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(runsDir(paths), file)))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export function updateRun(paths, id, patch) {
  const existing = readRun(paths, id);
  if (!existing) throw new Error(`Build run not found: ${id}`);

  const next = {
    ...existing,
    ...patch
  };

  writeJson(runFile(paths, id), next);
  return next;
}

export function finishRun(paths, id, patch = {}) {
  return updateRun(paths, id, {
    ...patch,
    status: patch.status ?? "complete",
    finishedAt: new Date().toISOString()
  });
}

export function createArtifact(paths, artifact = {}) {
  ensureBuildFarmStore(paths);

  const id = normalizeId(artifact.id ?? `artifact-${Date.now()}`);

  const next = {
    schema: "aift.forge.build-artifact.v1",
    id,
    runId: artifact.runId,
    jobId: artifact.jobId,
    type: artifact.type ?? "log",
    path: artifact.path ?? null,
    content: artifact.content ?? null,
    metadata: artifact.metadata ?? {},
    createdAt: new Date().toISOString()
  };

  writeJson(artifactFile(paths, id), next);
  return next;
}

export function listArtifacts(paths) {
  ensureBuildFarmStore(paths);

  return readdirSync(artifactsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(artifactsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
JS

cat > packages/forge-core/src/buildfarm/runtime.mjs <<'JS'
import { spawnSync } from "node:child_process";
import {
  createArtifact,
  createRun,
  createWorker,
  finishRun,
  listJobs,
  listWorkers,
  readJob,
  updateJob,
  updateRun,
  updateWorker
} from "./store.mjs";

export function ensureLocalWorker(paths) {
  const existing = listWorkers(paths).find((worker) => worker.id === "local-worker");

  if (existing) {
    return updateWorker(paths, existing.id, {
      lastSeenAt: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch
    });
  }

  return createWorker(paths, {
    id: "local-worker",
    label: "Local Build Worker",
    type: "local"
  });
}

export function selectWorker(paths, job) {
  const workers = listWorkers(paths).filter((worker) => worker.enabled && worker.status !== "disabled");

  for (const worker of workers) {
    const capabilities = new Set(worker.capabilities ?? []);
    const required = job.requiredCapabilities ?? [];
    const ok = required.every((capability) => capabilities.has(capability));

    if (ok && (worker.currentRuns?.length ?? 0) < (worker.concurrency ?? 1)) {
      return worker;
    }
  }

  return null;
}

export function queuedJobs(paths) {
  return listJobs(paths).filter((job) => job.status === "queued");
}

export async function runNextJob(paths) {
  ensureLocalWorker(paths);

  const job = queuedJobs(paths)[0];

  if (!job) {
    return {
      ok: false,
      reason: "No queued build jobs."
    };
  }

  return runJob(paths, job.id);
}

export async function runJob(paths, jobId) {
  const job = readJob(paths, jobId);

  if (!job) {
    return {
      ok: false,
      error: `Build job not found: ${jobId}`
    };
  }

  const worker = selectWorker(paths, job);

  if (!worker) {
    return {
      ok: false,
      error: "No available build worker has the required capabilities."
    };
  }

  const run = createRun(paths, {
    jobId: job.id,
    workerId: worker.id
  });

  updateJob(paths, job.id, {
    status: "running",
    assignedWorkerId: worker.id
  });

  updateWorker(paths, worker.id, {
    currentRuns: [...(worker.currentRuns ?? []), run.id],
    status: "busy"
  });

  const stepResults = [];

  try {
    for (const step of job.steps) {
      const result = executeBuildStep(paths, step);

      stepResults.push({
        stepId: step.id,
        type: step.type,
        ok: result.ok,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        output: result.output ?? null,
        startedAt: result.startedAt,
        finishedAt: new Date().toISOString()
      });

      updateRun(paths, run.id, {
        steps: stepResults
      });

      if (!result.ok) {
        createArtifact(paths, {
          runId: run.id,
          jobId: job.id,
          type: "failure-log",
          content: result.stderr || result.stdout || result.error || "Step failed",
          metadata: {
            stepId: step.id
          }
        });

        finishRun(paths, run.id, {
          status: "failed",
          error: result.error ?? result.stderr ?? "Build step failed",
          steps: stepResults
        });

        updateJob(paths, job.id, {
          status: "failed"
        });

        releaseWorker(paths, worker.id, run.id);

        return {
          ok: false,
          runId: run.id,
          jobId: job.id,
          workerId: worker.id,
          error: result.error ?? result.stderr ?? "Build step failed",
          steps: stepResults
        };
      }
    }

    const artifact = createArtifact(paths, {
      runId: run.id,
      jobId: job.id,
      type: "build-summary",
      content: `Build job ${job.id} completed successfully.`,
      metadata: {
        steps: stepResults.length
      }
    });

    finishRun(paths, run.id, {
      status: "complete",
      steps: stepResults,
      artifacts: [artifact.id]
    });

    updateJob(paths, job.id, {
      status: "complete"
    });

    releaseWorker(paths, worker.id, run.id);

    return {
      ok: true,
      runId: run.id,
      jobId: job.id,
      workerId: worker.id,
      artifactId: artifact.id,
      steps: stepResults
    };
  } catch (error) {
    finishRun(paths, run.id, {
      status: "failed",
      error: error.message,
      steps: stepResults
    });

    updateJob(paths, job.id, {
      status: "failed"
    });

    releaseWorker(paths, worker.id, run.id);

    return {
      ok: false,
      runId: run.id,
      jobId: job.id,
      workerId: worker.id,
      error: error.message,
      steps: stepResults
    };
  }
}

export function releaseWorker(paths, workerId, runId) {
  const worker = listWorkers(paths).find((item) => item.id === workerId);
  if (!worker) return null;

  const currentRuns = (worker.currentRuns ?? []).filter((id) => id !== runId);

  return updateWorker(paths, workerId, {
    currentRuns,
    status: currentRuns.length === 0 ? "available" : "busy"
  });
}

export function executeBuildStep(paths, step) {
  const startedAt = new Date().toISOString();

  if (step.type === "note") {
    return {
      ok: true,
      output: step.text ?? "",
      startedAt
    };
  }

  if (step.type === "node-check") {
    const result = spawnSync("node", ["--check", step.path], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      startedAt
    };
  }

  if (step.type === "npm-script") {
    const result = spawnSync("npm", ["run", step.script], {
      cwd: paths.repoRoot,
      encoding: "utf8",
      timeout: Number(step.timeoutMs ?? 120000)
    });

    return {
      ok: result.status === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      startedAt
    };
  }

  if (step.type === "command") {
    const allowed = step.allowShell === true;

    if (!allowed) {
      return {
        ok: false,
        error: "Command step requires allowShell: true.",
        startedAt
      };
    }

    const result = spawnSync(step.command, {
      cwd: paths.repoRoot,
      encoding: "utf8",
      shell: true,
      timeout: Number(step.timeoutMs ?? 120000)
    });

    return {
      ok: result.status === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      startedAt
    };
  }

  return {
    ok: false,
    error: `Unsupported build step type: ${step.type}`,
    startedAt
  };
}

export function createStandardValidationJob(paths, id = "standard-validation") {
  const { createJob } = requireStore();

  return createJob(paths, {
    id,
    title: "Standard Validation",
    description: "Run core syntax checks and package scripts.",
    requiredCapabilities: ["node", "npm"],
    steps: [
      {
        id: "store-syntax",
        type: "node-check",
        path: "packages/forge-core/src/buildfarm/store.mjs"
      },
      {
        id: "runtime-syntax",
        type: "node-check",
        path: "packages/forge-core/src/buildfarm/runtime.mjs"
      },
      {
        id: "lint",
        type: "npm-script",
        script: "lint"
      },
      {
        id: "test",
        type: "npm-script",
        script: "test"
      },
      {
        id: "typecheck",
        type: "npm-script",
        script: "typecheck"
      },
      {
        id: "build",
        type: "npm-script",
        script: "build"
      }
    ]
  });
}

function requireStore() {
  return globalThis.__aiftBuildFarmStore;
}
JS

python3 - <<'PY'
from pathlib import Path
p = Path("packages/forge-core/src/buildfarm/runtime.mjs")
s = p.read_text()
s = s.replace("""import {
  createArtifact,
  createRun,
  createWorker,
  finishRun,
  listJobs,
  listWorkers,
  readJob,
  updateJob,
  updateRun,
  updateWorker
} from "./store.mjs";""", """import {
  createArtifact,
  createJob,
  createRun,
  createWorker,
  finishRun,
  listJobs,
  listWorkers,
  readJob,
  updateJob,
  updateRun,
  updateWorker
} from "./store.mjs";""")
s = s.replace("""export function createStandardValidationJob(paths, id = "standard-validation") {
  const { createJob } = requireStore();

  return createJob(paths, {""", """export function createStandardValidationJob(paths, id = "standard-validation") {
  return createJob(paths, {""")
s = s.replace("""
function requireStore() {
  return globalThis.__aiftBuildFarmStore;
}
""", "")
p.write_text(s)
PY

cat > packages/forge-core/src/commands/buildfarm.mjs <<'JS'
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
JS

cat > scripts/aift-buildfarm-smoke.mjs <<'JS'
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
JS

cat > docs/AUTONOMOUS_BUILD_FARM_PHASE_13.md <<'MD'
# AIFT-Forge Phase 13: Autonomous Build Farm Foundation

Phase 13 adds a local-first build farm foundation.

The build farm lets Forge queue validation jobs, assign workers, run checks, record runs, and store artifacts.

## Storage

Records live under:

    .forge/build-farm/

Subdirectories:

    workers/
    jobs/
    runs/
    artifacts/
    logs/

## Concepts

### Worker

A worker is a local or future federated execution node.

### Job

A job is a list of build or validation steps.

Supported step types:

- `note`
- `node-check`
- `npm-script`
- `command`

`command` steps require `allowShell: true`.

### Run

A run is a single execution of a job by a worker.

### Artifact

An artifact records build summaries, failure logs, and future output files.

## Commands

Initialize local worker:

    aift-forge buildfarm init

Show status:

    aift-forge buildfarm status

List workers:

    aift-forge buildfarm workers

Create npm script job:

    aift-forge buildfarm job-create test-job --script test

Create standard validation job:

    aift-forge buildfarm job-standard

List jobs:

    aift-forge buildfarm jobs

Run a job:

    aift-forge buildfarm run job-id

Run next queued job:

    aift-forge buildfarm run-next

Show runs:

    aift-forge buildfarm runs

Show artifacts:

    aift-forge buildfarm artifacts

## Governance

The build farm is:

- local-first
- JSON-backed
- inspectable
- no cloud fallback
- worker capability based
- explicit job records
- explicit run records
- artifact-backed
- federation-ready
MD

node --check packages/forge-core/src/buildfarm/store.mjs
node --check packages/forge-core/src/buildfarm/runtime.mjs
node --check packages/forge-core/src/commands/buildfarm.mjs
node --check scripts/aift-buildfarm-smoke.mjs
node scripts/aift-buildfarm-smoke.mjs

echo ""
echo "✅ Phase 13 Autonomous Build Farm Foundation complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  buildfarm -> packages/forge-core/src/commands/buildfarm.mjs"
echo ""
echo "Recommended tests:"
echo "  aift-forge buildfarm init"
echo "  aift-forge buildfarm status"
echo "  aift-forge buildfarm job-standard"
echo "  aift-forge buildfarm run-next"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 13 autonomous build farm foundation\""
echo "  git push origin main"
