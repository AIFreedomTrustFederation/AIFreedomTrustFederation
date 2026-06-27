# AIFT-Forge Phase 9: Distributed Knowledge Graph and Semantic Memory

Phase 9 adds a local knowledge graph and semantic memory foundation.

This is the first layer of the long-term Mind of All memory system.

## Storage

Knowledge records live under:

    .forge/knowledge/

Subdirectories:

    nodes/
    edges/
    observations/
    indexes/
    imports/

## Node

A node represents an entity:

- project
- agent
- workflow
- team
- model
- federation node
- trust
- document
- concept

## Edge

An edge represents a relationship:

    project:aift-forge --uses--> agent:steward

## Observation

An observation is a memory or statement with provenance:

- body
- node IDs
- tags
- source
- source reference
- confidence
- provenance

## Index

The first index is a portable local text index.

It avoids native vector dependencies so it works on Android/Termux.

Future phases can add embeddings through the provider registry.

## Commands

Status:

    aift-forge knowledge status

Add a node:

    aift-forge knowledge node-add project:aift-forge --type project --label "AIFT-Forge"

Add an edge:

    aift-forge knowledge edge-add --from project:aift-forge --to agent:steward --relation uses

Add an observation:

    aift-forge knowledge observe "Forge needs local-first memory." --nodes project:aift-forge --tags memory

Scan existing Forge records:

    aift-forge knowledge scan

Rebuild index:

    aift-forge knowledge index

Search:

    aift-forge knowledge search "workflow agent"

Related nodes:

    aift-forge knowledge related project:aift-forge

## Governance

The knowledge graph is:

- local-first
- JSON-backed
- inspectable
- portable
- Android/Termux-compatible
- no cloud fallback
- provenance-aware
- federation-ready
