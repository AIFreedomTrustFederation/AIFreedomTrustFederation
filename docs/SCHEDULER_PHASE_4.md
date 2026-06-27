# AIFT-Forge Phase 4: Autonomous Task Scheduler

Phase 4 adds a local task scheduler for persistent Forge agents.

Scheduled tasks are stored as inspectable JSON under:

    .forge/scheduler/

## Scheduled Task Object

Each scheduled task contains:

- id
- agent id
- title
- prompt
- enabled state
- cadence
- interval timing
- next run time
- last run result
- run count

## Commands

List scheduled tasks:

    aift-forge schedule list

Create a manual task:

    aift-forge schedule create repo-review --agent steward "Review the repo health."

Create an interval task:

    aift-forge schedule create daily-review --agent steward --cadence interval --every-minutes 1440 "Review repo health."

Create a one-time scheduled task:

    aift-forge schedule create one-shot --agent steward --cadence once --run-at 2026-06-27T12:00:00.000Z "Run once."

Show due tasks:

    aift-forge schedule due

Run one task:

    aift-forge schedule run daily-review

Run all due tasks:

    aift-forge schedule run-due

Enable or disable a task:

    aift-forge schedule enable daily-review
    aift-forge schedule disable daily-review

## Governance

The scheduler does not run hidden background activity by default.

It is local-first, inspectable, and explicit:

- tasks are JSON files
- agent prompts are visible
- run history is visible
- no cloud fallback
- no silent network use
- no writes without local records
