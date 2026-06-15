# AIFT Forge Packaging Requirements

AIFT Forge must be able to build and publish installable app packages without relying on GitHub as the runtime authority.

## Required package targets

AIFT Forge should support these package targets:

- web static bundle
- Windows installer
- Windows portable app
- Android APK
- Android debug package
- AIFT node engine bundle
- AIFT repo export archive
- AIFT release manifest
- AIFT package manifest

## Windows package requirements

Windows packages should include:

- installer build
- portable build
- product name
- app id
- version
- source commit
- build time
- artifact hash
- signing status
- release channel
- compatibility notes

## Android package requirements

Android packages should include:

- package id
- app name
- version code
- version name
- debug and release channels
- APK artifact
- source commit
- build time
- artifact hash
- signing status
- minimum supported Android version
- local node connection behavior

## Web bundle requirements

Web bundles should include:

- static output directory
- source commit
- build time
- route map
- asset manifest
- artifact hash
- deployment target

## Node engine package requirements

Node engine bundles should include:

- engine version
- compatible dashboard version
- scripts included
- runtime requirements
- platform support
- source commit
- package hash
- signing status

## Release manifest

Every release should publish a manifest like:

```json
{
  "schema": "aift.release.v1",
  "product": "aift-forge",
  "version": "0.1.0",
  "channel": "alpha",
  "source_commit": "COMMIT_SHA",
  "artifacts": [
    {
      "name": "AIFT Cloud Windows Installer",
      "type": "windows-installer",
      "path": "dist/AIFT-Cloud-Setup.exe",
      "sha256": "pending",
      "signature_status": "unsigned"
    },
    {
      "name": "AIFT Cloud Android APK",
      "type": "android-apk",
      "path": "dist/aift-cloud.apk",
      "sha256": "pending",
      "signature_status": "unsigned"
    }
  ],
  "created_at": "ISO_DATE"
}
```

## Packaging gates

AIFT Forge should not publish a stable package unless:

- structure verification passes
- web build passes
- package manifest exists
- artifact hash exists
- signing status is recorded
- human release approval is recorded

Alpha packages may be unsigned if clearly labeled as unsigned.

## Builder node model

AIFT Forge should build packages on AIFT-operated builder nodes. Hosted CI may be used for public mirror checks, but should not be the canonical source of truth.
