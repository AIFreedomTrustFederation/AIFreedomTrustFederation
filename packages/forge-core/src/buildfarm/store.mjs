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
