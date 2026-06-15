# AIFT Forge Android Build

The Android app is the mobile shell for AIFT Forge.

## Current implementation

- Android workspace package exists.
- Static Android shell exists in `www/index.html`.
- Android design requirements exist.

## Required next implementation step

Generate a native Android project from the Android shell using the chosen Android wrapper technology.

The preferred first path is a WebView or Capacitor-style shell around the bundled AIFT Forge UI and local node dashboard.

## Required before release

- Android native project generated.
- App id set to `org.aifreedomtrust.aiftcloud`.
- App name set to `AIFT Cloud`.
- Version name recorded.
- Version code recorded.
- Debug package generated.
- Release package generated when signing is configured.
- Artifact hash recorded.
- Signing status recorded.
- Human release approval recorded.

## Local-first behavior

The Android app should open the bundled shell even when no relay is available. It should connect to the local AIFT node when available.

## Release rule

Unsigned alpha packages may exist only if clearly marked as unsigned. Stable releases require signing status and human approval.
