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
