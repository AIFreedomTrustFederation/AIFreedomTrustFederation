# AIFT Forge Android QA Pass

Status: pre-runtime Android QA, no shell execution yet.

## Summary

The Android workspace is wired for the first Capacitor-based alpha build path. The app now has package dependencies, Capacitor config, Vite entrypoint, TypeScript app shell, styling, local settings, network/device checks, and fallback documentation.

## Result matrix

| Area | Status | Notes |
|---|---:|---|
| Root workspace includes Android | Pass | Root `package.json` includes `apps/android`. |
| Root Android scripts | Pass | Root has `android:sync`, `android:open`, and `android:build`. |
| Android package scripts | Pass | Android workspace has Vite build, Capacitor add/sync/open/doctor scripts. |
| Android dependencies | Pass | Capacitor core/android/app/device/filesystem/network/preferences and Vite/TypeScript are listed. |
| Capacitor config | Pass | App id, app name, webDir, Android scheme, cleartext dev access, local-network allowlist, and mixed content setting are present. |
| Vite entrypoint | Pass | `apps/android/index.html` exists and loads `/src/main.ts`. |
| Android TypeScript shell | Pass | `apps/android/src/main.ts` renders the mobile UI and checks local API health. |
| Android styling | Pass | `apps/android/src/style.css` exists and is mobile-first. |
| Offline fallback | Pass | Bundled UI renders without API/relay. |
| Local API setting | Pass | Defaults to `http://127.0.0.1:4177` and is editable. |
| Node dashboard setting | Pass | Defaults to `http://127.0.0.1:3001/node-status` and is editable. |
| Optional relay setting | Pass | Relay URL is optional and not required. |
| Preferences storage | Pass | Settings are stored with Capacitor Preferences. |
| Network status | Pass | Capacitor Network is wired. |
| Device status | Pass | Capacitor Device is wired. |
| Dependency fallback manifest | Pass | Capacitor dependency fallbacks are registered in dependency manifest generator. |
| README build path | Pass | Android README documents build path and fallback order. |
| Native Android project generated | Not yet | Requires running `capacitor add android`. |
| APK built | Not yet | Requires Android Studio/Gradle after native project generation. |
| Android local background node | Not yet | Future feature. |
| Android local model runtime | Not yet | Future feature. |

## Android build order

From repo root:

```bash
npm install
npm --workspace apps/android run build
npm --workspace apps/android run android:add
npm --workspace apps/android run sync
npm --workspace apps/android run open
```

After Android Studio opens:

1. Let Gradle sync.
2. Build debug APK.
3. Install on phone.
4. Open AIFT Forge.
5. Confirm bundled UI loads offline.
6. Set local API URL to the phone-accessible AIFT Forge API.
7. Confirm API health status changes to online.

## Important Android networking note

`127.0.0.1` means the Android device itself. Use it only when the Forge API is running on the same Android device. For an API running on a laptop or VPS, set the Local Forge API field to a LAN or relay URL.

Common examples:

- Android emulator to host machine: `http://10.0.2.2:4177`
- Real phone to laptop on same Wi-Fi: `http://<laptop-lan-ip>:4177`
- Phone to relay: configured relay URL

## Fallback order

1. Bundled Android UI.
2. Local Forge API.
3. Local node dashboard.
4. Optional relay.

## Build blockers to watch

- `npm install` may reveal version compatibility issues because dependencies are currently listed as `latest`.
- Native Android project does not exist until `capacitor add android` is run.
- Android HTTP access may require generated native network security configuration if a target Android version blocks cleartext LAN traffic despite Capacitor config.
- The current app shell checks API health only; deeper Forge actions are not yet mobile-native screens.
- Smart HTTP write-class repo transport is still not production-trusted until runtime gates pass.

## QA decision

Android is ready for first alpha build attempt.

It is not yet ready for a production release APK. The next milestone is generating the native Android project, syncing Capacitor, building a debug APK, and recording runtime evidence.
