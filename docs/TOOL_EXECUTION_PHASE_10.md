# AIFT-Forge Phase 10: Tool Execution and Permission System

Phase 10 adds local tool execution with explicit governance.

This lets agents and workflows request tools safely without gaining unrestricted access.

## Storage

Tool records live under:

    .forge/tools/

Subdirectories:

    runs/
    approvals/
    policies/

## Tool Policy

Default policy:

- read-only tools allowed
- write/shell tools require approval
- no cloud fallback
- local-only network posture
- denied-by-default for unknown tools

## Built-In Tools

Read-only:

- `repo.status`
- `repo.files`
- `repo.read`
- `git.status`
- `git.diff`
- `git.log`
- `knowledge.search`
- `knowledge.status`

Restricted:

- `shell.exec`

## Commands

Initialize policy:

    aift-forge tool init

List tools:

    aift-forge tool list

Show policy:

    aift-forge tool policy

Run a read-only tool:

    aift-forge tool run git.status

Read a file:

    aift-forge tool run repo.read --input file=README.md

List approvals:

    aift-forge tool approvals

Approve a pending tool request:

    aift-forge tool approve approval-id

Show runs:

    aift-forge tool runs

## Governance

Tool execution is:

- local-first
- policy-gated
- approval-backed
- JSON recorded
- audit-friendly
- no hidden writes
- no silent shell execution
- no cloud fallback
