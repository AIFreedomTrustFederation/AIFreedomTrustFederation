# AIFT Forge Status

This is the canonical status record for AIFT Forge. It separates implemented behavior, local verification evidence, prototypes, planned work, and claims that are not yet supported.

## Current implementation status

| Area                  | Status                 | Evidence                                                                         |
| --------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| Repository role       | Active federation core | README, manifests, and agent docs exist.                                         |
| Installable product   | Foundation             | Web, desktop, Android, API, and core workspaces exist.                           |
| Web build             | Locally verified       | `npm run web:build` passes on the local Windows builder.                         |
| Local API             | Foundation             | Health, state, records, Git, token, setup, and artifact routes exist.            |
| Persistent state      | Foundation             | JSON-backed local state helpers exist.                                           |
| Git read operations   | Foundation             | Branch, tag, commit, tree, blob, and diff readers exist.                         |
| Smart HTTP transport  | Partial                | Token-aware access gate is covered by `npm test` and `npm run smoke:git-access`. |
| Protected writes      | Not trusted            | Protected ref/review gate and live push evidence are still pending.              |
| Desktop package       | Not built              | Electron metadata exists; installer output is not verified.                      |
| Android package       | Not built              | Android shell exists; native project/APK output is not verified.                 |
| AI provider execution | Not built              | AI request records exist; real provider adapters are not active.                 |
| Stable release        | Not claimed            | No stable release, signed artifact, or audited package is claimed.               |

## Current verification evidence

Last local verification pass: 2026-06-20 on the Windows local builder.

Passing checks:

- `npm install`
- `npm run qa:deps`
- `npm test`
- `npm run lint`
- `npm run smoke:git-access`
- `npm audit --audit-level=high`
- `npm run web:build`
- `npm run license:check`
- touched-file Prettier check

Known non-gate:

- `npm run format:check` is a repository target, but existing legacy files are not yet normalized. Format changed files only unless a formatting-only normalization pass is approved and scoped.

## Public claim boundaries

- No stable release is claimed.
- No production deployment is claimed.
- No audited security status is claimed.
- No artifact signing guarantee is claimed.
- No live Git push workflow is trusted until protected write gates and runtime push evidence exist.

## Known blockers

- Protected ref/review gate module.
- JSON transport request routes need the same token actor path as Smart HTTP.
- Live Git client clone/fetch/push runtime evidence.
- Request size limits and streaming for Git RPC paths.
- Windows installer build and inspection.
- Android native project generation and APK inspection.
- Artifact storage, download, signing, and release signing.
- Real AI provider adapters with no-secret prompt boundaries.
- Federation/mirror sync execution.

## Next best repair

Implement the protected write policy gate before trusting any Smart HTTP receive-pack path. The gate should produce local blocked-action or approval records before any sensitive write behavior is treated as valid.
