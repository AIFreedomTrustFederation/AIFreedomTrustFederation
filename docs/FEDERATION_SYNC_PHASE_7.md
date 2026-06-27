# AIFT-Forge Phase 7: Federation Synchronization Foundation

Phase 7 adds a local-first federation synchronization foundation.

This is not cloud sync. It is an inspectable bundle exchange model for sovereign Forge nodes.

## Storage

Federation records live under:

    .forge/federation/

Subdirectories:

    peers/
    bundles/
    inbox/
    outbox/
    logs/

## Node Identity

Initialize a local node:

    aift-forge federation init --id my-node --label "My Forge Node"

Show status:

    aift-forge federation status

## Peers

Add a trusted/manual peer:

    aift-forge federation peer-add family-node --label "Family Node"

List peers:

    aift-forge federation peers

Enable or disable peers:

    aift-forge federation peer-enable family-node
    aift-forge federation peer-disable family-node

## Bundles

Export a bundle:

    aift-forge federation export --label "Manual backup"

List bundles:

    aift-forge federation bundles

Import a bundle without applying records:

    aift-forge federation import ./bundle.json

Import and apply records:

    aift-forge federation import ./bundle.json --apply

## Sync Log

Show recent sync log entries:

    aift-forge federation log

## Governance

The federation sync foundation is:

- local-first
- explicit
- inspectable
- bundle-based
- peer-registry based
- no cloud fallback
- no silent network synchronization
- manual import by default
- append-only sync log
