# AIFT-Forge Agent Runtime Phase 3

Phase 3 turns local AI from a stateless command into persistent Forge agents.

## Agent Object

Each agent is stored as JSON under:

    .forge/agents/

An agent contains:

- identity
- label
- role
- model
- provider preference
- system prompt
- tools
- permissions
- memory

## Conversations

Agent conversations are stored under:

    .forge/conversations/

## Tasks

Agent tasks are stored under:

    .forge/tasks/

## Commands

Create an agent:

    aift-forge agent create steward --label "Forge Steward"

List agents:

    aift-forge agent list

Save memory:

    aift-forge agent remember steward "Always prefer local-first design."

Run an agent:

    aift-forge agent run steward "What should we build next?"

Create and run a task:

    aift-forge agent task steward --title "Repo review" "Review the repo direction."

List tasks:

    aift-forge agent tasks

## Governance

Agents follow AIFT-Forge policy:

- local-first
- inspectable
- no cloud fallback
- explicit write permissions
- user-owned memory
- JSON records stored inside the local Forge workspace
