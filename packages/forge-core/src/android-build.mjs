import { addRecord, makeId, now } from './store.mjs';

export function createAndroidBuildRequest(input = {}) {
  const record = {
    id: makeId('android-build'),
    type: 'android_build_request',
    title: input.title || 'Build Android APK',
    status: 'queued-for-local-builder',
    target: input.target || 'debug-apk',
    package_id: 'org.aifreedomtrust.aiftforge',
    app_name: 'AIFT Forge',
    workspace: 'apps/android',
    scripts: [
      'npm --workspace apps/android run build',
      'npm --workspace apps/android run android:add',
      'npm --workspace apps/android run sync',
      'build debug APK in Android Studio or Gradle',
      'npm run android:apk:collect'
    ],
    expected_outputs: [
      'dist/android/aift-forge-debug.apk',
      'dist/android/aift-forge-android-artifacts.json'
    ],
    fallback_order: [
      'bundled Android UI',
      'local Forge API',
      'local node dashboard',
      'optional relay'
    ],
    created_at: now()
  };
  return addRecord('android_builds', record);
}
