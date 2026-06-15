# AIFT Forge Requirements

AIFT Forge is the planned self-hosted and federated repository system for AI Freedom Trust Federation.

It should be capable of replacing the required runtime role of GitHub while still allowing GitHub to remain an optional public mirror.

## Product goal

AIFT Forge should provide the system requirements needed for:

- source repository hosting
- repository discovery
- issue tracking
- pull and merge requests
- code review
- releases
- package hosting
- APK and desktop release channels
- build logs
- CI style build jobs
- project boards
- access control
- organization and team management
- repo mirrors
- federation across AIFT nodes
- signed manifests
- local-first operation
- VPS relay coordination

## Non-negotiable principles

- GitHub must be optional, not required.
- Repo identity must be portable across nodes and relays.
- Local nodes must remain useful offline.
- Public mirrors must not become the source of truth.
- Build outputs must be traceable to source and manifest records.
- Releases must include hash and signing status.
- Human approval is required for destructive, public, financial, or identity-sensitive actions.

## Core modules

### 1. Repo registry

Stores canonical repo records:

- repo id
- slug
- name
- description
- owner node id
- visibility
- default branch
- latest commit
- latest release
- mirror list
- status
- created time
- updated time

### 2. Git storage adapter

Provides compatibility with normal Git workflows:

- clone
- fetch
- push
- branch listing
- tag listing
- commit metadata
- file browsing
- diff viewing

The first implementation may wrap local Git repositories on disk. Later versions can add packed object storage, signed snapshots, and distributed mirrors.

### 3. Issues

Issue tracking must support:

- title
- body
- status
- labels
- assignees
- milestones
- comments
- linked commits
- linked pull requests
- audit events

### 4. Pull and merge requests

Merge workflow must support:

- source branch
- target branch
- diff summary
- file comments
- review status
- checks status
- approval requirements
- merge queue
- squash, merge, or rebase policy
- signed merge records

### 5. Releases

Release records must support:

- semantic version
- channel
- release notes
- source commit
- artifacts
- hashes
- signing status
- compatible node engine version
- compatible Android version
- compatible Windows version

### 6. Packages

Package registry must support:

- node bundles
- app templates
- APK files
- Windows installers
- static site bundles
- source archives
- manifest files
- checksums
- signatures

### 7. Build system

Build jobs must support:

- queued
- running
- passed
- failed
- canceled
- logs
- artifacts
- environment summary
- source ref
- node runner id
- resource usage

### 8. Access control

Access rules must support:

- owner
- maintainer
- contributor
- reviewer
- reader
- public mirror
- private repo
- human approval gates

### 9. Federation

Federation must support:

- node identity
- relay identity
- repo mirror records
- package mirror records
- release replication
- health status
- conflict records
- sync events

### 10. App distribution

The same repo system must publish installable products:

- Android APK
- Windows installer
- Windows portable build
- static web bundle
- node engine bundle

## Minimal viable AIFT Forge

The first working version should provide:

1. repo registry
2. local Git repo records
3. issue records
4. release records
5. package records
6. build records
7. product web UI
8. desktop UI shell
9. Android UI shell
10. VPS node registry integration

## Long-term target

AIFT Forge should become a sovereign GitHub alternative for AIFT projects, community apps, provider-node bundles, package distribution, and decentralized release governance.
