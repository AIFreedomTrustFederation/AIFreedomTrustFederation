#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'dist');
const outputFile = path.join(outputDir, 'aift-forge-readiness.json');

const checks = [
  ['root package', 'package.json'],
  ['product web package', 'apps/product-web/package.json'],
  ['product web app', 'apps/product-web/src/App.tsx'],
  ['desktop package', 'apps/desktop/package.json'],
  ['desktop main', 'apps/desktop/main.cjs'],
  ['android package', 'apps/android/package.json'],
  ['android shell', 'apps/android/www/index.html'],
  ['forge manifest', 'aift-forge-manifest.json'],
  ['ai manifest', 'aift-ai-manifest.json'],
  ['sovereign policy', 'docs/AIFT_FORGE_SOVEREIGN_POLICY.md'],
  ['status record', 'docs/status.md'],
  ['validation guide', 'docs/validation.md'],
  ['security and privacy guide', 'docs/security-and-privacy.md'],
  ['packaging requirements', 'docs/AIFT_FORGE_PACKAGING_REQUIREMENTS.md'],
  ['verification script', 'scripts/verify-forge-structure.mjs'],
];

const results = checks.map(([name, file]) => ({
  name,
  file,
  present: fs.existsSync(path.join(root, file)),
}));

const missing = results.filter((item) => !item.present);
const report = {
  schema: 'aift.forge.readiness.v1',
  product: 'aift-forge',
  generated_at: new Date().toISOString(),
  status: missing.length === 0 ? 'structure-ready' : 'missing-files',
  checks: results,
  required_package_paths: [
    'web bundle output',
    'windows installer output',
    'windows portable output',
    'android package output',
    'node engine bundle output'
  ],
  note: 'This readiness report verifies repo structure. Real package outputs must be produced by the appropriate platform build tools.'
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

if (missing.length > 0) process.exit(1);
