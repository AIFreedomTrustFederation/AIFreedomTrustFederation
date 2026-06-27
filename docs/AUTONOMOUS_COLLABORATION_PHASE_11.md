# AIFT-Forge Phase 11: Autonomous Multi-Agent Collaboration

Phase 11 adds collaboration rooms, agent messaging, work claims, voting, and handoffs.

## Storage

Records live under:

    .forge/collab/

Subdirectories:

    rooms/
    messages/
    claims/
    votes/
    handoffs/

## Concepts

### Collaboration Room

A local workspace where agents coordinate.

### Message

A room-scoped communication record.

### Claim

A work item claimed by an agent.

### Vote

A consensus proposal with recorded votes.

### Handoff

A transfer of work/context from one agent to another.

## Commands

Create a room:

    aift-forge collab room-create forge-room --title "Forge Room"

Join an agent:

    aift-forge collab join forge-room steward --role planner

Send a message:

    aift-forge collab say forge-room "We should review repo health."

Run a round:

    aift-forge collab round forge-room "Plan the next milestone."

Claim work:

    aift-forge collab claim forge-room steward --work "Review repo" "Review repo health."

Create proposal:

    aift-forge collab propose forge-room "Approve Phase 12 plan"

Vote:

    aift-forge collab vote vote-id --agent steward --decision yes

Handoff:

    aift-forge collab handoff forge-room --from planner --to coder --work "Build feature"

## Governance

Collaboration is:

- local-first
- JSON-backed
- inspectable
- no cloud fallback
- explicit agent identity
- explicit work claims
- explicit votes
- explicit handoffs
