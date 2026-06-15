# AIFT Forge Build Readiness

This document defines what must be true before AIFT Forge is considered ready to build installable packages.

## Build readiness checklist

Required before packaging:

- repository structure verification passes
- readiness report generator passes
- product web app builds
- desktop wrapper package exists
- desktop fallback page exists
- Android shell exists
- Android package workspace exists
- AI manifest exists
- Forge manifest exists
- sovereign policy exists
- packaging requirements exist
- no secrets are committed
- release channel is defined
- artifact hash policy is defined
- signing status policy is defined

## Build targets

AIFT Forge should prepare these targets:

- product web bundle
- Windows desktop installer
- Windows portable desktop app
- Android installable app package
- AIFT node engine bundle
- AIFT repo export archive

## Current package readiness levels

### Web

The web shell is implemented with Vite and React. It should be the first build target verified.

### Desktop

The desktop wrapper is implemented with Electron metadata and a local-node-first main process.

### Android

The Android shell currently contains a static app shell and workspace package. The next step is generating the native Android project from the Android shell.

### Node engine

The node engine currently lives in the VPS repository. AIFT Forge should eventually package compatible node engine releases from that repo.

## Definition of done for package readiness

AIFT Forge is package-ready only when:

- all build scripts are present
- all package target requirements are documented
- all package target metadata is recorded
- platform-specific build tools have been installed locally or on an AIFT builder node
- generated artifacts are hashed
- signing status is recorded
- human release approval is recorded

## Source of truth

The canonical build record should come from AIFT-operated local or relay builder nodes. Public mirror build checks may exist, but they should not replace AIFT-owned verification.
