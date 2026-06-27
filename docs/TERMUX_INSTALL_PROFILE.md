# Android / Termux Install Profile

AIFT-Forge uses a protected Android/Termux install profile because Termux reports `process.platform` as `android`.

Many native Node packages only publish binaries for `linux`, `darwin`, or `win32`, so the Termux profile intentionally disables workspace-wide native dependency installation.

The Termux profile validates:

- provider registry
- local-only inference policy
- CLI command syntax
- portable JavaScript test runner
- repository health
- no cloud fallback

Backups of the original package manifests are stored under:

    .forge/platform-backups/

Run:

    npm run pipeline
