# AIFT Forge QA Pass

Status: pre-runtime QA, no shell execution yet.

## Scope

This QA pass reviewed the committed source structure, API route map, UI action behavior, data shape, Git backend readiness, local auth foundation, packaging readiness, and known gaps.

## Result summary

| Area | Status | Notes |
|---|---:|---|
| Monorepo structure | Pass | Root workspaces include product web, desktop, Android, Forge API, and Forge core packages. |
| Local backend API | Pass | API server includes health, state, records, Git, token, and setup routes. |
| Persistent state | Pass | Forge core has JSON-backed state helpers. |
| UI action behavior | Partial pass | Main visible controls either run a backend/local action or create a planned implementation record. Full viewers are still pending. |
| No-dead-link pass | Partial pass | Most silent dead buttons were replaced. Planned items are explicitly marked as planned. |
| Package pipeline | Pass | Build flow creates build/package/artifact/hash/manifest/approval records. |
| Artifact hash utilities | Pass | SHA-256 text/file hash utilities exist. |
| Release export utilities | Pass | Release export record utility exists. |
| Disk-backed Git repo init | Pass | Bare repo init and inspect utilities exist. |
| Git read utilities | Pass | Branch, tag, commit, tree, blob, and diff readers exist. |
| Git read API routes | Pass | API routes exist for branch, tag, commit, tree, blob, and diff reads. |
| Git smart HTTP bridge | Partial pass | Smart HTTP bridge exists and calls local git stateless RPC. Runtime clone/fetch/push still must be tested. |
| Local token auth | Pass | Local token creation, authentication, revocation, and seed routes exist. |
| Token enforcement in Git bridge | Partial pass | Smart HTTP access resolution now requires local token identity for receive-pack writes and limits anonymous sessions to public reads. Full runtime push evidence is still pending. |
| Local setup automation | Pass | Local setup helper and API route exist. |
| Protected ref/review gates | Failing gap | Gate module was blocked by tooling and still needs implementation. |
| Android APK output | Not built | Android shell exists, but native project/APK build is not complete. |
| Windows installer output | Not built | Desktop shell exists, but installer has not been built/tested. |
| AI provider execution | Not built | AI request records exist; real provider adapters are not yet active. |

## API route checklist

Expected backend routes:

- `GET /api/health`
- `GET /api/state`
- `POST /api/setup/local`
- `POST /api/tokens/create`
- `POST /api/tokens/authenticate`
- `POST /api/tokens/revoke`
- `POST /api/tokens/seed`
- `POST /api/identity/current`
- `POST /api/permissions/grant`
- `POST /api/permissions/check`
- `POST /api/issues`
- `POST /api/pull-requests`
- `POST /api/builds`
- `POST /api/build-flows`
- `POST /api/packages`
- `POST /api/artifacts`
- `POST /api/artifact-hashes`
- `POST /api/release-manifests`
- `POST /api/release-exports`
- `POST /api/approvals`
- `POST /api/ai/requests`
- `POST /api/git/repos`
- `POST /api/git/init`
- `POST /api/git/inspect`
- `POST /api/git/branches`
- `POST /api/git/tags`
- `POST /api/git/commits`
- `POST /api/git/tree`
- `POST /api/git/blob`
- `POST /api/git/diff`
- `POST /api/git/imports`
- `POST /api/git/snapshots`
- `POST /api/git/clone-info`
- `POST /api/git/fetch-capability`
- `POST /api/git/push-capability`
- `POST /api/git/service-discovery`
- `POST /api/git/upload-pack`
- `POST /api/git/receive-pack`

Expected smart HTTP paths:

- `GET /git/<repo>/info/refs?service=git-upload-pack`
- `GET /git/<repo>/info/refs?service=git-receive-pack`
- `POST /git/<repo>/git-upload-pack`
- `POST /git/<repo>/git-receive-pack`

## UI action matrix

| UI control | Expected behavior |
|---|---|
| New Issue | Backend first, browser fallback. |
| New Pull Request | Backend first, browser fallback. |
| Draft Release | Backend first, browser fallback. |
| Publish Package | Backend first, browser fallback. |
| Record Artifact | Backend first, browser fallback. |
| Release Manifest | Backend first, browser fallback. |
| Request Approval | Backend first, browser fallback. |
| Run Build Flow | Backend first, local queue fallback. |
| Init Git | Backend first, approval fallback. |
| Inspect Git Repo | Backend first, approval fallback. |
| AI Review / AI agent buttons | Backend first, browser fallback. |
| Watch / Star / Mirror / Fork | Planned record, not silent dead button. |
| Search | Planned notice, not silent dead input. |
| Archive export / Desktop deep link | Planned record, not silent dead button. |

## Data shape risks

The UI expects optional collections that may not exist in older state files:

- `artifacts`
- `release_manifests`
- `git_snapshots`
- `tokens`
- `permissions`
- `blocked_actions`
- `git_transport_events`
- `git_protocol_events`

The UI already treats some newer arrays as optional. Runtime should confirm old local state does not break rendering.

## Security findings

### Good

- Local token auth is self-hosted.
- Tokens are hashed before storage.
- No external auth provider is required.
- Permissions and blocked actions are recorded locally.
- Smart HTTP uses local bare repos only.

### Remaining high-priority security gaps

- Smart HTTP token actor wiring exists for receive-pack writes, but live push testing is still pending.
- Protected ref/review gate enforcement is not finished.
- Receive-pack writes should not be trusted until protected gate checks are wired and live push behavior is runtime-tested.
- Request size limits and streaming should replace large in-memory buffers.

## Runtime test plan when ready

1. Start Forge API.
2. Check `/api/health`.
3. Run local setup.
4. Seed token.
5. Initialize `aift-root` bare repo.
6. Inspect repo.
7. Test `info/refs` advertisement.
8. Test clone/fetch.
9. Test push only after token actor and gate enforcement are complete.
10. Run web UI and confirm backend status is online.
11. Click every working UI action once.
12. Confirm state collections update.
13. Run verification script.
14. Build web bundle.
15. Attempt desktop package after web build passes.
16. Attempt Android project/APK after native Android project exists.

## Local smoke evidence

Run the focused local transport gate check with:

```bash
npm run smoke:git-access
```

This verifies anonymous public read access, private read denial, read-token private access, read-token write denial, write-token receive-pack permission, and blocked-action recording. It does not replace live Git client clone/fetch/push testing.

## Features still missing

- Live Git client runtime evidence for smart HTTP clone/fetch/push.
- Protected ref/review gate module.
- Protected write enforcement.
- Real user login screen.
- User/org/team UI.
- Issue comments.
- PR review comments.
- Merge execution.
- Branch/tag/commit/tree/blob/diff UI viewers.
- Search index.
- Notifications.
- Package file upload/download.
- Artifact file storage and download.
- Artifact signing.
- Release signing.
- Windows installer output.
- Android native project and APK output.
- Real AI provider adapters.
- Federation/mirror sync execution.
- Full runtime test evidence.

## QA decision

AIFT Forge is ready for first local runtime smoke testing of the API, persistent records, UI records, Git init/inspect, Git read routes, and smart HTTP read-path experiments.

AIFT Forge is not yet ready to trust live push workflows until token actor wiring and protected write gates are complete.
