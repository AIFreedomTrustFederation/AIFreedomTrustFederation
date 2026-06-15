# AIFT Forge Desktop Build

The desktop app is the Windows shell for AIFT Forge.

## Current implementation

- Electron package metadata exists.
- Main process opens the configured local AIFT node URL.
- Offline fallback page exists.
- Windows installer and portable targets are declared in package metadata.

## Required before release

- Install dependencies.
- Verify the root repo.
- Build the product web app.
- Launch desktop shell locally.
- Build Windows package targets on a Windows-capable builder.
- Record artifact hashes.
- Record signing status.
- Record human release approval.

## Environment

The desktop shell reads:

`AIFT_NODE_URL`

Default local node URL:

`http://127.0.0.1:3001`

## Release rule

Unsigned alpha packages may exist only if clearly marked as unsigned. Stable releases require signing status and human approval.
