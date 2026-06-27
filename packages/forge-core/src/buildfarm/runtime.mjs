import { spawnSync } from "node:child_process";
import {
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
