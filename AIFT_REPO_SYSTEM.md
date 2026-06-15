# AIFT Repo System

This repository is the public identity and doctrine root for AI Freedom Trust Federation.

The AIFT Repo System is not meant to be limited to one hosted Git provider. GitHub may be used as a public mirror and collaboration adapter, but the long-term source of truth for AIFT packages, app profiles, APK releases, node bundles, manifests, and relay metadata should be controlled by AIFT-operated nodes and relays.

## Root principle

AIFT repo identity is protocol-owned, not platform-owned.

A repo should keep the same identity even when it is mirrored across:

- an AFTP VPS relay
- a phone node
- a laptop node
- a local archive
- an APK package channel
- a public Git mirror

## First repo classes

- doctrine repositories
- dashboard repositories
- APK repositories
- app-template repositories
- provider-node bundle repositories
- package repositories
- relay registry repositories
- name and service-record repositories

## Required manifest fields

Every AIFT repo record should eventually expose:

- repo_id
- name
- description
- owner_node_id
- source_type
- default_branch
- latest_release
- content_hash
- signature_status
- mirrors
- build_status
- license_status
- updated_at

## Operating model

The AIFT repo system should support:

1. local-first development
2. relay-assisted federation
3. mirror-based distribution
4. APK-installable node runtime
5. transparent build records
6. portable repo identity
7. optional public mirrors

## Current bridge

Until the AIFT repo relay is complete, this GitHub repository acts as a public declaration and compatibility bridge.

The runtime goal remains AIFT-owned infrastructure.
