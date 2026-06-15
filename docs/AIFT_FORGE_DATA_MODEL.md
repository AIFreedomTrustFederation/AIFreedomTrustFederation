# AIFT Forge Data Model

This document defines the first durable records for AIFT Forge.

The initial implementation may store these as local JSON records or SQLite tables. The long-term implementation can migrate to PostgreSQL, append-only event logs, and signed federation records.

## Repo

```json
{
  "repo_id": "aift-root",
  "slug": "aift-root",
  "name": "AI Freedom Trust Federation Root",
  "description": "Public identity and doctrine root.",
  "visibility": "public",
  "owner_node_id": "aift-vps-relay-root",
  "default_branch": "main",
  "storage_type": "local-git",
  "storage_path": "repos/aift-root.git",
  "status": "active",
  "created_at": "ISO_DATE",
  "updated_at": "ISO_DATE"
}
```

## Mirror

```json
{
  "mirror_id": "mirror-aift-root-phone-001",
  "repo_id": "aift-root",
  "node_id": "aift-phone-001",
  "mirror_type": "read-only",
  "status": "healthy",
  "last_sync_at": "ISO_DATE"
}
```

## Issue

```json
{
  "issue_id": "issue-1",
  "repo_id": "aift-root",
  "number": 1,
  "title": "Build Windows installer",
  "body": "Track installer work.",
  "status": "open",
  "labels": ["desktop", "release"],
  "assignees": [],
  "created_at": "ISO_DATE",
  "updated_at": "ISO_DATE"
}
```

## Pull request

```json
{
  "pr_id": "pr-1",
  "repo_id": "aift-root",
  "number": 1,
  "title": "Add app shell",
  "source_branch": "feature/app-shell",
  "target_branch": "main",
  "status": "open",
  "review_status": "pending",
  "checks_status": "pending",
  "merge_policy": "squash",
  "created_at": "ISO_DATE",
  "updated_at": "ISO_DATE"
}
```

## Review

```json
{
  "review_id": "review-1",
  "pr_id": "pr-1",
  "reviewer": "operator",
  "status": "approved",
  "body": "Looks good.",
  "created_at": "ISO_DATE"
}
```

## Release

```json
{
  "release_id": "release-0.1.0",
  "repo_id": "aift-root",
  "version": "0.1.0",
  "channel": "alpha",
  "source_commit": "COMMIT_SHA",
  "notes": "First installable shell.",
  "artifact_ids": [],
  "hash_status": "pending",
  "signature_status": "unsigned",
  "created_at": "ISO_DATE"
}
```

## Artifact

```json
{
  "artifact_id": "artifact-windows-0.1.0",
  "repo_id": "aift-root",
  "release_id": "release-0.1.0",
  "name": "AIFT Cloud Windows Installer",
  "artifact_type": "windows-installer",
  "file_path": "packages/aift-cloud-0.1.0.exe",
  "sha256": "pending",
  "size_bytes": 0,
  "signature_status": "unsigned",
  "created_at": "ISO_DATE"
}
```

## Build job

```json
{
  "build_id": "build-1",
  "repo_id": "aift-root",
  "source_ref": "main",
  "runner_node_id": "aift-vps-relay-root",
  "status": "queued",
  "started_at": null,
  "finished_at": null,
  "log_path": "logs/build-1.log",
  "artifact_ids": []
}
```

## Package

```json
{
  "package_id": "pkg-aift-node-engine",
  "repo_id": "aift-vps",
  "name": "AIFT Node Engine",
  "package_type": "node-engine-bundle",
  "version": "0.1.0",
  "channel": "alpha",
  "artifact_id": "artifact-node-engine-0.1.0",
  "created_at": "ISO_DATE"
}
```

## Federation event

```json
{
  "event_id": "event-1",
  "event_type": "repo_mirrored",
  "repo_id": "aift-root",
  "source_node_id": "aift-vps-relay-root",
  "target_node_id": "aift-phone-001",
  "status": "recorded",
  "created_at": "ISO_DATE"
}
```

## Approval event

```json
{
  "approval_id": "approval-1",
  "scope": "release",
  "scope_id": "release-0.1.0",
  "operator": "human-owner",
  "decision": "approved",
  "reason": "Ready for alpha release.",
  "created_at": "ISO_DATE"
}
```
