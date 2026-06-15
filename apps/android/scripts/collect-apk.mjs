#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');
const androidRoot = process.cwd();
const outDir = path.join(repoRoot, 'dist', 'android');
const candidates = [
  path.join(androidRoot, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
  path.join(androidRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

fs.mkdirSync(outDir, { recursive: true });
const found = candidates.filter((file) => fs.existsSync(file));
if (found.length === 0) {
  console.error(JSON.stringify({ ok: false, error: 'No APK found. Build the Android project first.', searched: candidates }, null, 2));
  process.exit(1);
}

const artifacts = [];
for (const source of found) {
  const type = source.includes('/release/') ? 'release' : 'debug';
  const target = path.join(outDir, `aift-forge-${type}.apk`);
  fs.copyFileSync(source, target);
  artifacts.push({
    type,
    source,
    target: path.relative(repoRoot, target),
    sha256: sha256(target),
    size_bytes: fs.statSync(target).size
  });
}

const manifest = {
  schema: 'aift.android.apk.artifacts.v1',
  app: 'AIFT Forge',
  app_id: 'org.aifreedomtrust.aiftforge',
  generated_at: new Date().toISOString(),
  artifacts
};

fs.writeFileSync(path.join(outDir, 'aift-forge-android-artifacts.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output: 'dist/android', artifacts }, null, 2));
