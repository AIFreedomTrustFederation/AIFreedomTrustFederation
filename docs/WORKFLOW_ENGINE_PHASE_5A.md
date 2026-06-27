# AIFT-Forge Phase 5A: Workflow Foundation

Phase 5A adds workflow storage, validation, interpolation, and workflow run records.

## Storage

Workflow definitions:

    .forge/workflows/

Workflow run records:

    .forge/workflow-runs/

## Supported Step Types

- `note`
- `assert`
- `prompt`
- `agent`

Phase 5A validates these step types but does not execute agent or prompt steps yet.

## Interpolation

Workflow fields can use simple template variables:

    {{inputs.project}}
    {{workflow.id}}
    {{steps.review.output}}

## Governance

Workflow definitions and runs are:

- local-first
- JSON-backed
- inspectable
- replayable
- no cloud fallback
- explicit records
