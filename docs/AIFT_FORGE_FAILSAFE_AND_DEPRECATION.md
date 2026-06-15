# AIFT Forge Failsafe and Deprecation Policy

AIFT Forge must keep working when optional tools go offline, become unsupported, become insecure, or stop fitting the mission.

## Failsafe principle

No optional dependency is allowed to become the single source of truth. The source of truth remains local AIFT records, Git objects, signed manifests, and human approval records.

## Fallback classes

### Class 1: Built-in fallback

The app already contains a local fallback.

Examples:

- raw Node HTTP if Fastify or Hono is unavailable
- JSON store if SQLite/libSQL is unavailable
- local audit records if OpenTelemetry is unavailable
- manual QA if Playwright is unavailable

### Class 2: Equivalent adapter fallback

Another adapter provides the same class of behavior.

Examples:

- Ollama-compatible API can fall back to llama.cpp-compatible API
- LanceDB can fall back to sqlite-vec
- Yjs can fall back to Automerge

### Class 3: Degraded-safe mode

Feature turns read-only, manual-only, or approval-only.

Examples:

- AI patching falls back to human-only review
- semantic search falls back to keyword search
- remote transport falls back to local archive export/import

## Deprecation process

1. Mark dependency as deprecated in `aift-dependency-policy.json`.
2. Add replacement target.
3. Keep old adapter disabled by default.
4. Migrate data through local manifest export/import.
5. Keep a rollback note in the release manifest.
6. Remove only after a successful stable release cycle.

## Security process for new dependencies

Before a dependency can be considered stable:

1. It must be open-source licensed.
2. It must run locally or self-hosted.
3. It must not require a rate-limited cloud API.
4. It must have a documented fallback.
5. It must be inventoried by `npm run deps:manifest`.
6. It must be included in package review.
7. It must pass vulnerability and license review before stable release.

## Emergency isolation

If a dependency is compromised or abandoned:

1. Disable adapter by default.
2. Switch to local fallback.
3. Record issue and approval event.
4. Publish release notice.
5. Keep local data exportable.

## Default safe mode

When uncertain, AIFT Forge must choose:

- local state over external state
- human approval over automated mutation
- read-only over unsafe write
- local model over remote model
- manifest export over locked service
