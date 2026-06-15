# AIFT Forge Android App

This directory contains the Android-first installable AIFT Forge shell.

The Android app is a local-first Capacitor app. Its first job is to give the phone a usable AIFT Forge control surface that can connect to:

1. bundled offline UI
2. local Forge API
3. local node dashboard
4. optional AIFT relay

It must not require GitHub, cloud auth, or a rate-limited AI provider to open and operate in local mode.

## Package identity

Recommended app id:

`org.aifreedomtrust.aiftforge`

Recommended app name:

`AIFT Forge`

## Current implementation

- Capacitor-ready Android workspace
- Vite web build into `www`
- local settings stored with Capacitor Preferences
- device info via Capacitor Device
- network status via Capacitor Network
- offline bundled UI fallback
- local API health check
- optional relay URL field
- repo-local APK artifact collector

## Android build path

From repo root after dependencies are installed:

```bash
npm --workspace apps/android run build
npm --workspace apps/android run android:add
npm --workspace apps/android run sync
npm --workspace apps/android run open
```

After the native Android project exists, Android Studio can build a debug APK.

## Repo-local APK artifact output

After Android Studio or Gradle builds an APK, collect it back into the repo with:

```bash
npm run android:apk:collect
```

The collector searches for:

- `apps/android/android/app/build/outputs/apk/debug/app-debug.apk`
- `apps/android/android/app/build/outputs/apk/release/app-release.apk`

It copies discovered APKs into:

- `dist/android/aift-forge-debug.apk`
- `dist/android/aift-forge-release.apk`

It also writes:

- `dist/android/aift-forge-android-artifacts.json`

The artifact manifest includes:

- app name
- app id
- artifact type
- source path
- repo-local target path
- SHA-256 hash
- file size
- generated timestamp

## Fallback order

1. Bundled Android UI keeps loading even when offline.
2. Local Forge API can be configured, default `http://127.0.0.1:4177`.
3. Local node dashboard can be configured, default `http://127.0.0.1:3001/node-status`.
4. Optional relay can be configured later without becoming required.

## Not yet complete

- Native Android project generation has not been run yet.
- APK artifact has not been built yet.
- Android background node service is not implemented yet.
- Android local model runtime is not bundled yet.
- Push/write-class Git transport should remain untrusted until runtime gates pass.

## Build principle

Builds should be reproducible and should publish a manifest containing version, commit, build time, source hash, dependency inventory, fallback summary, and release channel.
