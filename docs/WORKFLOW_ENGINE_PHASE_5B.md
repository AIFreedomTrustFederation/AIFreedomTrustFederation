# AIFT-Forge Phase 5B: Workflow Runtime and CLI

Phase 5B adds workflow execution and the workflow command.

## Runtime

The runtime executes workflows step-by-step and writes run records after every step.

Supported step types:

- `note`
- `assert`
- `prompt`
- `agent`

## Commands

List workflows:

    aift-forge workflow list

Create a starter workflow:

    aift-forge workflow create repo-review --agent steward

Run workflow:

    aift-forge workflow run repo-review

Run with inputs:

    aift-forge workflow run repo-review --inputs project=AIFT-Forge

Show runs:

    aift-forge workflow runs

Show a run:

    aift-forge workflow run-show run-id

## Router Wiring

Wire:

    workflow -> packages/forge-core/src/commands/workflow.mjs
