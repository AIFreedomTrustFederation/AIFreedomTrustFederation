# AIFT Forge Design Requirements

AIFT Forge should feel familiar to users of mature repository platforms while remaining sovereign, local-first, and federation-ready.

This document describes required product surfaces, buttons, navigation, and interaction patterns for the installable app and future web relay.

## Core product surfaces

AIFT Forge must provide these primary areas:

- Dashboard
- Explore
- Organizations
- Repositories
- Stars or saved repos
- Issues
- Pull requests
- Discussions
- Actions or builds
- Packages
- Releases
- Projects
- Wiki or docs
- Security
- Insights
- Settings
- Admin
- Node federation
- Mirrors
- Approvals

## Global navigation

The top navigation should include:

- product logo
- global search
- create button
- issues link
- pull requests link
- builds link
- marketplace or templates link
- notifications
- profile menu
- node status

## Repository header

Each repository page should expose:

- owner and repo name
- visibility badge
- repo description
- topics
- star or save button
- watch or follow button
- fork or mirror button
- clone button
- download button
- open in desktop button
- open on node button
- mirror status
- signed status
- latest release

## Repository tabs

Required repository tabs:

- Code
- Issues
- Pull Requests
- Actions
- Builds
- Packages
- Releases
- Projects
- Wiki
- Security
- Insights
- Settings
- Mirrors
- Nodes
- Approvals

## Code tab actions

The Code tab should include:

- branch selector
- tag selector
- path breadcrumb
- file tree
- commit history button
- blame button
- raw button
- edit button
- delete button when authorized
- add file button
- upload file button
- new branch button
- compare button
- clone options
- download archive
- open in editor
- open in desktop

## Issue features

Issues should support:

- new issue button
- filters
- labels
- milestones
- assignees
- saved views
- linked pull requests
- comments
- reactions
- checklists
- templates
- close and reopen
- transfer or convert to discussion

## Pull request features

Pull requests should support:

- new pull request button
- compare branches
- review changes
- file comments
- conversation
- commits
- checks
- approvals
- requested changes
- merge button
- squash merge
- rebase merge
- close without merge
- draft status
- conflict detection
- signed merge record

## Build and action features

Builds should support:

- workflow list
- run history
- job logs
- artifacts
- runner node
- queued/running/passed/failed status
- rerun button
- cancel button
- release from build
- promote to relay
- promote to package

## Release features

Releases should support:

- draft release
- publish release
- release notes
- changelog
- artifacts
- checksums
- signing status
- APK artifact
- Windows installer artifact
- portable desktop artifact
- source archive
- rollback warning

## Package features

Packages should support:

- package list
- package detail
- versions
- channels
- install instructions
- hash
- signature status
- compatibility metadata
- mirrors
- deprecation notice

## Federation and mirror features

AIFT-specific repo features must include:

- owner node
- mirror nodes
- relay nodes
- node health
- repo replication status
- package replication status
- conflict records
- signed service records
- public mirror status
- local availability status

## Security features

Security pages should support:

- dependency review
- secret scanning status
- release signing status
- permission review
- protected branch rules
- approval requirements
- audit log
- vulnerability advisories
- security policy

## Settings features

Settings should include:

- general repo settings
- visibility
- collaborators
- teams
- branches
- protected branches
- webhooks or local hooks
- mirrors
- packages
- releases
- build runners
- node deployment
- danger zone

## Design rule

The UI should be familiar enough that a GitHub, GitLab, Gitea, Forgejo, or SourceHut user immediately understands it, but it should not copy another platform's branding. AIFT Forge should use its own language where sovereignty matters: mirrors, nodes, relays, signed releases, local-first status, and human approvals.
