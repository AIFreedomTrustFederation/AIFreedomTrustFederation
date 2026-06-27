# AIFT-Forge Phase 6: Multi-Agent Collaboration

Phase 6 adds local multi-agent teams.

Teams let Forge agents collaborate through explicit, inspectable JSON records.

## Storage

Team definitions:

    .forge/teams/

Team run records:

    .forge/team-runs/

## Team Object

A team contains:

- id
- title
- description
- strategy
- members
- reviewer agent
- permissions

## Member Object

A member contains:

- agent id
- role
- optional model override
- optional mode

## Commands

Create a team:

    aift-forge team create forge-council --agents steward,reviewer --title "Forge Council"

List teams:

    aift-forge team list

Show a team:

    aift-forge team show forge-council

Run a team:

    aift-forge team run forge-council "Plan the next Forge phase."

Show team runs:

    aift-forge team runs

Show a specific run:

    aift-forge team run-show team-run-id

Enable or disable:

    aift-forge team enable forge-council
    aift-forge team disable forge-council

## Governance

Multi-agent collaboration is:

- local-first
- JSON-backed
- inspectable
- replayable
- no cloud fallback
- no hidden background activity
- explicit agent identities
- explicit member roles
